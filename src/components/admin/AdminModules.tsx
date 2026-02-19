import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import {
  ArrowLeft, Plus, Pencil, Trash2, Upload, GripVertical, Image,
  Moon, BookOpen, Hand, BookMarked, Sparkles, MessageSquare, Star, Music, Video, FileText,
  MoreVertical, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { LucideIcon } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ICON_MAP: Record<string, LucideIcon> = {
  Moon, BookOpen, Hand, BookMarked, Sparkles, MessageSquare, Star, Music, Video, FileText, Image,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

const SortableModuleItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
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

interface AdminModulesProps {
  onBack: () => void;
}

const AdminModules = ({ onBack }: AdminModulesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [contentTitle, setContentTitle] = useState('');
  const [contentType, setContentType] = useState('pdf');
  const [contentUrl, setContentUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [titleArabic, setTitleArabic] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('BookOpen');
  const [gradient, setGradient] = useState('from-primary via-royal-dark to-primary');
  const [iconColor, setIconColor] = useState('text-gold');

  const { data: modules, isLoading } = useQuery({
    queryKey: ['admin-learning-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('learning_modules').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: moduleContents } = useQuery({
    queryKey: ['admin-all-module-contents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('module_content').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveMutation = useMutation({
    mutationFn: async (moduleData: any) => {
      if (editingModule) {
        const { error } = await supabase.from('learning_modules').update(moduleData).eq('id', editingModule.id);
        if (error) throw error;
      } else {
        const maxOrder = modules?.reduce((max, m) => Math.max(max, m.display_order), -1) ?? -1;
        const { error } = await supabase.from('learning_modules').insert({ ...moduleData, display_order: maxOrder + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-modules'] });
      queryClient.invalidateQueries({ queryKey: ['learning-modules'] });
      toast.success(editingModule ? 'Module modifié' : 'Module ajouté');
      setDialogOpen(false);
      setEditingModule(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('learning_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-modules'] });
      queryClient.invalidateQueries({ queryKey: ['learning-modules'] });
      toast.success('Module supprimé');
      setDeleteOpen(false);
      setModuleToDelete(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (newModules: any[]) => {
      for (let i = 0; i < newModules.length; i++) {
        await supabase.from('learning_modules').update({ display_order: i }).eq('id', newModules[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-modules'] });
      queryClient.invalidateQueries({ queryKey: ['learning-modules'] });
    },
  });

  const addContentMutation = useMutation({
    mutationFn: async (data: { module_id: string; title: string; content_type: string; file_url: string; file_name: string }) => {
      const maxOrder = (moduleContents?.filter(c => c.module_id === data.module_id) || []).reduce((max, c) => Math.max(max, c.display_order), -1);
      const { error } = await supabase.from('module_content').insert({ ...data, display_order: maxOrder + 1, uploaded_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-module-contents'] });
      queryClient.invalidateQueries({ queryKey: ['module-content'] });
      toast.success('Contenu ajouté');
      setContentDialogOpen(false);
      setContentTitle('');
      setContentUrl('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('module_content').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-module-contents'] });
      queryClient.invalidateQueries({ queryKey: ['module-content'] });
      toast.success('Contenu supprimé');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('learning_modules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-modules'] });
      queryClient.invalidateQueries({ queryKey: ['learning-modules'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !modules) return;
    const oldIndex = modules.findIndex(m => m.id === active.id);
    const newIndex = modules.findIndex(m => m.id === over.id);
    const newOrder = arrayMove(modules, oldIndex, newIndex);
    reorderMutation.mutate(newOrder);
  };

  const openEditDialog = (mod: any) => {
    setEditingModule(mod);
    setTitle(mod.title);
    setTitleArabic(mod.title_arabic);
    setDescription(mod.description || '');
    setIcon(mod.icon);
    setGradient(mod.gradient);
    setIconColor(mod.icon_color);
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingModule(null);
    setTitle('');
    setTitleArabic('');
    setDescription('');
    setIcon('BookOpen');
    setGradient('from-primary via-royal-dark to-primary');
    setIconColor('text-gold');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error('Le titre est requis'); return; }
    saveMutation.mutate({ title, title_arabic: titleArabic, description, icon, gradient, icon_color: iconColor });
  };

  const handleImageUpload = async (moduleId: string, file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `module-images/${moduleId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('module-content').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('module-content').getPublicUrl(path);
      const { error } = await supabase.from('learning_modules').update({ image_url: publicUrl }).eq('id', moduleId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-learning-modules'] });
      queryClient.invalidateQueries({ queryKey: ['learning-modules'] });
      toast.success('Image importée');
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedModule) return;
    setUploading(true);
    try {
      const path = `${selectedModule.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('module-content').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('module-content').getPublicUrl(path);
      const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('image') ? 'image' : 'pdf';
      addContentMutation.mutate({ module_id: selectedModule.id, title: contentTitle || file.name, content_type: type, file_url: publicUrl, file_name: file.name });
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const getContentsForModule = (moduleId: string) => moduleContents?.filter(c => c.module_id === moduleId) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Retour</Button>
        <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" /> Ajouter un module</Button>
      </div>

      <h2 className="text-xl font-bold text-foreground">Gestion des modules</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(modules || []).map(m => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {modules?.map((mod) => {
                const Icon = ICON_MAP[mod.icon] || BookOpen;
                const contents = getContentsForModule(mod.id);
                return (
                  <SortableModuleItem key={mod.id} id={mod.id}>
                    <Card className={`${!mod.is_active ? 'opacity-50' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            {mod.image_url ? (
                              <img src={mod.image_url} className="w-12 h-12 rounded-xl object-cover" alt={mod.title} />
                            ) : (
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${mod.gradient}`}>
                                <Icon className={`h-6 w-6 ${mod.icon_color}`} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground truncate">{mod.title}</p>
                              {mod.is_builtin && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Natif</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{mod.description} • {contents.length} contenu(s)</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(mod)}>
                                <Pencil className="h-4 w-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedModule(mod);
                                setContentDialogOpen(true);
                              }}>
                                <Plus className="h-4 w-4 mr-2" /> Ajouter du contenu
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) handleImageUpload(mod.id, file);
                                };
                                input.click();
                              }}>
                                <Image className="h-4 w-4 mr-2" /> Importer une image
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: mod.id, is_active: !mod.is_active })}>
                                {mod.is_active ? <><EyeOff className="h-4 w-4 mr-2" /> Masquer</> : <><Eye className="h-4 w-4 mr-2" /> Afficher</>}
                              </DropdownMenuItem>
                              {!mod.is_builtin && (
                                <DropdownMenuItem className="text-destructive" onClick={() => { setModuleToDelete(mod.id); setDeleteOpen(true); }}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Content list */}
                        {contents.length > 0 && (
                          <div className="mt-2 ml-15 space-y-1">
                            {contents.map((c) => (
                              <div key={c.id} className="flex items-center justify-between text-xs py-1 px-2 bg-muted/50 rounded">
                                <span className="truncate">{c.title} ({c.content_type})</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setContentToDelete(c.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </SortableModuleItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Module Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Modifier le module' : 'Ajouter un module'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom du module" />
            </div>
            <div>
              <Label>Titre arabe</Label>
              <Input value={titleArabic} onChange={e => setTitleArabic(e.target.value)} placeholder="العنوان" className="font-arabic text-right" dir="rtl" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Courte description" />
            </div>
            <div>
              <Label>Icône</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(i => {
                    const I = ICON_MAP[i];
                    return <SelectItem key={i} value={i}><span className="flex items-center gap-2"><I className="h-4 w-4" />{i}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Content Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter du contenu à {selectedModule?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre du contenu</Label>
              <Input value={contentTitle} onChange={e => setContentTitle(e.target.value)} placeholder="Titre" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL ou fichier</Label>
              <Input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://... ou cliquez Importer" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" /> {uploading ? 'Import...' : 'Importer un fichier'}
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              <Button className="flex-1" disabled={!contentUrl.trim() || !contentTitle.trim()} onClick={() => {
                if (!selectedModule) return;
                addContentMutation.mutate({
                  module_id: selectedModule.id,
                  title: contentTitle,
                  content_type: contentType,
                  file_url: contentUrl,
                  file_name: contentTitle,
                });
              }}>
                Ajouter par URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!contentToDelete}
        onOpenChange={(open) => !open && setContentToDelete(null)}
        onConfirm={() => { if (contentToDelete) deleteContentMutation.mutate(contentToDelete); setContentToDelete(null); }}
        title="Supprimer le contenu"
        description="Voulez-vous vraiment supprimer ce contenu définitivement ?"
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => moduleToDelete && deleteMutation.mutate(moduleToDelete)}
        title="Supprimer le module"
        description="Voulez-vous vraiment supprimer ce module et tout son contenu ?"
      />
    </div>
  );
};

export default AdminModules;
