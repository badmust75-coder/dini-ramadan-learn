import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MailOpen, Send, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserMessage {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_type: string;
  conversation_id: string | null;
}

interface Conversation {
  user_id: string;
  conversation_id: string;
  profile: {
    full_name: string | null;
    email: string | null;
  };
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

const AdminMessaging = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations (admin RLS gives access to all messages)
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      // Group by user (conversation_id == user_id for our schema)
      const conversationMap = new Map<string, UserMessage[]>();

      for (const msg of data) {
        const key = msg.user_id;
        if (!conversationMap.has(key)) {
          conversationMap.set(key, []);
        }
        conversationMap.get(key)!.push(msg);
      }

      // Build conversation list with profiles
      const conversationList: Conversation[] = [];

      for (const [userId, messages] of conversationMap) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', userId)
          .single();

        const unreadCount = messages.filter(m => m.sender_type === 'user' && !m.is_read).length;
        const lastMsg = messages[0];

        conversationList.push({
          user_id: userId,
          conversation_id: userId,
          profile: profile || { full_name: null, email: null },
          lastMessage: lastMsg.message,
          lastMessageDate: lastMsg.created_at,
          unreadCount,
        });
      }

      return conversationList;
    },
  });

  // Fetch messages for selected conversation
  const { data: conversationMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['conversation-messages', selectedConversation?.user_id],
    queryFn: async () => {
      if (!selectedConversation) return [];

      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', selectedConversation.user_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conversation messages:', error);
        return [];
      }
      return data as UserMessage[];
    },
    enabled: !!selectedConversation,
  });

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversation && conversationMessages.length > 0) {
      const unreadUserMessages = conversationMessages.filter(
        m => m.sender_type === 'user' && !m.is_read
      );

      if (unreadUserMessages.length > 0) {
        Promise.all(
          unreadUserMessages.map(msg =>
            supabase
              .from('user_messages')
              .update({ is_read: true })
              .eq('id', msg.id)
          )
        ).then(() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        });
      }
    }
  }, [selectedConversation, conversationMessages, refetch, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_messages',
        },
        () => {
          refetch();
          if (selectedConversation) {
            refetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, refetchMessages, selectedConversation]);

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('user_messages')
        .insert({
          user_id: selectedConversation.user_id,
          message: replyMessage.trim(),
          sender_type: 'admin',
        });

      if (error) throw error;

      toast({
        title: 'Réponse envoyée',
        description: 'Votre message a été transmis à l\'élève',
      });

      setReplyMessage('');
      refetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la réponse',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" ref={ref}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-20 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  // Conversation detail view
  if (selectedConversation) {
    return (
      <div className="space-y-4 h-[600px] flex flex-col" ref={ref}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConversation(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {selectedConversation.profile.full_name || 'Élève'}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedConversation.profile.email}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pr-2" ref={scrollRef}>
          <div className="space-y-3">
            {conversationMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender_type === 'admin'
                      ? 'bg-primary text-primary-foreground'
                      : msg.is_read
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-orange-500/20 border border-orange-500/50'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_type === 'admin'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}>
                    {format(new Date(msg.created_at), 'dd MMM à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reply input */}
        <div className="space-y-2 pt-3 border-t">
          <Textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Votre réponse..."
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={handleSendReply}
            disabled={!replyMessage.trim() || isSending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer la réponse
          </Button>
        </div>
      </div>
    );
  }

  // Conversations list view
  return (
    <div className="space-y-4" ref={ref}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Messages des élèves
        </h2>
        {conversations.filter(c => c.unreadCount > 0).length > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {conversations.reduce((sum, c) => sum + c.unreadCount, 0)} non lu(s)
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun message pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((conv) => (
            <Card
              key={conv.user_id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                conv.unreadCount > 0
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
              onClick={() => setSelectedConversation(conv)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    conv.unreadCount > 0 ? 'bg-orange-500/20' : 'bg-emerald-500/20'
                  }`}>
                    {conv.unreadCount > 0 ? (
                      <Mail className="h-5 w-5 text-orange-500" />
                    ) : (
                      <MailOpen className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">
                        {conv.profile.full_name || 'Élève'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-orange-500 text-xs">
                          {conv.unreadCount} nouveau{conv.unreadCount > 1 ? 'x' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {conv.profile.email} •{' '}
                      {format(new Date(conv.lastMessageDate), 'dd MMM à HH:mm', { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
});

AdminMessaging.displayName = 'AdminMessaging';

export default AdminMessaging;
