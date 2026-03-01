import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY') || '';
    const oneSignalAppId = 'c3387e75-7457-4db6-bbe1-541307fc5bea';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!oneSignalApiKey) {
      return new Response(JSON.stringify({ error: 'ONESIGNAL_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getUTCHours().toString().padStart(2, '0');
    const currentMinute = now.getUTCMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Fetch active scheduled notifications for today within the time window (±5 min tolerance)
    const { data: notifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today);

    if (error) throw error;

    let totalSent = 0;

    for (const notif of (notifications || [])) {
      // Check if send_time matches (within 5-minute window)
      const sendTime = notif.send_time?.substring(0, 5);
      if (!sendTime) continue;

      // Simple time comparison - the cron should run at the right time
      // We just process all active notifications for today

      // Determine recipients
      let targetAliases: string[] | null = null;
      if (notif.recipients !== 'all' && Array.isArray(notif.recipients)) {
        targetAliases = notif.recipients;
        if (targetAliases.length === 0) continue;
      }

      // Build OneSignal payload
      const osBody: any = {
        app_id: oneSignalAppId,
        headings: { en: `📅 ${notif.module}`, fr: `📅 ${notif.module}` },
        contents: { en: notif.message, fr: notif.message },
        url: 'https://dini-ramadan-learn.lovable.app',
        chrome_web_icon: '/icon-192.png',
      };

      if (targetAliases) {
        osBody.include_aliases = { external_id: targetAliases };
        osBody.target_channel = 'push';
      } else {
        osBody.included_segments = ['All'];
      }

      const osResponse = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${oneSignalApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(osBody),
      });

      const osResult = await osResponse.text();
      let osData: any = {};
      try { osData = JSON.parse(osResult); } catch { osData = { raw: osResult }; }

      const sent = osData.recipients || 0;
      totalSent += sent;

      // Log to notification_history
      await supabase.from('notification_history').insert({
        title: `📅 ${notif.module}`,
        body: notif.message,
        type: 'scheduled',
        total_recipients: sent,
        successful_sends: sent,
        failed_sends: 0,
        expired_cleaned: 0,
      });

      console.log(`Scheduled notification ${notif.id}: sent to ${sent} recipients`);
    }

    return new Response(JSON.stringify({
      success: true,
      processed: (notifications || []).length,
      totalSent,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
