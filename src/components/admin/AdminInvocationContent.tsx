import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, Video, Image, File, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';

const AdminInvocationContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingInvocationId, setUploadingInvocationId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  const { data: invocations = [] } = useQuery({
    queryKey: ['admin-invocations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invocations')
        .select('*')
        .order('id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [], refetch: refetchContents } = useQuery({
    queryKey: ['admin-invocation-contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invocation_content')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const getContentType = (file: File): string => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'document';
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const handleUpload = useCallback(async (invocationId: number, files: FileList) => {
    if (!user?.id) { toast.error('Vous devez être connecté'); return; }
    setIsUploading(true);
    setUploadingInvocationId(invocationId);
    try {
      const existingCount = contents.filter(c => c.invocation_id === invocationId).length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `invocation-${invocationId}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('invocation-content')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) { toast.error(`Erreur upload: ${uploadError.message}`); throw uploadError; }

        const { data: urlData } = supabase.storage.from('invocation-content').getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('invocation_content')
          .insert({
            invocation_id: invocationId,
            content_type: getContentType(file),
            file_url: urlData.publicUrl,
            file_name: file.name,
            display_order: existingCount + i,
            uploaded_by: user.id,
          });
        if (insertError) { toast.error(`Erreur: ${insertError.message}`); throw insertError; }
      }
      await refetchContents();
      toast.success(`${files.length} fichier(s) téléversé(s) ✅`);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadingInvocationId(null);
    }
  }, [user, contents, refetchContents]);

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;
      try {
        const url = new URL(content.file_url);
        const bucketPath = url.pathname.split('/object/public/invocation-content/');
        if (bucketPath[1]) {
          await supabase.storage.from('invocation-content').remove([decodeURIComponent(bucketPath[1])]);
        }
      } catch (e) { console.warn('Could not delete storage file:', e); }
      const { error } = await supabase.from('invocation_content').delete().eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invocation-contents'] });
      toast.success('Contenu supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Gestion du contenu Invocations</h3>
      <p className="text-sm text-muted-foreground">
        Téléversez des vidéos, PDF ou images pour chaque invocation.
      </p>
      <div className="space-y-3">
        {invocations.map((invocation) => {
          const invContents = contents.filter(c => c.invocation_id === invocation.id);
          const isThisUploading = isUploading && uploadingInvocationId === invocation.id;
          return (
            <Card key={invocation.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{invocation.title_french}</p>
                    <p className="text-sm text-muted-foreground font-arabic">{invocation.title_arabic}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="file" multiple
                      accept="video/*,application/pdf,image/*,.doc,.docx"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => { if (e.target.files?.length) handleUpload(invocation.id, e.target.files); e.target.value = ''; }}
                      disabled={isThisUploading}
                    />
                    <Button size="sm" disabled={isThisUploading} className="gap-2 pointer-events-none">
                      {isThisUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isThisUploading ? 'Envoi...' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
                {invContents.length > 0 && (
                  <div className="space-y-2">
                    {invContents.map((content) => (
                      <div key={content.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getContentIcon(content.content_type)}
                          <span className="text-sm truncate">{content.file_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{content.content_type}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteContentId(content.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {invContents.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun contenu</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ConfirmDeleteDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
        onConfirm={() => { if (deleteContentId) deleteMutation.mutate(deleteContentId); setDeleteContentId(null); }}
        description="Ce contenu sera supprimé définitivement."
      />
    </div>
  );
};

export default AdminInvocationContent;
