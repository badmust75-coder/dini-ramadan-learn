import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  type: 'all' | 'prayer' | 'ramadan' | 'admin' | 'user';
  userId?: string;
}

// ── Crypto helpers for Web Push (RFC 8030 + VAPID) ───────────────

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Create HKDF-derived key material
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, salt.length > 0 ? salt : new Uint8Array(32)));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  const infoLen = new Uint8Array([0, length]);
  const t = new Uint8Array([...info, 1]);
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, t));
  return okm.slice(0, length);
}

// Build the info parameter for content encryption
function buildInfo(type: string, clientPublic: Uint8Array, serverPublic: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const label = encoder.encode(`Content-Encoding: ${type}\0`);
  const result = new Uint8Array(label.length + 1 + 2 + clientPublic.length + 2 + serverPublic.length);
  let offset = 0;
  result.set(label, offset); offset += label.length;
  result[offset++] = 0; // P-256
  result[offset++] = 0; result[offset++] = clientPublic.length;
  result.set(clientPublic, offset); offset += clientPublic.length;
  result[offset++] = 0; result[offset++] = serverPublic.length;
  result.set(serverPublic, offset);
  return result;
}

// Encrypt the push payload using aes128gcm
async function encryptPayload(
  clientPublicKey: Uint8Array,
  clientAuth: Uint8Array,
  payload: string
): Promise<{ encrypted: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  // Generate server ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const serverPublicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey)
  );

  // Derive shared secret
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      serverKeys.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key and nonce using HKDF
  const encoder = new TextEncoder();

  // IKM for auth
  const authInfo = encoder.encode('Content-Encoding: auth\0');
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  const contentEncKeyInfo = buildInfo('aesgcm', clientPublicKey, serverPublicKey);
  const contentEncKey = await hkdf(salt, ikm, contentEncKeyInfo, 16);

  const nonceInfo = buildInfo('nonce', clientPublicKey, serverPublicKey);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Encrypt with AES-128-GCM
  const paddingLength = 2;
  const paddedPayload = new Uint8Array(paddingLength + encoder.encode(payload).length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(encoder.encode(payload), paddingLength);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      paddedPayload
    )
  );

  return { encrypted, serverPublicKey, salt };
}

// Create VAPID Authorization header
async function createVapidAuth(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;

  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import VAPID private key (raw 32-byte ECDSA private key)
  const rawPrivateKey = base64UrlDecode(vapidPrivateKey);

  // Build PKCS8 wrapper around raw 32-byte key
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + rawPrivateKey.length);
  pkcs8.set(pkcs8Header);
  pkcs8.set(rawPrivateKey, pkcs8Header.length);

  const cryptoKeyObj = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKeyObj,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const derSig = new Uint8Array(signatureBuffer);
  let rawSig: Uint8Array;
  if (derSig[0] === 0x30) {
    // DER format - extract r and s
    let offset = 2;
    const rLen = derSig[offset + 1];
    const r = derSig.slice(offset + 2, offset + 2 + rLen);
    offset += 2 + rLen;
    const sLen = derSig[offset + 1];
    const s = derSig.slice(offset + 2, offset + 2 + sLen);

    // Pad/trim to 32 bytes each
    const rPad = new Uint8Array(32);
    const sPad = new Uint8Array(32);
    rPad.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    sPad.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));

    rawSig = new Uint8Array(64);
    rawSig.set(rPad, 0);
    rawSig.set(sPad, 32);
  } else {
    rawSig = derSig;
  }

  const signatureB64 = base64UrlEncode(rawSig);
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

// Send a single push notification
async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ ok: boolean; status: number; gone: boolean }> {
  try {
    const clientPublicKey = base64UrlDecode(p256dh);
    const clientAuth = base64UrlDecode(auth);
    const payloadStr = JSON.stringify(payload);

    const { encrypted, serverPublicKey, salt } = await encryptPayload(
      clientPublicKey,
      clientAuth,
      payloadStr
    );

    const vapidAuth = await createVapidAuth(
      endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      'mailto:admin@dini-bismillah.app'
    );

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Authorization': vapidAuth.authorization,
        'Crypto-Key': `dh=${base64UrlEncode(serverPublicKey)};p256ecdsa=${vapidAuth.cryptoKey}`,
        'Encryption': `salt=${base64UrlEncode(salt)}`,
        'TTL': '86400',
      },
      body: encrypted,
    });

    const gone = response.status === 404 || response.status === 410;
    return { ok: response.ok || response.status === 201, status: response.status, gone };
  } catch (error) {
    console.error('sendPush error:', error);
    return { ok: false, status: 0, gone: false };
  }
}

// ── Main handler ────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: NotificationPayload = await req.json();
    const { title, body: notifBody, url, type, userId } = body;

    if (!title || !notifBody) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch target subscriptions
    let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth, user_id');
    const { data: allSubs, error: subError } = await query;
    if (subError) throw subError;

    let targetSubs = allSubs || [];

    if (type === 'admin') {
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      const adminIds = (adminRoles || []).map(r => r.user_id);
      targetSubs = targetSubs.filter(s => adminIds.includes(s.user_id));
    } else if (type === 'user' && userId) {
      targetSubs = targetSubs.filter(s => s.user_id === userId);
    } else if (type === 'prayer' || type === 'ramadan') {
      const { data: prefs } = await supabase.from('notification_preferences').select('user_id, prayer_reminders, ramadan_activities');
      const enabledIds = (prefs || [])
        .filter(p => type === 'prayer' ? p.prayer_reminders : p.ramadan_activities)
        .map(p => p.user_id);
      targetSubs = targetSubs.filter(s => enabledIds.includes(s.user_id));
    }
    // type === 'all' → no filter

    const pushPayload = { title, body: notifBody, url: url || '/' };
    let sentCount = 0;
    const expiredIds: string[] = [];

    for (const sub of targetSubs) {
      const result = await sendPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.ok) {
        sentCount++;
      } else if (result.gone) {
        expiredIds.push(sub.id);
      }
      console.log(`Push to ${sub.endpoint.slice(0, 60)}... → ${result.status}`);
    }

    // Cleanup expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
      console.log(`Cleaned up ${expiredIds.length} expired subscriptions`);
    }

    console.log(`Sent ${sentCount}/${targetSubs.length} notifications, ${expiredIds.length} expired`);

    const firstEndpoint = targetSubs.length > 0 ? targetSubs[0].endpoint : '';

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: targetSubs.length,
        expired: expiredIds.length,
        debug_endpoint: firstEndpoint,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
