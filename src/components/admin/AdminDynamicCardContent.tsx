import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, FileText, Video, List, Loader2, ExternalLink } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';

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

interface Props {
  card: DashboardCard;
  onBack: () => void;
}

const AdminDynamicCardContent = ({ card, onBack }: Props) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleteFileOpen, setDeleteFileOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${card.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('admin-content')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('admin-content')
        .getPublicUrl(filePath);

      await supabase
        .from('dashboard_cards')
        .update({ file_url: publicUrl, file_name: file.name })
        .eq('id', card.id);

      queryClient.invalidateQueries({ queryKey: ['admin-dynamic-cards'] });
      toast.success('Fichier ajouté');
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async () => {
    try {
      await supabase
        .from('dashboard_cards')
        .update({ file_url: null, file_name: null })
        .eq('id', card.id);
      queryClient.invalidateQueries({ queryKey: ['admin-dynamic-cards'] });
      toast.success('Fichier supprimé');
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    }
    setDeleteFileOpen(false);
  };

  const renderContent = () => {
    switch (card.content_type) {
      case 'text':
        return (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="whitespace-pre-wrap text-sm">{card.content || 'Aucun contenu'}</p>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-2">
            {card.content?.split('\n').filter(Boolean).map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                <List className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            )) || <p className="text-sm text-muted-foreground">Aucun élément</p>}
          </div>
        );
      case 'video':
        if (card.content) {
          const isYoutube = card.content.includes('youtube') || card.content.includes('youtu.be');
          const isVimeo = card.content.includes('vimeo');
          if (isYoutube || isVimeo) {
            let embedUrl = card.content;
            if (isYoutube) {
              const videoId = card.content.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
              embedUrl = `https://www.youtube.com/embed/${videoId}`;
            }
            return (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
              </div>
            );
          }
          return (
            <video src={card.content} controls className="w-full rounded-lg" />
          );
        }
        return <p className="text-sm text-muted-foreground">Aucune vidéo</p>;
      case 'document':
        return card.file_url ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{card.file_name}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={card.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteFileOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>

      <h2 className="text-xl font-bold">{card.title}</h2>

      {renderContent()}

      {/* Upload zone */}
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          Glissez-déposez ou cliquez pour ajouter un fichier
        </p>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.mp4"
          onChange={handleFileUpload}
          disabled={uploading}
          className="max-w-xs mx-auto"
        />
        {uploading && <Loader2 className="h-4 w-4 animate-spin mx-auto mt-2" />}
      </div>

      <ConfirmDeleteDialog
        open={deleteFileOpen}
        onOpenChange={setDeleteFileOpen}
        onConfirm={handleDeleteFile}
        title="Supprimer le fichier"
        description="Voulez-vous vraiment supprimer ce fichier ?"
      />
    </div>
  );
};

export default AdminDynamicCardContent;
