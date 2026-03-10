/**
 * AdminGenericModuleManager — Gestionnaire admin de cartes pour tous les modules génériques
 * (Vocabulaire, Darija, Dictionnaire, Dhikr, Histoires prophètes, Hadiths, Grammaire, 99 Noms, Alphabet, etc.)
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  GripVertical, Plus, Pencil, Trash2, Loader2,
  ArrowLeft, Image as ImageIcon,
} from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import ContentUploadTabs from './ContentUploadTabs';
import ContentItemCard, { ContentType } from './ContentItemCard';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      <button {...attributes} {...listeners} className="flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

interface Props {
  moduleId: string;
  moduleTitle: string;
  onBack: () => void;
}

const AdminGenericModuleManager = ({ moduleId, moduleTitle, onBack }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSection, setFormSection] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['admin-module-cards', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase.from('module_cards').select('*').eq('module_id', moduleId).order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [] } = useQuery({
    queryKey: ['admin-module-card-contents', moduleId],
    queryFn: async () => {
      if (!cards.length) return [];
      const cardIds = (cards as any[]).map((c: any) => c.id);
      const { data, error } = await supabase.from('module_card_content').select('*').in('card_id', cardIds).order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: (cards as any[]).length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formTitle.trim()) throw new Error('Le titre est requis');
      const payload = {
        module_id: moduleId,
        title: formTitle,
        title_arabic: formTitleAr || null,
        description: formDesc || null,
        section: formSection || null,
      };
      if (editingCard) {
        const { error } = await supabase.from('module_cards').update(payload).eq('id', editingCard.id);
        if (error) throw error;
      } else {
        const maxOrder = (cards as any[]).reduce((max: number, c: any) => Math.max(max, c.display_order ?? 0), -1);
        const { error } = await supabase.from('module_cards').insert({ ...payload, display_order: maxOrder + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-module-cards', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-cards', moduleId] });
      toast.success(editingCard ? 'Carte modifiée ✅' : 'Carte ajoutée ✅');
      setFormOpen(false);
      setEditingCard(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('module_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-module-cards', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-cards', moduleId] });
      toast.success('Carte supprimée');
      setDeleteCardId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (newList: any[]) => {
      for (let i = 0; i < newList.length; i++) {
        await supabase.from('module_cards').update({ display_order: i }).eq('id', newList[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-module-cards', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-cards', moduleId] });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = (contents as any[]).find((c: any) => c.id === contentId);
      if (content) {
        try {
          const url = new URL(content.file_url);
          const parts = url.pathname.split('/object/public/module-cards/');
          if (parts[1]) await supabase.storage.from('module-cards').remove([decodeURIComponent(parts[1])]);
        } catch { /* ignore */ }
      }
      const { error } = await supabase.from('module_card_content').delete().eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-module-card-contents', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-card-contents', moduleId] });
      toast.success('Contenu supprimé');
      setDeleteContentId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleUploadContent = useCallback(async (cardId: string, file: File, contentType: string) => {
    if (!user?.id) { toast.error('Non connecté'); return; }
    setIsUploading(true);
    setUploadingCardId(cardId);
    try {
      const existingCount = (contents as any[]).filter((c: any) => c.card_id === cardId).length;
      const ext = file.name.split('.').pop();
      const path = `card-${cardId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('module-cards').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('module-cards').getPublicUrl(path);
      const defaultTitle = contentType === 'audio' ? 'Audio' : file.name;
      const { error: insErr } = await supabase.from('module_card_content').insert({
        card_id: cardId, content_type: contentType, file_url: urlData.publicUrl,
        file_name: defaultTitle, display_order: existingCount, uploaded_by: user.id,
      });
      if (insErr) throw insErr;
      queryClient.invalidateQueries({ queryKey: ['admin-module-card-contents', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-card-contents', moduleId] });
      toast.success('Contenu ajouté ✅');
    } catch (e: any) {
      toast.error(e.message || 'Erreur upload');
    } finally {
      setIsUploading(false);
      setUploadingCardId(null);
    }
  }, [user, contents, queryClient, moduleId]);

  const handleAddYoutubeContent = useCallback(async (cardId: string, embedUrl: string) => {
    if (!user?.id) return;
    setIsUploading(true);
    setUploadingCardId(cardId);
    try {
      const existingCount = (contents as any[]).filter((c: any) => c.card_id === cardId).length;
      const { error } = await supabase.from('module_card_content').insert({
        card_id: cardId, content_type: 'youtube', file_url: embedUrl,
        file_name: 'Vidéo YouTube', display_order: existingCount, uploaded_by: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-module-card-contents', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-card-contents', moduleId] });
      toast.success('Lien YouTube ajouté ✅');
    } catch (e: any) { toast.error(e.message); }
    finally { setIsUploading(false); setUploadingCardId(null); }
  }, [user, contents, queryClient, moduleId]);

  const updateContentTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from('module_card_content').update({ file_name: title }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-module-card-contents', moduleId] });
    },
  });

  const handleUploadImage = useCallback(async (cardId: string, file: File) => {
    setIsUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `card-images/${cardId}.${ext}`;
      const { error: upErr } = await supabase.storage.from('module-cards').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('module-cards').getPublicUrl(path);
      const { error } = await supabase.from('module_cards').update({ image_url: urlData.publicUrl }).eq('id', cardId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-module-cards', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-cards', moduleId] });
      toast.success('Image mise à jour ✅');
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsUploadingImage(false);
  }, [queryClient, moduleId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = (cards as any[]).findIndex((c: any) => c.id === active.id);
    const newIdx = (cards as any[]).findIndex((c: any) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const newOrder = arrayMove(cards as any[], oldIdx, newIdx);
    reorderMutation.mutate(newOrder);
  };

  const openAdd = () => {
    setEditingCard(null);
    setFormTitle(''); setFormTitleAr(''); setFormDesc(''); setFormSection('');
    setFormOpen(true);
  };

  const openEdit = (card: any) => {
    setEditingCard(card);
    setFormTitle(card.title || '');
    setFormTitleAr(card.title_arabic || '');
    setFormDesc(card.description || '');
    setFormSection(card.section || '');
    setFormOpen(true);
  };

  const mapContentType = (type: string): ContentType => {
    if (type === 'youtube') return 'youtube';
    if (type === 'audio') return 'audio';
    return 'fichier';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Retour</Button>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Ajouter une carte</Button>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">Gestion — {moduleTitle}</h2>
        <p className="text-sm text-muted-foreground">Glissez pour réordonner. Icône 📷 pour changer l'image, 📁 pour ajouter du contenu.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (cards as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Aucune carte</p>
          <p className="text-sm">Cliquez sur "Ajouter une carte" pour commencer.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(cards as any[]).map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {(cards as any[]).map((card: any, index: number) => {
                const cardContents = (contents as any[]).filter((c: any) => c.card_id === card.id);
                const isThisUploading = isUploading && uploadingCardId === card.id;
                return (
                  <SortableItem key={card.id} id={card.id}>
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          {/* Image */}
                          <div className="relative shrink-0">
                            {card.image_url ? (
                              <img src={card.image_url} alt={card.title} className="w-12 h-12 rounded-xl object-contain bg-muted" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center">
                                <span className="text-primary-foreground text-xs font-bold">#{index + 1}</span>
                              </div>
                            )}
                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/30 rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(card.id, f); e.target.value = ''; }}
                              />
                              <ImageIcon className="h-4 w-4 text-white" />
                            </label>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              <p className="font-bold text-sm text-foreground">{card.title}</p>
                              {card.section && <Badge variant="outline" className="text-xs">{card.section}</Badge>}
                            </div>
                            {card.title_arabic && <p className="text-xs text-muted-foreground font-arabic">{card.title_arabic}</p>}
                            <p className="text-xs text-muted-foreground">{cardContents.length} contenu(s)</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 shrink-0">
                            <div className="relative">
                              <input
                                type="file" multiple
                                accept="video/*,audio/*,application/pdf,image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => { if (e.target.files?.length) handleUploadContent(card.id, e.target.files); e.target.value = ''; }}
                                disabled={isThisUploading}
                              />
                              <Button variant="outline" size="sm" disabled={isThisUploading} className="pointer-events-none h-8 px-2">
                                {isThisUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openEdit(card)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteCardId(card.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Content list */}
                        {cardContents.length > 0 && (
                          <div className="ml-14 space-y-1">
                            {cardContents.map((content: any) => (
                              <div key={content.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-2 py-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {getContentIcon(content.content_type)}
                                  <span className="text-xs truncate">{content.file_name}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                                  onClick={() => setDeleteContentId(content.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingCard(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Modifier la carte' : 'Nouvelle carte'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Leçon 1, Vocabulaire..." />
            </div>
            <div>
              <Label>Titre en arabe</Label>
              <Input value={formTitleAr} onChange={(e) => setFormTitleAr(e.target.value)} placeholder="بالعربية" className="font-arabic text-right" dir="rtl" />
            </div>
            <div>
              <Label>Section / Catégorie</Label>
              <Input value={formSection} onChange={(e) => setFormSection(e.target.value)} placeholder="Ex: Le nom, Le verbe..." />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Description optionnelle..." rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setFormOpen(false); setEditingCard(null); }}>Annuler</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingCard ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteCardId}
        onOpenChange={(open) => !open && setDeleteCardId(null)}
        onConfirm={() => { if (deleteCardId) deleteMutation.mutate(deleteCardId); setDeleteCardId(null); }}
        description="Cette carte et tout son contenu seront supprimés définitivement."
      />
      <ConfirmDeleteDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
        onConfirm={() => { if (deleteContentId) deleteContentMutation.mutate(deleteContentId); setDeleteContentId(null); }}
        description="Ce contenu sera supprimé définitivement."
      />
    </div>
  );
};

export default AdminGenericModuleManager;
