import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import ContentUploadTabs from './ContentUploadTabs';
import ContentItemCard, { ContentType } from './ContentItemCard';

const AdminNouraniaContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  const { data: lessons = [] } = useQuery({
    queryKey: ['admin-nourania-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('nourania_lessons').select('*').order('lesson_number');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [], refetch: refetchContents } = useQuery({
    queryKey: ['admin-nourania-contents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('nourania_lesson_content').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const getContentTypeFromFile = (file: File): string => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'document';
  };

  const getDefaultTitle = (contentType: string, fileName: string): string => {
    switch (contentType) {
      case 'youtube': return 'Vidéo YouTube';
      case 'audio': return 'Audio';
      default: return fileName;
    }
  };

  const handleUploadFile = useCallback(async (lessonId: number, file: File) => {
    if (!user?.id) { toast.error('Vous devez être connecté'); return; }
    setIsUploading(true);
    try {
      const existingCount = contents.filter(c => c.lesson_id === lessonId).length;
      const ext = file.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `lesson-${lessonId}/${uniqueName}`;
      const { error: uploadError } = await supabase.storage.from('nourania-content').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) { toast.error(`Erreur upload: ${uploadError.message}`); return; }
      const { data: urlData } = supabase.storage.from('nourania-content').getPublicUrl(filePath);
      const contentType = getContentTypeFromFile(file);
      const { error: insertError } = await supabase.from('nourania_lesson_content').insert({
        lesson_id: lessonId, content_type: contentType, file_url: urlData.publicUrl,
        file_name: getDefaultTitle(contentType, file.name), display_order: existingCount, uploaded_by: user.id,
      });
      if (insertError) { toast.error(`Erreur: ${insertError.message}`); return; }
      await refetchContents();
      toast.success('Fichier téléversé ✅');
    } catch (error) { console.error('Upload error:', error); }
    finally { setIsUploading(false); }
  }, [user, contents, refetchContents]);

  const handleAddYoutube = useCallback(async (lessonId: number, embedUrl: string) => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      const existingCount = contents.filter(c => c.lesson_id === lessonId).length;
      const { error } = await supabase.from('nourania_lesson_content').insert({
        lesson_id: lessonId, content_type: 'youtube', file_url: embedUrl,
        file_name: 'Vidéo YouTube', display_order: existingCount, uploaded_by: user.id,
      });
      if (error) { toast.error(error.message); return; }
      await refetchContents();
      toast.success('Lien YouTube ajouté ✅');
    } catch (error) { console.error(error); }
    finally { setIsUploading(false); }
  }, [user, contents, refetchContents]);

  const handleUploadAudio = useCallback(async (lessonId: number, file: File) => {
    if (!user?.id) { toast.error('Vous devez être connecté'); return; }
    setIsUploading(true);
    try {
      const existingCount = contents.filter(c => c.lesson_id === lessonId).length;
      const ext = file.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `lesson-${lessonId}/${uniqueName}`;
      const { error: uploadError } = await supabase.storage.from('nourania-content').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) { toast.error(`Erreur upload: ${uploadError.message}`); return; }
      const { data: urlData } = supabase.storage.from('nourania-content').getPublicUrl(filePath);
      const { error: insertError } = await supabase.from('nourania_lesson_content').insert({
        lesson_id: lessonId, content_type: 'audio', file_url: urlData.publicUrl,
        file_name: 'Audio', display_order: existingCount, uploaded_by: user.id,
      });
      if (insertError) { toast.error(`Erreur: ${insertError.message}`); return; }
      await refetchContents();
      toast.success('Audio téléversé ✅');
    } catch (error) { console.error(error); }
    finally { setIsUploading(false); }
  }, [user, contents, refetchContents]);

  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from('nourania_lesson_content').update({ file_name: title }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-nourania-contents'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;
      if (content.content_type !== 'youtube') {
        try {
          const url = new URL(content.file_url);
          const bucketPath = url.pathname.split('/object/public/nourania-content/');
          if (bucketPath[1]) await supabase.storage.from('nourania-content').remove([decodeURIComponent(bucketPath[1])]);
        } catch (e) { console.warn('Could not delete storage file:', e); }
      }
      const { error } = await supabase.from('nourania_lesson_content').delete().eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-nourania-contents'] });
      queryClient.invalidateQueries({ queryKey: ['nourania-lesson-contents'] });
      toast.success('Contenu supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const mapContentType = (type: string): ContentType => {
    if (type === 'youtube') return 'youtube';
    if (type === 'audio') return 'audio';
    if (type === 'video') return 'video';
    if (type === 'image') return 'image';
    if (type === 'pdf') return 'pdf';
    if (type === 'document') return 'document';
    return 'fichier';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Gestion du contenu Nourania</h3>
      <p className="text-sm text-muted-foreground">
        Ajoutez des fichiers, vidéos YouTube ou audio pour chaque leçon.
      </p>
      <div className="space-y-3">
        {lessons.map((lesson) => {
          const lessonContents = contents.filter(c => c.lesson_id === lesson.id);
          return (
            <Card key={lesson.id}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-bold">Leçon {lesson.lesson_number}</p>
                  <p className="text-sm text-muted-foreground">{lesson.title_french}</p>
                </div>
                {lessonContents.length > 0 && (
                  <div className="space-y-1.5">
                    {lessonContents.map((content) => (
                      <ContentItemCard
                        key={content.id}
                        id={content.id}
                        title={content.file_name}
                        contentType={mapContentType(content.content_type)}
                        url={content.file_url}
                        onDelete={(id) => setDeleteContentId(id)}
                        onUpdateTitle={(id, title) => updateTitleMutation.mutate({ id, title })}
                        deleteDisabled={deleteMutation.isPending}
                      />
                    ))}
                  </div>
                )}
                {lessonContents.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun contenu</p>}
                <ContentUploadTabs
                  onUploadFile={(file) => handleUploadFile(lesson.id, file)}
                  onAddYoutubeLink={(url) => handleAddYoutube(lesson.id, url)}
                  onUploadAudio={(file) => handleUploadAudio(lesson.id, file)}
                  isUploading={isUploading}
                />
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

export default AdminNouraniaContent;
