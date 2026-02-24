import { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Mail, MailOpen, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AudioPlayer from '@/components/audio/AudioPlayer';

interface Message {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_type: string;
  conversation_id: string | null;
  audio_url: string | null;
  message_type: string;
  deleted_at: string | null;
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
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversation messages
  const { data: messages = [], refetch } = useQuery({
    queryKey: ['user-messages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
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

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-messages-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_messages', filter: `user_id=eq.${user.id}` }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Speech recognition setup
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
      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Non supporté', description: 'La reconnaissance vocale n\'est pas supportée sur ce navigateur', variant: 'destructive' });
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
      const { error } = await supabase.from('user_messages').insert({
        user_id: user.id, message: message.trim(), sender_type: 'user', message_type: 'text',
      });
      if (error) throw error;
      toast({ title: 'Message envoyé', description: 'Votre message a été transmis à l\'administrateur' });
      setMessage('');
      refetch();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le message', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';

    setIsSubmitting(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('messages-audio').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('messages-audio').getPublicUrl(fileName);

      const { error } = await supabase.from('user_messages').insert({
        user_id: user.id, message: '🎵 Message audio', sender_type: 'user',
        message_type: 'audio', audio_url: urlData.publicUrl,
      });
      if (error) throw error;

      toast({ title: 'Audio envoyé ✓' });
      refetch();
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer l\'audio', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplaceAudio = async (msgId: string, file: File) => {
    if (!user) return;
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('messages-audio').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('messages-audio').getPublicUrl(fileName);
      const { error } = await supabase.from('user_messages').update({ audio_url: urlData.publicUrl }).eq('id', msgId);
      if (error) throw error;
      toast({ title: 'Audio remplacé ✓' });
      refetch();
    } catch (error) {
      console.error('Error replacing audio:', error);
      toast({ title: 'Erreur', description: 'Impossible de remplacer l\'audio', variant: 'destructive' });
    }
  };

  const handleDeleteAudio = async (msgId: string) => {
    try {
      const { error } = await supabase.from('user_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', msgId);
      if (error) throw error;
      toast({ title: 'Audio supprimé ✓' });
      refetch();
    } catch (error) {
      console.error('Error deleting audio:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer l\'audio', variant: 'destructive' });
    }
  };

  const handleClose = () => {
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
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
          <DialogDescription className="sr-only">Envoyez un message à l'administrateur</DialogDescription>
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
                <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg ${msg.message_type === 'audio' ? 'w-full' : 'p-3'} ${
                    msg.sender_type === 'user'
                      ? msg.message_type === 'audio' ? '' : 'bg-primary text-primary-foreground'
                      : msg.is_read
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-orange-500/20 border border-orange-500/50 animate-pulse'
                  }`}>
                    {msg.message_type === 'audio' && msg.audio_url ? (
                      <AudioPlayer
                        audioUrl={msg.audio_url}
                        compact
                        canManage={msg.sender_type === 'user'}
                        onReplace={(file) => handleReplaceAudio(msg.id, file)}
                        onDelete={() => handleDeleteAudio(msg.id)}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    )}
                    <p className={`text-xs mt-1 ${msg.message_type === 'audio' ? 'px-3 pb-1' : ''} ${
                      msg.sender_type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {format(new Date(msg.created_at), 'dd MMM à HH:mm', { locale: fr })}
                      {msg.sender_type === 'admin' && (
                        <span className="ml-2">
                          {msg.is_read ? <MailOpen className="h-3 w-3 inline" /> : <Mail className="h-3 w-3 inline" />}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="space-y-3 pt-3 border-t">
          <input ref={audioInputRef} type="file" className="hidden" accept=".mp3,.wav,.ogg,.webm,.m4a,audio/*" onChange={handleAudioUpload} />

          <div className="flex items-end gap-2">
            {/* Dictation mic - inline small */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleRecording}
                    className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      isRecording ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'
                    }`}
                  >
                    <Mic className="h-5 w-5 text-primary-foreground" />
                    {isRecording && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isRecording ? 'Parlez maintenant...' : 'Appuyez pour dicter'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message..."
              rows={2}
              className="resize-none flex-1 min-h-[44px]"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" size="sm">
              <X className="h-4 w-4 mr-2" /> Fermer
            </Button>
            <Button variant="outline" onClick={() => audioInputRef.current?.click()} disabled={isSubmitting} size="sm">
              <Music className="h-4 w-4 mr-1" /> Audio
            </Button>
            <Button onClick={handleSubmit} disabled={!message.trim() || isSubmitting} className="flex-1" size="sm">
              <Send className="h-4 w-4 mr-2" /> Envoyer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessagingDialog;
