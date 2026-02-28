import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMonitoringErrorCount() {
  const { isAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    const load = async () => {
      const { count: c } = await supabase
        .from('app_logs')
        .select('*', { count: 'exact', head: true })
        .in('level', ['error', 'warn'])
        .eq('is_read', false);
      setCount(c || 0);
    };

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return count;
}
