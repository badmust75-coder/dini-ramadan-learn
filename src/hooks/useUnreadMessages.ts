import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-messages-count', user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return 0;

      try {
        if (isAdmin) {
          // Admin: count unread user messages across all conversations
          const { count, error } = await supabase
            .from('user_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_type', 'user')
            .eq('is_read', false);

          if (error) {
            console.error('Error fetching admin unread count:', error);
            return 0;
          }
          return count || 0;
        } else {
          // User: count unread admin messages in their own conversation
          const { count, error } = await supabase
            .from('user_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('sender_type', 'admin')
            .eq('is_read', false);

          if (error) {
            console.error('Error fetching user unread count:', error);
            return 0;
          }
          return count || 0;
        }
      } catch (err) {
        console.error('Error in unread count query:', err);
        return 0;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
        },
        (payload) => {
          const newMessage = payload.new as { sender_type: string; user_id: string };

          // Trigger badge animation on new message
          if ((isAdmin && newMessage.sender_type === 'user') ||
              (!isAdmin && newMessage.sender_type === 'admin' && newMessage.user_id === user.id)) {
            setHasNewMessage(true);
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count', user.id, isAdmin] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count', user.id, isAdmin] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, queryClient]);

  const clearNewMessageFlag = () => {
    setHasNewMessage(false);
  };

  return { unreadCount, hasNewMessage, clearNewMessageFlag };
};
