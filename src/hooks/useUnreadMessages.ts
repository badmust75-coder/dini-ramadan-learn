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

      if (isAdmin) {
        // Admin: count unread user messages
        const { count, error } = await supabase
          .from('user_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_type', 'user')
          .eq('is_read', false);

        if (error) throw error;
        return count || 0;
      } else {
        // User: count unread admin messages in their conversations
        const { data: userConversations } = await supabase
          .from('user_messages')
          .select('conversation_id')
          .eq('user_id', user.id)
          .not('conversation_id', 'is', null);

        if (!userConversations || userConversations.length === 0) return 0;

        const conversationIds = [...new Set(userConversations.map(c => c.conversation_id))];

        const { count, error } = await supabase
          .from('user_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_type', 'admin')
          .eq('is_read', false)
          .in('conversation_id', conversationIds);

        if (error) throw error;
        return count || 0;
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
              (!isAdmin && newMessage.sender_type === 'admin')) {
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
