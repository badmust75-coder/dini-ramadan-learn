import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileText, List, Video, File, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardCard {
  id: string;
  title: string;
  icon: string;
  bg_color: string;
  content_type: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  is_public: boolean;
  display_order: number;
}

interface AdminDynamicCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCard?: DashboardCard | null;
}

const ICON_OPTIONS = [
  { value: 'FileText', label: 'Document' },
  { value: 'List', label: 'Liste' },
  { value: 'Video', label: 'Vidéo' },
  { value: 'BookOpen', label: 'Livre' },
  { value: 'Star', label: 'Étoile' },
  { value: 'Heart', label: 'Cœur' },
  { value: 'Bell', label: 'Cloche' },
  { value: 'Calendar', label: 'Calendrier' },
  { value: 'Image', label: 'Image' },
  { value: 'Music', label: 'Musique' },
];

const COLOR_OPTIONS = [
  { value: 'bg-blue-100 dark:bg-blue-900/30', label: 'Bleu', preview: 'bg-blue-400' },
  { value: 'bg-green-100 dark:bg-green-900/30', label: 'Vert', preview: 'bg-green-400' },
  { value: 'bg-purple-100 dark:bg-purple-900/30', label: 'Violet', preview: 'bg-purple-400' },
  { value: 'bg-amber-100 dark:bg-amber-900/30', label: 'Ambre', preview: 'bg-amber-400' },
  { value: 'bg-rose-100 dark:bg-rose-900/30', label: 'Rose', preview: 'bg-rose-400' },
  { value: 'bg-teal-100 dark:bg-teal-900/30', label: 'Sarcelle', preview: 'bg-teal-400' },
  { value: 'bg-orange-100 dark:bg-orange-900/30', label: 'Orange', preview: 'bg-orange-400' },
  { value: 'bg-indigo-100 dark:bg-indigo-900/30', label: 'Indigo', preview: 'bg-indigo-400' },
];

const AdminDynamicCardDialog = ({ open, onOpenChange, editCard }: AdminDynamicCardDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('FileText');
  const [bgColor, setBgColor] = useState(COLOR_OPTIONS[0].value);
  const [contentType, setContentType] = useState('text');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ['admin-all-users-for-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_approved', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Load visibility when editing
  const { data: cardVisibility } = useQuery({
    queryKey: ['card-visibility', editCard?.id],
    queryFn: async () => {
      if (!editCard?.id) return [];
      const { data, error } = await supabase
        .from('dashboard_card_visibility')
        .select('user_id')
        .eq('card_id', editCard.id);
      if (error) throw error;
      return data?.map(v => v.user_id) || [];
    },
    enabled: !!editCard?.id,
  });

  useEffect(() => {
    if (editCard) {
      setTitle(editCard.title);
      setIcon(editCard.icon);
      setBgColor(editCard.bg_color);
      setContentType(editCard.content_type);
      setContent(editCard.content || '');
      setIsPublic(editCard.is_public);
      setFileUrl(editCard.file_url);
      setFileName(editCard.file_name);
    } else {
      setTitle('');
      setIcon('FileText');
      setBgColor(COLOR_OPTIONS[0].value);
      setContentType('text');
      setContent('');
      setIsPublic(true);
      setSelectedUsers([]);
      setFileUrl(null);
      setFileName(null);
    }
  }, [editCard, open]);

  useEffect(() => {
    if (cardVisibility) {
      setSelectedUsers(cardVisibility);
    }
  }, [cardVisibility]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('admin-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('admin-content')
        .getPublicUrl(filePath);

      setFileUrl(publicUrl);
      setFileName(file.name);
      toast.success('Fichier uploadé');
    } catch (err: any) {
      toast.error('Erreur upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cardData = {
        title,
        icon,
        bg_color: bgColor,
        content_type: contentType,
        content: content || null,
        file_url: fileUrl,
        file_name: fileName,
        is_public: isPublic,
        created_by: user?.id,
      };

      let cardId: string;

      if (editCard) {
        const { error } = await supabase
          .from('dashboard_cards')
          .update(cardData)
          .eq('id', editCard.id);
        if (error) throw error;
        cardId = editCard.id;
      } else {
        const { data, error } = await supabase
          .from('dashboard_cards')
          .insert(cardData)
          .select('id')
          .single();
        if (error) throw error;
        cardId = data.id;
      }

      // Update visibility
      if (!isPublic) {
        // Delete existing visibility entries
        await supabase
          .from('dashboard_card_visibility')
          .delete()
          .eq('card_id', cardId);

        // Insert new ones
        if (selectedUsers.length > 0) {
          const visibilityRows = selectedUsers.map(uid => ({
            card_id: cardId,
            user_id: uid,
          }));
          const { error } = await supabase
            .from('dashboard_card_visibility')
            .insert(visibilityRows);
          if (error) throw error;
        }
      } else {
        // If public, clear visibility table for this card
        await supabase
          .from('dashboard_card_visibility')
          .delete()
          .eq('card_id', cardId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dynamic-cards'] });
      toast.success(editCard ? 'Carte modifiée' : 'Carte créée');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error('Erreur: ' + err.message);
    },
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCard ? 'Modifier la carte' : 'Nouvelle carte'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom de la carte" />
          </div>

          <div>
            <Label>Icône</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Couleur de fond</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBgColor(opt.value)}
                  className={`w-8 h-8 rounded-full ${opt.preview} ${bgColor === opt.value ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Type de contenu</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texte</SelectItem>
                <SelectItem value="list">Liste</SelectItem>
                <SelectItem value="video">Vidéo</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(contentType === 'text' || contentType === 'list') && (
            <div>
              <Label>{contentType === 'list' ? 'Éléments (un par ligne)' : 'Contenu'}</Label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={contentType === 'list' ? 'Élément 1\nÉlément 2\nÉlément 3' : 'Votre texte ici...'}
                rows={4}
              />
            </div>
          )}

          {contentType === 'video' && (
            <div>
              <Label>URL de la vidéo (YouTube, Vimeo ou MP4)</Label>
              <Input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          )}

          {contentType === 'document' && (
            <div>
              <Label>Fichier (PDF, JPEG, etc.)</Label>
              <div className="space-y-2">
                {fileName && (
                  <p className="text-sm text-muted-foreground">Fichier actuel : {fileName}</p>
                )}
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.mp4"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>
          )}

          {/* Visibility section */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Visibilité</Label>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <span className="text-sm">Public (visible par tout le monde)</span>
            </div>

            {!isPublic && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3">
                {users?.map(u => (
                  <label key={u.user_id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedUsers.includes(u.user_id)}
                      onCheckedChange={() => toggleUser(u.user_id)}
                    />
                    <span className="text-sm">{u.full_name || u.email || 'Sans nom'}</span>
                  </label>
                ))}
                {(!users || users.length === 0) && (
                  <p className="text-sm text-muted-foreground">Aucun utilisateur inscrit</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {editCard ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDynamicCardDialog;
