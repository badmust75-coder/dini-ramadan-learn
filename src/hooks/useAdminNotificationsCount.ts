import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdminNotificationsCount = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ['admin-pending-total-count'],
    queryFn: async () => {
      if (!user) return 0;

      const [reg, sou, nou, inv, msgs, hw] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('sourate_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('nourania_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('invocation_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_messages').select('*', { count: 'exact', head: true }).eq('sender_type', 'user').eq('is_read', false),
        supabase.from('homework_assignments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return (reg.count || 0) + (sou.count || 0) + (nou.count || 0) + (inv.count || 0) + (msgs.count || 0) + (hw.count || 0);
    },
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!user || !isAdmin) return;
    const channel = supabase.channel('admin-badge-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => queryClient.invalidateQueries({ queryKey: ['admin-pending-total-count'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sourate_validation_requests' }, () => queryClient.invalidateQueries({ queryKey: ['admin-pending-total-count'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nourania_validation_requests' }, () => queryClient.invalidateQueries({ queryKey: ['admin-pending-total-count'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invocation_validation_requests' }, () => queryClient.invalidateQueries({ queryKey: ['admin-pending-total-count'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_messages' }, () => queryClient.invalidateQueries({ queryKey: ['admin-pending-total-count'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_assignments' }, () => queryClient.invalidateQueries({ queryKey: ['admin-pending-total-count'] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin, queryClient]);

  return count;
};
