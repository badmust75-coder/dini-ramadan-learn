import { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Mail, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_type: string;
  conversation_id: string | null;
}

interface MessagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessagesRead?: () => void;
}

const MessagingDialog = ({ open, onOpenChange, onMessagesRead }: MessagingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch conversation messages
  const { data: messages = [] } = useQuery({
    queryKey: ['user-messages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .or(`user_id.eq.${user.id},and(sender_type.eq.admin,conversation_id.in.(select conversation_id from user_messages where user_id = ${user.id}))`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user && open,
  });

  // Mark admin messages as read when dialog opens
  useEffect(() => {
    if (open && user && messages.length > 0) {
      const unreadAdminMessages = messages.filter(
        m => m.sender_type === 'admin' && !m.is_read
      );
      
      if (unreadAdminMessages.length > 0) {
        Promise.all(
          unreadAdminMessages.map(msg =>
            supabase
              .from('user_messages')
              .update({ is_read: true })
              .eq('id', msg.id)
          )
        ).then(() => {
          queryClient.invalidateQueries({ queryKey: ['user-messages', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count', user.id] });
          onMessagesRead?.();
        });
      }
    }
  }, [open, user, messages, queryClient, onMessagesRead]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-messages', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setMessage(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Non supporté',
        description: 'La reconnaissance vocale n\'est pas supportée sur ce navigateur',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setMessage('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Get or create conversation ID
      const conversationId = messages.length > 0 && messages[0].conversation_id
        ? messages[0].conversation_id
        : crypto.randomUUID();

      const { error } = await supabase
        .from('user_messages')
        .insert({
          user_id: user.id,
          message: message.trim(),
          sender_type: 'user',
          conversation_id: conversationId,
        });

      if (error) throw error;

      toast({
        title: 'Message envoyé',
        description: 'Votre message a été transmis à l\'administrateur',
      });

      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['user-messages', user.id] });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Mail className="h-5 w-5" />
            Messagerie
          </DialogTitle>
        </DialogHeader>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto pr-2" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun message pour le moment</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender_type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : msg.is_read
                          ? 'bg-emerald-500/20 border border-emerald-500/50'
                          : 'bg-orange-500/20 border border-orange-500/50 animate-pulse'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender_type === 'user' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {format(new Date(msg.created_at), 'dd MMM à HH:mm', { locale: fr })}
                      {msg.sender_type === 'admin' && (
                        <span className="ml-2">
                          {msg.is_read ? (
                            <MailOpen className="h-3 w-3 inline" />
                          ) : (
                            <Mail className="h-3 w-3 inline" />
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t">
          {/* Microphone Button */}
          <div className="flex justify-center">
            <button
              onClick={toggleRecording}
              className={`
                relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                ${isRecording 
                  ? 'bg-emerald-500 animate-pulse' 
                  : 'bg-destructive'
                }
              `}
            >
              <Mic className="h-8 w-8 text-primary-foreground" />
              
              {isRecording && (
                <>
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                  <span className="absolute inset-[-6px] rounded-full border-2 border-emerald-400 animate-pulse opacity-50" />
                  <span className="absolute inset-[-12px] rounded-full border-2 border-emerald-300 animate-pulse opacity-30" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {isRecording ? 'Parlez maintenant...' : 'Appuyez pour dicter'}
          </p>

          {/* Message Textarea */}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message..."
            rows={2}
            className="resize-none"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isSubmitting}
              className="flex-1"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessagingDialog;
