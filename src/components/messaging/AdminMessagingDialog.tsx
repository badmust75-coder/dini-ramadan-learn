import { useState, useEffect, useRef } from 'react';
import { Mail, MailOpen, Send, User, ArrowLeft, Search, Music, Plus, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // New message dialog state
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState('');
  const [newMsgSelectedUser, setNewMsgSelectedUser] = useState<{ user_id: string; full_name: string | null; email: string | null } | null>(null);
  const [newMsgText, setNewMsgText] = useState('');
  const [newMsgSending, setNewMsgSending] = useState(false);

  // Group message dialog state
  const [groupMsgOpen, setGroupMsgOpen] = useState(false);
  const [groupMsgText, setGroupMsgText] = useState('');
  const [groupMsgPush, setGroupMsgPush] = useState(true);
  const [groupMsgSending, setGroupMsgSending] = useState(false);
  const [groupMsgMode, setGroupMsgMode] = useState<'all' | 'select' | 'top3' | 'groups'>('all');
  const [groupMsgSelected, setGroupMsgSelected] = useState<Set<string>>(new Set());
  const [groupMsgSearch, setGroupMsgSearch] = useState('');
  const [groupMsgSelectedGroups, setGroupMsgSelectedGroups] = useState<Set<string>>(new Set());

  // Fetch all profiles for new message / group message dialog
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['admin-all-profiles-messaging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('is_approved', true)
        .order('full_name');
      if (error) return [];
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));
      return (data || []).filter(p => !adminIds.has(p.user_id));
    },
    enabled: newMsgOpen || groupMsgOpen,
  });

  // Fetch student groups
  const { data: studentGroups = [] } = useQuery({
    queryKey: ['student-groups-messaging'],
    queryFn: async () => {
      const { data: groups } = await (supabase as any).from('student_groups').select('*').order('display_order');
      const { data: members } = await (supabase as any).from('student_group_members').select('group_id, user_id');
      return (groups || []).map((g: any) => ({
        ...g,
        memberIds: (members || []).filter((m: any) => m.group_id === g.id).map((m: any) => m.user_id),
      }));
    },
    enabled: groupMsgOpen,
  });

  // Fetch top 3 ranking for group mode
  const { data: top3UserIds = [] } = useQuery({
    queryKey: ['admin-top3-ranking'],
    queryFn: async () => {
      const { data } = await supabase.from('student_ranking').select('user_id').order('total_points', { ascending: false }).limit(3);
      return (data || []).map(r => r.user_id);
    },
    enabled: groupMsgOpen && groupMsgMode === 'top3',
  });

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

  const handleClose = () => {
    setSelectedConversation(null);
    setSearchQuery('');
    setReplyMessage('');
    onOpenChange(false);
  };

  // New message: send
  const handleSendNewMessage = async () => {
    if (!newMsgSelectedUser || !newMsgText.trim()) return;
    setNewMsgSending(true);
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(c => c.user_id === newMsgSelectedUser.user_id);

      const { error } = await supabase.from('user_messages').insert({
        user_id: newMsgSelectedUser.user_id,
        message: newMsgText.trim(),
        sender_type: 'admin',
        message_type: 'text',
      });
      if (error) throw error;

      // Close new message dialog and open the conversation
      setNewMsgOpen(false);
      setNewMsgText('');
      setNewMsgSelectedUser(null);
      setNewMsgSearch('');

      await refetch();

      // Open the conversation
      const conv: Conversation = existingConv || {
        user_id: newMsgSelectedUser.user_id,
        profile: { full_name: newMsgSelectedUser.full_name, email: newMsgSelectedUser.email },
        lastMessage: newMsgText.trim(),
        lastMessageDate: new Date().toISOString(),
        unreadCount: 0,
      };
      setSelectedConversation(conv);

      toast({ title: 'Message envoyé ✓' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setNewMsgSending(false);
    }
  };

  // Group message: compute target profiles based on mode
  const getGroupTargets = () => {
    if (groupMsgMode === 'all') return allProfiles;
    if (groupMsgMode === 'top3') return allProfiles.filter(p => top3UserIds.includes(p.user_id));
    if (groupMsgMode === 'select') return allProfiles.filter(p => groupMsgSelected.has(p.user_id));
    if (groupMsgMode === 'groups') {
      const memberIds = new Set<string>();
      for (const g of studentGroups) {
        if (groupMsgSelectedGroups.has(g.id)) {
          for (const uid of g.memberIds) memberIds.add(uid);
        }
      }
      return allProfiles.filter(p => memberIds.has(p.user_id));
    }
    return [];
  };

  const groupTargetCount = getGroupTargets().length;

  const handleSendGroupMessage = async () => {
    const targets = getGroupTargets();
    if (!groupMsgText.trim() || targets.length === 0) return;
    setGroupMsgSending(true);
    try {
      const inserts = targets.map(p => ({
        user_id: p.user_id,
        message: groupMsgText.trim(),
        sender_type: 'admin' as const,
        message_type: 'text' as const,
      }));

      const { error } = await supabase.from('user_messages').insert(inserts);
      if (error) throw error;

      if (groupMsgPush) {
        try {
          if (groupMsgMode === 'all') {
            await supabase.functions.invoke('send-push-notification', {
              body: { title: '📢 Nouveau message du professeur', body: groupMsgText.trim().substring(0, 200), type: 'all' },
            });
          } else {
            // Send to specific user IDs
            for (const t of targets) {
              await supabase.functions.invoke('send-push-notification', {
                body: { title: '📢 Nouveau message du professeur', body: groupMsgText.trim().substring(0, 200), type: 'user', userId: t.user_id },
              });
            }
          }
        } catch (e) { console.error('Push notification error:', e); }
      }

      setGroupMsgOpen(false);
      setGroupMsgText('');
      setGroupMsgPush(true);
      setGroupMsgMode('all');
      setGroupMsgSelected(new Set());
      setGroupMsgSelectedGroups(new Set());
      setGroupMsgSearch('');
      refetch();

      toast({ title: `✅ Message envoyé à ${targets.length} élève${targets.length > 1 ? 's' : ''} !` });
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'envoyer le message groupé", variant: 'destructive' });
    } finally {
      setGroupMsgSending(false);
    }
  };

  const filteredGroupProfiles = allProfiles.filter(p => {
    if (!groupMsgSearch) return true;
    const q = groupMsgSearch.toLowerCase();
    return p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
  });

  const filtered = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.profile.full_name?.toLowerCase().includes(q) || c.profile.email?.toLowerCase().includes(q);
  });

  const filteredNewMsgProfiles = allProfiles.filter(p => {
    if (!newMsgSearch) return true;
    const q = newMsgSearch.toLowerCase();
    return p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
  });

  return (
    <>
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
                <>
                  <Mail className="h-5 w-5" /> Messagerie Admin
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setNewMsgOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Nouveau
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setGroupMsgOpen(true)}>
                      <Users className="h-4 w-4 mr-1" /> Groupe
                    </Button>
                  </div>
                </>
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
                        {msg.message_type === 'audio' && msg.audio_url ? (
                          <AudioPlayer audioUrl={msg.audio_url} compact />
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
        </DialogContent>
      </Dialog>

      {/* New Message Dialog */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>✉️ Nouveau message</DialogTitle>
            <DialogDescription>Sélectionnez un élève et écrivez votre message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Student search */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Élève</Label>
              {newMsgSelectedUser ? (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium flex-1">{newMsgSelectedUser.full_name || newMsgSelectedUser.email}</span>
                  <Button variant="ghost" size="sm" onClick={() => setNewMsgSelectedUser(null)} className="h-6 px-2 text-xs">
                    Changer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={newMsgSearch}
                      onChange={(e) => setNewMsgSearch(e.target.value)}
                      placeholder="Rechercher un élève..."
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {filteredNewMsgProfiles.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Aucun élève trouvé</p>
                    ) : filteredNewMsgProfiles.map((p) => (
                      <div
                        key={p.user_id}
                        onClick={() => { setNewMsgSelectedUser(p); setNewMsgSearch(''); }}
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <User className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{p.full_name || 'Élève'}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Message</Label>
              <Textarea
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                placeholder="Écrivez votre message..."
                rows={3}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSendNewMessage}
              disabled={!newMsgSelectedUser || !newMsgText.trim() || newMsgSending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" /> Envoyer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Message Dialog */}
      <Dialog open={groupMsgOpen} onOpenChange={setGroupMsgOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>👥 Message groupé</DialogTitle>
            <DialogDescription>Choisissez les destinataires et écrivez votre message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Destinataires</Label>
              <div className="space-y-2">
                {[
                  { value: 'all' as const, label: '👥 Tous les élèves', desc: `${allProfiles.length} élève${allProfiles.length > 1 ? 's' : ''}` },
                  { value: 'select' as const, label: '🎯 Sélectionner des élèves', desc: 'Choisir manuellement' },
                  { value: 'top3' as const, label: '🏆 Top classement', desc: 'Les 3 premiers' },
                  { value: 'groups' as const, label: '📂 Sélectionner des groupes', desc: `${studentGroups.length} groupe${studentGroups.length > 1 ? 's' : ''}` },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => { setGroupMsgMode(opt.value); if (opt.value !== 'select') setGroupMsgSelected(new Set()); if (opt.value !== 'groups') setGroupMsgSelectedGroups(new Set()); }}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                      groupMsgMode === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      groupMsgMode === opt.value ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {groupMsgMode === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student selection list */}
            {groupMsgMode === 'select' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">{groupMsgSelected.size} sélectionné{groupMsgSelected.size > 1 ? 's' : ''}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      if (groupMsgSelected.size === allProfiles.length) {
                        setGroupMsgSelected(new Set());
                      } else {
                        setGroupMsgSelected(new Set(allProfiles.map(p => p.user_id)));
                      }
                    }}
                  >
                    {groupMsgSelected.size === allProfiles.length ? 'Désélectionner' : 'Tout sélectionner'}
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={groupMsgSearch} onChange={(e) => setGroupMsgSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {filteredGroupProfiles.map(p => (
                    <div
                      key={p.user_id}
                      onClick={() => {
                        const next = new Set(groupMsgSelected);
                        next.has(p.user_id) ? next.delete(p.user_id) : next.add(p.user_id);
                        setGroupMsgSelected(next);
                      }}
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox checked={groupMsgSelected.has(p.user_id)} />
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                      <span className="text-sm">{p.full_name || 'Élève'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 3 preview */}
            {groupMsgMode === 'top3' && top3UserIds.length > 0 && (
              <div className="space-y-1">
                <Label className="text-sm font-semibold">🏆 Top 3</Label>
                <div className="border rounded-lg divide-y">
                  {allProfiles.filter(p => top3UserIds.includes(p.user_id)).map((p, i) => (
                    <div key={p.user_id} className="flex items-center gap-2 p-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">#{i + 1}</span>
                      <span className="text-sm">{p.full_name || 'Élève'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              value={groupMsgText}
              onChange={(e) => setGroupMsgText(e.target.value)}
              placeholder="Votre message..."
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="push-notif"
                checked={groupMsgPush}
                onCheckedChange={(v) => setGroupMsgPush(v === true)}
              />
              <label htmlFor="push-notif" className="text-sm cursor-pointer">
                Envoyer aussi une notification push sur les téléphones
              </label>
            </div>
            <Button
              onClick={handleSendGroupMessage}
              disabled={!groupMsgText.trim() || groupTargetCount === 0 || groupMsgSending}
              className="w-full"
            >
              {groupMsgSending ? 'Envoi en cours...' : `Envoyer à ${groupTargetCount} élève${groupTargetCount > 1 ? 's' : ''} 📢`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Need Label import
import { Label } from '@/components/ui/label';

export default AdminMessagingDialog;
