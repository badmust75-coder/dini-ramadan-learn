import { supabase } from '@/integrations/supabase/client';

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

// Fetch VAPID public key from edge function (cached)
let _vapidKeyCache: string | null = null;

async function getVapidPublicKey(): Promise<string> {
  if (_vapidKeyCache) return _vapidKeyCache;

  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (error) throw error;
    _vapidKeyCache = data?.vapidPublicKey || '';
    return _vapidKeyCache;
  } catch (e) {
    console.error('Failed to fetch VAPID key:', e);
    return '';
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function logToAppLogs(level: string, message: string, context?: any) {
  try {
    await supabase.from('app_logs').insert({
      level,
      message,
      context: context ? JSON.stringify(context) : '{}',
    } as any);
  } catch (e) {
    console.error('Failed to log to app_logs:', e);
  }
}

export async function subscribeToPush(userId: string): Promise<{ success: boolean; detail: string; endpoint?: string }> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      const msg = 'Push not supported in this browser';
      await logToAppLogs('warn', msg, { userId });
      return { success: false, detail: msg };
    }

    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await (registration as any).pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Existing subscription found:', subscription.endpoint.substring(0, 40));
      // Check if it's already saved in DB
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
      
      if ((count || 0) > 0) {
        const msg = 'Subscription already exists in DB';
        console.log('[Push]', msg);
        return { success: true, detail: msg, endpoint: subscription.endpoint };
      }
      // Subscription exists in pushManager but not in DB → save it
      console.log('[Push] Subscription not in DB, saving...');
    } else {
      // No subscription → create one
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        const msg = 'VAPID key is empty, cannot subscribe';
        await logToAppLogs('error', msg, { userId });
        return { success: false, detail: msg };
      }
      
      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      };
      
      subscription = await (registration as any).pushManager.subscribe(subscribeOptions);
      console.log('[Push] New subscription created:', subscription.endpoint.substring(0, 40));
    }

    if (subscription) {
      const subscriptionJson = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = subscriptionJson.keys?.p256dh || '';
      const auth = subscriptionJson.keys?.auth || '';
      
      console.log('[Push] Saving to DB:', { endpoint: endpoint.substring(0, 40), p256dh: p256dh.substring(0, 10), auth: auth.substring(0, 10) });
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint,
          p256dh,
          auth,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        const msg = `Error saving subscription: ${error.message}`;
        console.error('[Push]', msg);
        await logToAppLogs('error', msg, { userId, error: error.message });
        return { success: false, detail: msg };
      }

      const msg = `Subscription saved successfully`;
      console.log('[Push]', msg);
      await logToAppLogs('info', `Push subscription saved for user`, { userId, endpoint: endpoint.substring(0, 40) });
      return { success: true, detail: msg, endpoint };
    }

    return { success: false, detail: 'No subscription created' };
  } catch (error: any) {
    const msg = `Push subscription error: ${error.message}`;
    console.error('[Push]', msg);
    await logToAppLogs('error', msg, { userId, error: error.message });
    return { success: false, detail: msg };
  }
}

/** Auto-subscribe on login if permission is granted */
export async function autoSubscribeOnLogin(userId: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  try {
    await registerServiceWorker();
    const result = await subscribeToPush(userId);
    console.log('[Push] Auto-subscribe on login:', result.detail);
  } catch (e: any) {
    console.error('[Push] Auto-subscribe failed:', e.message);
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

export async function getNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching preferences:', error);
  }

  return data;
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    prayer_reminders?: boolean;
    ramadan_activities?: boolean;
    daily_reminder_time?: string;
    fajr_reminder?: boolean;
    dhuhr_reminder?: boolean;
    asr_reminder?: boolean;
    maghrib_reminder?: boolean;
    isha_reminder?: boolean;
  }
) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating preferences:', error);
    return false;
  }

  return true;
}
