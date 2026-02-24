import { useState, useEffect, useRef } from 'react';
import { Mail, MailOpen, Send, User, ArrowLeft, Search, Trash2, Pencil, Music, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AudioPlayer from '@/components/audio/AudioPlayer';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';

interface UserMessage {
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

interface Conversation {
  user_id: string;
  profile: { full_name: string | null; email: string | null; };
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

interface AdminMessagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessagesRead?: () => void;
}

const AdminMessagingDialog = ({ open, onOpenChange, onMessagesRead }: AdminMessagingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  const { data: conversations = [], refetch } = useQuery({
    queryKey: ['admin-dialog-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_messages').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) return [];

      const map = new Map<string, UserMessage[]>();
      for (const msg of data) {
        if (!map.has(msg.user_id)) map.set(msg.user_id, []);
        map.get(msg.user_id)!.push(msg as UserMessage);
      }

      const list: Conversation[] = [];
      for (const [userId, msgs] of map) {
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('user_id', userId).single();
        list.push({
          user_id: userId,
          profile: profile || { full_name: null, email: null },
          lastMessage: msgs[0].message,
          lastMessageDate: msgs[0].created_at,
          unreadCount: msgs.filter(m => m.sender_type === 'user' && !m.is_read).length,
        });
      }
      return list;
    },
    enabled: open,
  });

  // Fetch selected conversation messages
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['admin-dialog-messages', selectedConversation?.user_id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from('user_messages').select('*')
        .eq('user_id', selectedConversation.user_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data as UserMessage[];
    },
    enabled: !!selectedConversation && open,
  });

  // Mark as read
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unread = messages.filter(m => m.sender_type === 'user' && !m.is_read);
      if (unread.length > 0) {
        Promise.all(unread.map(msg => supabase.from('user_messages').update({ is_read: true }).eq('id', msg.id)))
          .then(() => { refetch(); queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] }); onMessagesRead?.(); });
      }
    }
  }, [selectedConversation, messages, refetch, queryClient, onMessagesRead]);

  // Scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!open) return;
    const channel = supabase.channel('admin-dialog-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_messages' }, () => {
        refetch(); if (selectedConversation) refetchMessages();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, refetch, refetchMessages, selectedConversation]);

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedConversation) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('user_messages').insert({
        user_id: selectedConversation.user_id, message: replyMessage.trim(), sender_type: 'admin', message_type: 'text',
      });
      if (error) throw error;
      setReplyMessage(''); refetchMessages();
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
    finally { setIsSending(false); }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    e.target.value = '';
    setIsSending(true);
    try {
      const fileName = `admin/${Date.now()}_${file.name}`;
      const { error: ue } = await supabase.storage.from('messages-audio').upload(fileName, file);
      if (ue) throw ue;
      const { data: urlData } = supabase.storage.from('messages-audio').getPublicUrl(fileName);
      const { error } = await supabase.from('user_messages').insert({
        user_id: selectedConversation.user_id, message: '🎵 Message audio',
        sender_type: 'admin', message_type: 'audio', audio_url: urlData.publicUrl,
      });
      if (error) throw error;
      toast({ title: 'Audio envoyé ✓' }); refetchMessages();
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
    finally { setIsSending(false); }
  };

  const handleDeleteMessage = async (msg: UserMessage) => {
    try {
      const { error } = await supabase.from('user_messages').update({ deleted_at: new Date().toISOString() }).eq('id', msg.id);
      if (error) throw error;
      toast({ title: 'Supprimé ✓' }); refetchMessages(); refetch();
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
    setDeleteTarget(null);
  };

  const handleEditMessage = async (msgId: string) => {
    if (!editText.trim()) return;
    try {
      const { error } = await supabase.from('user_messages').update({ message: editText.trim() }).eq('id', msgId);
      if (error) throw error;
      toast({ title: 'Modifié ✓' }); setEditingMsg(null); setEditText(''); refetchMessages();
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const handleReplaceAudio = async (msgId: string, file: File) => {
    try {
      const fileName = `admin/${Date.now()}_${file.name}`;
      const { error: ue } = await supabase.storage.from('messages-audio').upload(fileName, file);
      if (ue) throw ue;
      const { data: urlData } = supabase.storage.from('messages-audio').getPublicUrl(fileName);
      const { error } = await supabase.from('user_messages').update({ audio_url: urlData.publicUrl }).eq('id', msgId);
      if (error) throw error;
      toast({ title: 'Audio remplacé ✓' }); refetchMessages();
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const handleClose = () => {
    setSelectedConversation(null);
    setSearchQuery('');
    setReplyMessage('');
    onOpenChange(false);
  };

  const filtered = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.profile.full_name?.toLowerCase().includes(q) || c.profile.email?.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg h-[75vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {selectedConversation ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedConversation(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <User className="h-5 w-5" />
                {selectedConversation.profile.full_name || 'Élève'}
              </>
            ) : (
              <><Mail className="h-5 w-5" /> Messagerie Admin</>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">Gestion des messages</DialogDescription>
        </DialogHeader>

        {selectedConversation ? (
          /* === Conversation thread === */
          <div className="flex-1 flex flex-col overflow-hidden px-4">
            <div className="flex-1 overflow-y-auto pr-1" ref={scrollRef}>
              <div className="space-y-3 py-2">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg group relative ${msg.message_type === 'audio' ? 'w-full' : 'p-3'} ${
                      msg.sender_type === 'admin'
                        ? msg.message_type === 'audio' ? '' : 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {/* Admin controls */}
                      {msg.message_type !== 'audio' && (
                        <div className="absolute -top-2 right-0 hidden group-hover:flex gap-0.5 bg-background border rounded-md shadow-sm p-0.5 z-10">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingMsg(msg.id); setEditText(msg.message); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget(msg)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {editingMsg === msg.id ? (
                        <div className="space-y-2">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className="resize-none text-foreground" />
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setEditingMsg(null)}><X className="h-3 w-3" /></Button>
                            <Button size="sm" onClick={() => handleEditMessage(msg.id)}><Check className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ) : msg.message_type === 'audio' && msg.audio_url ? (
                        <AudioPlayer audioUrl={msg.audio_url} compact canManage={true}
                          onReplace={(file) => handleReplaceAudio(msg.id, file)}
                          onDelete={() => setDeleteTarget(msg)} />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      )}
                      <p className={`text-xs mt-1 ${msg.message_type === 'audio' ? 'px-3 pb-1' : ''} ${
                        msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {format(new Date(msg.created_at), 'dd MMM à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply */}
            <div className="space-y-2 py-3 border-t">
              <input ref={audioInputRef} type="file" className="hidden" accept=".mp3,.wav,.ogg,.webm,.m4a,audio/*" onChange={handleAudioUpload} />
              <Textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Réponse..." rows={2} className="resize-none" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => audioInputRef.current?.click()} disabled={isSending}>
                  <Music className="h-4 w-4 mr-1" /> Audio
                </Button>
                <Button size="sm" className="flex-1" onClick={handleSendReply} disabled={!replyMessage.trim() || isSending}>
                  <Send className="h-4 w-4 mr-2" /> Envoyer
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* === User list === */
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un élève..." className="pl-9" />
            </div>

            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{searchQuery ? 'Aucun résultat' : 'Aucun message'}</p>
                </div>
              ) : filtered.map((conv) => (
                <div
                  key={conv.user_id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm flex items-start gap-3 ${
                    conv.unreadCount > 0 ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-muted/50 border border-transparent hover:border-border'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    conv.unreadCount > 0 ? 'bg-orange-500/20' : 'bg-primary/10'
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{conv.profile.full_name || 'Élève'}</p>
                      {conv.unreadCount > 0 && <Badge className="bg-orange-500 text-[10px] h-5">{conv.unreadCount}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0">
                    {format(new Date(conv.lastMessageDate), 'dd/MM', { locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          onConfirm={() => deleteTarget && handleDeleteMessage(deleteTarget)}
          title="Supprimer ce message ?"
          description="Cette action est irréversible. Le message sera supprimé pour les deux parties."
        />
      </DialogContent>
    </Dialog>
  );
};

export default AdminMessagingDialog;
