import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, Edit2, Eye, Download, FileText, Play, Music, Image, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';

const GROUPS = [
  { key: 'petits', label: 'Petits', labelAr: 'الصغار' },
  { key: 'jeunes', label: 'Jeunes', labelAr: 'الشباب' },
  { key: 'adultes', label: 'Adultes', labelAr: 'الكبار' },
];

const getContentIcon = (type: string) => {
  if (type.includes('video')) return <Play className="h-4 w-4" />;
  if (type.includes('audio')) return <Music className="h-4 w-4" />;
  if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
  if (type.includes('image')) return <Image className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const calculateAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
};

const getGroupForAge = (age: number | null): string | null => {
  if (age === null) return null;
  if (age <= 6) return 'petits';
  if (age <= 10) return 'jeunes';
  return 'adultes';
};

const getGroupLabel = (key: string): string => {
  return GROUPS.find(g => g.key === key)?.label || key;
};

const PrayerModuleCards = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile for age/prayer_group
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-prayer', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('date_of_birth, prayer_group')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { date_of_birth: string | null; prayer_group: string | null } | null;
    },
    enabled: !!user?.id,
  });

  // Determine which group(s) to show
  const allowedGroup = useMemo(() => {
    if (isAdmin) return null; // admin sees all
    if (!userProfile) return null;
    // Manual override takes priority
    if (userProfile.prayer_group) return userProfile.prayer_group;
    // Calculate from age
    const age = calculateAge(userProfile.date_of_birth);
    return getGroupForAge(age);
  }, [isAdmin, userProfile]);

  const visibleGroups = useMemo(() => {
    if (isAdmin || !allowedGroup) return GROUPS;
    return GROUPS.filter(g => g.key === allowedGroup);
  }, [isAdmin, allowedGroup]);

  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Set initial active group when visibleGroups change
  const effectiveActiveGroup = activeGroup && visibleGroups.some(g => g.key === activeGroup)
    ? activeGroup
    : visibleGroups[0]?.key || 'petits';

  const { data: cards = [] } = useQuery({
    queryKey: ['prayer-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_cards')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cardContent = [] } = useQuery({
    queryKey: ['prayer-card-content', selectedCard?.id],
    queryFn: async () => {
      if (!selectedCard?.id) return [];
      const { data, error } = await supabase
        .from('prayer_card_content')
        .select('*')
        .eq('card_id', selectedCard.id)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCard?.id,
  });

  const groupCards = cards.filter(c => c.group_key === effectiveActiveGroup);

  const uploadContentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedCard?.id || !user?.id) throw new Error('Missing data');
      const ext = file.name.split('.').pop();
      const path = `${selectedCard.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('prayer-cards').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('prayer-cards').getPublicUrl(path);
      const maxOrder = cardContent.length > 0 ? Math.max(...cardContent.map(c => c.display_order)) : 0;
      const { error } = await supabase.from('prayer_card_content').insert({
        card_id: selectedCard.id, content_type: file.type, file_url: urlData.publicUrl,
        file_name: file.name, display_order: maxOrder + 1, uploaded_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prayer-card-content', selectedCard?.id] }); toast.success('Fichier ajouté !'); },
    onError: () => toast.error('Erreur lors de l\'upload'),
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const { error } = await supabase.from('prayer_card_content').delete().eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prayer-card-content', selectedCard?.id] }); toast.success('Contenu supprimé'); },
  });

  const updateCardMutation = useMutation({
    mutationFn: async ({ id, title, image_url }: { id: string; title?: string; image_url?: string }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (image_url !== undefined) updates.image_url = image_url;
      const { error } = await supabase.from('prayer_cards').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prayer-cards'] }); setEditingCard(null); toast.success('Carte mise à jour'); },
  });

  const uploadCardImage = async (file: File, cardId: string) => {
    const ext = file.name.split('.').pop();
    const path = `card-images/${cardId}.${ext}`;
    await supabase.storage.from('prayer-cards').upload(path, file, { upsert: true });
    const { data } = supabase.storage.from('prayer-cards').getPublicUrl(path);
    updateCardMutation.mutate({ id: cardId, image_url: data.publicUrl });
  };

  const moveCard = useMutation({
    mutationFn: async ({ cardId, direction }: { cardId: string; direction: 'up' | 'down' }) => {
      const sorted = [...groupCards].sort((a, b) => a.display_order - b.display_order);
      const idx = sorted.findIndex(c => c.id === cardId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx], b = sorted[swapIdx];
      await supabase.from('prayer_cards').update({ display_order: b.display_order }).eq('id', a.id);
      await supabase.from('prayer_cards').update({ display_order: a.display_order }).eq('id', b.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prayer-cards'] }),
  });

  const handleViewContent = (url: string) => window.open(url, '_blank');
  const handleDownloadContent = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename; a.click();
      URL.revokeObjectURL(blobUrl);
    } catch { toast.error('Erreur de téléchargement'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Modules de prière</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Group tabs */}
      <div className="flex gap-2">
        {visibleGroups.map(g => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            className={cn(
              'flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all',
              effectiveActiveGroup === g.key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Age group message for non-admin */}
      {!isAdmin && allowedGroup && (
        <p className="text-center text-sm text-muted-foreground">
          Ton espace <span className="font-semibold text-foreground">{getGroupLabel(allowedGroup)}</span> 🌟
        </p>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {groupCards.sort((a, b) => a.display_order - b.display_order).map((card, index) => (
          <div
            key={card.id}
            className="module-card rounded-xl overflow-hidden cursor-pointer hover:shadow-elevated transition-all animate-slide-up"
            style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
            onClick={() => setSelectedCard(card)}
          >
            {card.image_url ? (
              <div className="aspect-[4/3] bg-muted">
                <img src={card.image_url} alt={card.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary/40" />
              </div>
            )}
            <div className="p-2.5">
              <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{card.title || card.title_arabic || 'Sans titre'}</p>
            </div>
            {isAdmin && (
              <div className="flex justify-center gap-1 pb-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => moveCard.mutate({ cardId: card.id, direction: 'up' })} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground">↑</button>
                <button onClick={() => moveCard.mutate({ cardId: card.id, direction: 'down' })} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground">↓</button>
                <button onClick={() => { setEditingCard(card); setEditTitle(card.title); }} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground"><Edit2 className="h-3 w-3 inline" /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Card detail dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedCard?.title}</DialogTitle>
          </DialogHeader>
          {isAdmin && (
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" className="hidden" accept="video/*,audio/*,application/pdf,image/*"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadContentMutation.mutate(file); e.target.value = ''; }} />
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploadContentMutation.isPending}>
                <Upload className="h-4 w-4" /> {uploadContentMutation.isPending ? 'Upload en cours...' : 'Ajouter un fichier'}
              </Button>
            </div>
          )}
          {cardContent.length > 0 ? (
            <div className="space-y-3">
              {cardContent.map((item) => (
                <div key={item.id} className="bg-muted/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getContentIcon(item.content_type)}
                      <span className="text-sm font-medium truncate">{item.file_name}</span>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setDeleteContentId(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {item.content_type.includes('video') && <video controls className="w-full rounded-lg" src={item.file_url} />}
                  {item.content_type.includes('audio') && <audio controls className="w-full" src={item.file_url} />}
                  {item.content_type.includes('image') && <img src={item.file_url} alt={item.file_name} className="w-full rounded-lg" />}
                  {(item.content_type.includes('pdf') || item.file_name.endsWith('.pdf')) && <iframe src={item.file_url} className="w-full aspect-[3/4] rounded-lg" />}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => handleViewContent(item.file_url)}><Eye className="h-3 w-3" /> Voir</Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => handleDownloadContent(item.file_url, item.file_name)}><Download className="h-3 w-3" /> Télécharger</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucun contenu pour le moment</p>
              {isAdmin && <p className="text-xs mt-1">Ajoutez des fichiers (vidéos, audios, PDF, images)</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit card dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la carte</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Titre</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Image de la carte</label>
              <input ref={imageInputRef} type="file" className="hidden" accept="image/*"
                onChange={(e) => { const file = e.target.files?.[0]; if (file && editingCard) uploadCardImage(file, editingCard.id); e.target.value = ''; }} />
              <Button variant="outline" size="sm" className="w-full gap-2 mt-1" onClick={() => imageInputRef.current?.click()}>
                <Image className="h-4 w-4" /> Changer l'image
              </Button>
            </div>
            <Button className="w-full" onClick={() => updateCardMutation.mutate({ id: editingCard.id, title: editTitle })} disabled={updateCardMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
        onConfirm={() => { if (deleteContentId) deleteContentMutation.mutate(deleteContentId); setDeleteContentId(null); }}
        description="Ce fichier sera supprimé définitivement."
      />
    </div>
  );
};

export default PrayerModuleCards;
