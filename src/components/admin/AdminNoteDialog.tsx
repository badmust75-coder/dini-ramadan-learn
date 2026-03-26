import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, X, FileText, Image, Video, File } from 'lucide-react';

interface AdminNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultModule?: string;
}

const MODULE_OPTIONS = [
  { key: 'ramadan', label: 'Ramadan' },
  { key: 'students', label: 'Élèves' },
  { key: 'prayer', label: 'Prière' },
  { key: 'homework', label: 'Cahier de texte' },
  { key: 'nourania', label: 'Nourania' },
  { key: 'messages', label: 'Messages' },
  { key: 'attendance', label: 'Registre de présence' },
  { key: 'users', label: 'Utilisateurs' },
  { key: 'sourates', label: 'Sourates' },
  { key: 'alphabet', label: 'Alphabet' },
  { key: 'invocations', label: 'Invocations' },
  { key: 'grammaire', label: 'Grammaire' },
  { key: 'allah-names', label: '99 Noms d\'Allah' },
  { key: 'vocabulaire', label: 'Vocabulaire' },
  { key: 'lecture-coran', label: 'Lecture du Coran' },
  { key: 'darija', label: 'Darija' },
  { key: 'dictionnaire', label: 'Dictionnaire' },
  { key: 'dhikr', label: 'Dhikr' },
  { key: 'hadiths', label: 'Hadiths' },
  { key: 'histoires-prophetes', label: 'Histoires des Prophètes' },
];

const AdminNoteDialog = ({ open, onOpenChange, defaultModule }: AdminNoteDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [moduleKey, setModuleKey] = useState(defaultModule || '');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleSave = async () => {
    if (!moduleKey || (!content.trim() && !file)) {
      toast.error('Veuillez sélectionner un module et ajouter du contenu ou un fichier');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;

      if (file) {
        const ext = file.name.split('.').pop();
        const filePath = `${moduleKey}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('admin-notes')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('admin-notes')
          .getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
        attachmentName = file.name;
        attachmentType = file.type;
      }

      const { error } = await (supabase as any)
        .from('admin_notes')
        .insert({
          module_key: moduleKey,
          content: content.trim() || null,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_type: attachmentType,
          is_public: isPublic,
          created_by: user.id,
        });
      if (error) throw error;

      toast.success('Note ajoutée !');
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      setContent('');
      setFile(null);
      setIsPublic(false);
      setModuleKey(defaultModule || '');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📝 Nouvelle note rapide</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Module selector */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Module</Label>
            <Select value={moduleKey} onValueChange={setModuleKey}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un module..." />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text content */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Contenu (texte)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écrire une note..."
              rows={3}
            />
          </div>

          {/* File attachment */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Pièce jointe</Label>
            {file ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                {getFileIcon(file.type)}
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Image, vidéo, PDF, Word, Excel...</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.xlsx,.xls,.pptx,.ppt,.txt,.zip"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />
              </label>
            )}
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Visible par les élèves</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? '⏳ Enregistrement...' : '✅ Ajouter la note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNoteDialog;
