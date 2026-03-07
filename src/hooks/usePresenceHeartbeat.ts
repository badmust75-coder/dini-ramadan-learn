import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Sends a heartbeat every 60s to update last_seen in profiles.
 * Pauses when tab is hidden, resumes when visible.
 */
const usePresenceHeartbeat = () => {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePresence = useCallback(async () => {
    if (!user) return;
    await (supabase as any)
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('user_id', user.id);
  }, [user]);

  const startHeartbeat = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    updatePresence();
    intervalRef.current = setInterval(updatePresence, 60_000);
  }, [updatePresence]);

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Initial heartbeat
    startHeartbeat();

    // Log connexion (once per session)
    (supabase as any)
      .from('connexion_logs')
      .insert({ user_id: user.id })
      .then(() => {});

    // Pause/resume on visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        stopHeartbeat();
      } else {
        startHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Handle page unload — use sendBeacon for reliability
    const handleUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${(supabase as any).auth?.['currentSession']?.access_token || ''}`,
        'Prefer': 'return=minimal',
      };

      try {
        const body = JSON.stringify({ last_seen: new Date().toISOString() });
        fetch(url, {
          method: 'PATCH',
          headers,
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Silent fail on unload
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, startHeartbeat, stopHeartbeat]);
};

export default usePresenceHeartbeat;
