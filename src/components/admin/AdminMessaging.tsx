import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mail, MailOpen, Send, User, ArrowLeft, Search, Trash2, Pencil, Music, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  conversation_id: string;
  profile: { full_name: string | null; email: string | null; };
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

const AdminMessaging = React.forwardRef<HTMLDivElement>((_, ref) => {
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

  // Fetch all conversations
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) { console.error(error); return []; }

      const conversationMap = new Map<string, UserMessage[]>();
      for (const msg of data) {
        const key = msg.user_id;
        if (!conversationMap.has(key)) conversationMap.set(key, []);
        conversationMap.get(key)!.push(msg as UserMessage);
      }

      const conversationList: Conversation[] = [];
      for (const [userId, messages] of conversationMap) {
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('user_id', userId).single();
        const unreadCount = messages.filter(m => m.sender_type === 'user' && !m.is_read).length;
        const lastMsg = messages[0];
        conversationList.push({
          user_id: userId, conversation_id: userId,
          profile: profile || { full_name: null, email: null },
          lastMessage: lastMsg.message, lastMessageDate: lastMsg.created_at, unreadCount,
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
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) { console.error(error); return []; }
      return data as UserMessage[];
    },
    enabled: !!selectedConversation,
  });

  // Mark messages as read
  useEffect(() => {
    if (selectedConversation && conversationMessages.length > 0) {
      const unread = conversationMessages.filter(m => m.sender_type === 'user' && !m.is_read);
      if (unread.length > 0) {
        Promise.all(unread.map(msg => supabase.from('user_messages').update({ is_read: true }).eq('id', msg.id)))
          .then(() => { refetch(); queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] }); });
      }
    }
  }, [selectedConversation, conversationMessages, refetch, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversationMessages]);

  // Realtime
  useEffect(() => {
    const channel = supabase.channel('admin-messages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_messages' }, () => {
        refetch(); if (selectedConversation) refetchMessages();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch, refetchMessages, selectedConversation]);

  // Send text reply
  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedConversation) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('user_messages').insert({
        user_id: selectedConversation.user_id, message: replyMessage.trim(),
        sender_type: 'admin', message_type: 'text',
      });
      if (error) throw error;
      toast({ title: 'Réponse envoyée' });
      setReplyMessage('');
      refetchMessages();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer la réponse', variant: 'destructive' });
    } finally { setIsSending(false); }
  };

  // Send audio
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user) return;
    e.target.value = '';
    setIsSending(true);
    try {
      const fileName = `admin/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('messages-audio').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('messages-audio').getPublicUrl(fileName);
      const { error } = await supabase.from('user_messages').insert({
        user_id: selectedConversation.user_id, message: '🎵 Message audio',
        sender_type: 'admin', message_type: 'audio', audio_url: urlData.publicUrl,
      });
      if (error) throw error;
      toast({ title: 'Audio envoyé ✓' });
      refetchMessages();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally { setIsSending(false); }
  };

  // Delete message (soft delete)
  const handleDeleteMessage = async (msg: UserMessage) => {
    try {
      const { error } = await supabase.from('user_messages')
        .update({ deleted_at: new Date().toISOString() }).eq('id', msg.id);
      if (error) throw error;
      toast({ title: msg.message_type === 'audio' ? 'Audio supprimé ✓' : 'Message supprimé ✓' });
      refetchMessages(); refetch();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  // Edit text message
  const handleEditMessage = async (msgId: string) => {
    if (!editText.trim()) return;
    try {
      const { error } = await supabase.from('user_messages')
        .update({ message: editText.trim() }).eq('id', msgId);
      if (error) throw error;
      toast({ title: 'Message modifié ✓' });
      setEditingMsg(null); setEditText('');
      refetchMessages();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  // Replace audio (admin can replace any)
  const handleReplaceAudio = async (msgId: string, file: File) => {
    try {
      const fileName = `admin/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('messages-audio').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('messages-audio').getPublicUrl(fileName);
      const { error } = await supabase.from('user_messages').update({ audio_url: urlData.publicUrl }).eq('id', msgId);
      if (error) throw error;
      toast({ title: 'Audio remplacé ✓' });
      refetchMessages();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.profile.full_name?.toLowerCase().includes(q) || c.profile.email?.toLowerCase().includes(q));
  });

  if (isLoading) {
    return (
      <div className="space-y-4" ref={ref}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse"><CardContent className="h-20 bg-muted/50" /></Card>
        ))}
      </div>
    );
  }

  // Conversation detail view
  if (selectedConversation) {
    return (
      <div className="space-y-4 h-[600px] flex flex-col" ref={ref}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedConversation.profile.full_name || 'Élève'}</p>
              <p className="text-xs text-muted-foreground">{selectedConversation.profile.email}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pr-2" ref={scrollRef}>
          <div className="space-y-3">
            {conversationMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg group relative ${msg.message_type === 'audio' ? 'w-full' : 'p-3'} ${
                  msg.sender_type === 'admin'
                    ? msg.message_type === 'audio' ? '' : 'bg-primary text-primary-foreground'
                    : msg.is_read
                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                      : 'bg-orange-500/20 border border-orange-500/50'
                }`}>
                  {/* Admin controls on messages */}
                  {msg.message_type !== 'audio' && (
                    <div className="absolute -top-2 right-0 hidden group-hover:flex gap-1 bg-background border rounded-md shadow-sm p-0.5">
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
                    <AudioPlayer
                      audioUrl={msg.audio_url}
                      compact
                      canManage={true}
                      onReplace={(file) => handleReplaceAudio(msg.id, file)}
                      onDelete={() => setDeleteTarget(msg)}
                    />
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

        {/* Reply input */}
        <div className="space-y-2 pt-3 border-t">
          <input ref={audioInputRef} type="file" className="hidden" accept=".mp3,.wav,.ogg,.webm,.m4a,audio/*" onChange={handleAudioUpload} />
          <Textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Votre réponse..." rows={2} className="resize-none" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => audioInputRef.current?.click()} disabled={isSending} size="sm">
              <Music className="h-4 w-4 mr-1" /> Audio
            </Button>
            <Button onClick={handleSendReply} disabled={!replyMessage.trim() || isSending} className="flex-1" size="sm">
              <Send className="h-4 w-4 mr-2" /> Envoyer la réponse
            </Button>
          </div>
        </div>

        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          onConfirm={() => deleteTarget && handleDeleteMessage(deleteTarget)}
          title={deleteTarget?.message_type === 'audio' ? 'Supprimer ce message audio ?' : 'Supprimer ce message ?'}
          description="Cette action est irréversible. Le message sera supprimé pour les deux parties."
        />
      </div>
    );
  }

  // Conversations list
  return (
    <div className="space-y-4" ref={ref}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Mail className="h-5 w-5" /> Messages des élèves
        </h2>
        {conversations.filter(c => c.unreadCount > 0).length > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {conversations.reduce((sum, c) => sum + c.unreadCount, 0)} non lu(s)
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un élève..." className="pl-9" />
      </div>

      <div className="space-y-3">
        {filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? 'Aucun résultat' : 'Aucun message pour le moment'}</p>
            </CardContent>
          </Card>
        ) : (
          filteredConversations.map((conv) => (
            <Card
              key={conv.user_id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                conv.unreadCount > 0 ? 'border-orange-500 bg-orange-500/10' : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
              onClick={() => setSelectedConversation(conv)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    conv.unreadCount > 0 ? 'bg-orange-500/20' : 'bg-emerald-500/20'
                  }`}>
                    {conv.unreadCount > 0 ? <Mail className="h-5 w-5 text-orange-500" /> : <MailOpen className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{conv.profile.full_name || 'Élève'}</p>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-orange-500 text-xs">{conv.unreadCount} nouveau{conv.unreadCount > 1 ? 'x' : ''}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {conv.profile.email} • {format(new Date(conv.lastMessageDate), 'dd MMM à HH:mm', { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
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
