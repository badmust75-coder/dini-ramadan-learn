import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Base64url helpers ──

function b64urlEncode(data: Uint8Array): string {
  let b = "";
  for (let i = 0; i < data.length; i++) b += String.fromCharCode(data[i]);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function b64urlEncodeStr(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) { out.set(arr, offset); offset += arr.length; }
  return out;
}

// ── VAPID JWT generation using Web Crypto ES256 ──

async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  expSeconds = 86400
): Promise<string> {
  const pubBytes = b64urlDecode(vapidPublicKey);
  if (pubBytes.length !== 65 || pubBytes[0] !== 4) throw new Error("Invalid VAPID public key");

  const x = b64urlEncode(pubBytes.slice(1, 33));
  const y = b64urlEncode(pubBytes.slice(33, 65));
  const d = b64urlEncode(b64urlDecode(vapidPrivateKey));

  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, d };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = b64urlEncodeStr(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlEncodeStr(JSON.stringify({ aud: audience, exp: now + expSeconds, sub: subject }));
  const input = new TextEncoder().encode(`${header}.${payload}`);

  const sigDer = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, input));
  // Convert DER signature to raw r||s (64 bytes)
  const sig = derToRaw(sigDer);
  return `${header}.${payload}.${b64urlEncode(sig)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // ECDSA DER: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  if (der[0] === 0x30) {
    let offset = 2;
    const rLen = der[offset + 1];
    const r = der.slice(offset + 2, offset + 2 + rLen);
    offset = offset + 2 + rLen;
    const sLen = der[offset + 1];
    const s = der.slice(offset + 2, offset + 2 + sLen);
    // Pad or trim to 32 bytes each
    const rPad = padTo32(r);
    const sPad = padTo32(s);
    return concat(rPad, sPad);
  }
  // Already raw 64 bytes
  return der;
}

function padTo32(buf: Uint8Array): Uint8Array {
  if (buf.length === 32) return buf;
  if (buf.length > 32) return buf.slice(buf.length - 32);
  const out = new Uint8Array(32);
  out.set(buf, 32 - buf.length);
  return out;
}

// ── Web Push payload encryption (RFC 8291 aes128gcm) ──

async function encryptPayload(
  p256dhB64: string,
  authB64: string,
  payload: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPubKey: Uint8Array }> {
  const userPubBytes = b64urlDecode(p256dhB64);
  const authSecret = b64urlDecode(authB64);

  // Import subscriber public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw", userPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  // Generate local ECDH keypair
  const localKp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKp.publicKey));

  // ECDH shared secret
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberKey }, localKp.privateKey, 256
  ));

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive IKM (RFC 8291)
  const authInfo = concat(
    new TextEncoder().encode("WebPush: info\0"),
    userPubBytes,
    localPubRaw
  );
  const ikm = await hkdfSha256(authSecret, sharedBits, authInfo, 32);

  // Derive CEK and nonce
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const cek = await hkdfSha256(salt, ikm, cekInfo, 16);
  const nonce = await hkdfSha256(salt, ikm, nonceInfo, 12);

  // Pad payload (add delimiter 0x02)
  const padded = concat(payload, new Uint8Array([2]));

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce }, aesKey, padded
  ));

  // Build aes128gcm content-coding header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = concat(salt, rs, new Uint8Array([localPubRaw.length]), localPubRaw);
  const body = concat(header, encrypted);

  return { ciphertext: body, salt, localPubKey: localPubRaw };
}

async function hkdfSha256(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key, length * 8
  );
  return new Uint8Array(bits);
}

// ── Send push to a single endpoint ──

async function sendPushToEndpoint(
  sub: { endpoint: string; p256dh: string; auth: string },
  payloadObj: unknown,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
    const { ciphertext } = await encryptPayload(sub.p256dh, sub.auth, payloadBytes);

    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await createVapidJwt(audience, "mailto:admin@dini-bismillah.app", vapidPublicKey, vapidPrivateKey);

    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Urgency": "normal",
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: ciphertext,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { success: false, statusCode: response.status, error: errorText };
    }
    return { success: true, statusCode: response.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown";
    return { success: false, error: message };
  }
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, userIds, sendToAll, excludeUserId, title, body: notifBody, tag, data, type } = body;

    // Health check
    if (type === 'health-check' || type === 'health_check') {
      return new Response(
        JSON.stringify({ success: true, sent: 0, health: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query based on target
    let query = supabase.from('push_subscriptions').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userIds && Array.isArray(userIds)) {
      query = query.in('user_id', userIds);
    } else if (type === 'admin') {
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      const adminIds = (adminRoles || []).map((r: any) => r.user_id);
      if (adminIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, total: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      query = query.in('user_id', adminIds);
    }

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedTag = (tag || 'dini-bismillah')
      .replace(/[^a-zA-Z0-9-]/g, '').substring(0, 32) || 'dini-bismillah';

    const payload = {
      title,
      body: notifBody || '',
      tag: sanitizedTag,
      data: data ?? {},
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false
    };

    const results = await Promise.all(
      subscriptions.map(sub =>
        sendPushToEndpoint(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload, vapidPublicKey, vapidPrivateKey
        )
      )
    );

    // Clean expired subscriptions (410)
    const expiredEndpoints = subscriptions
      .filter((_, i) => results[i].statusCode === 410)
      .map(sub => sub.endpoint);
    if (expiredEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }

    const successCount = results.filter(r => r.success).length;

    // Log to notification_history
    if (successCount > 0) {
      await supabase.from('notification_history').insert({
        title,
        body: notifBody || '',
        type: type || 'push',
        total_recipients: successCount,
        successful_sends: successCount,
        failed_sends: 0,
        expired_cleaned: expiredEndpoints.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        cleaned: expiredEndpoints.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
