import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, Video, Image, File, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AdminNouraniaContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingLessonId, setUploadingLessonId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: lessons = [] } = useQuery({
    queryKey: ['admin-nourania-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lessons')
        .select('*')
        .order('lesson_number');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [], refetch: refetchContents } = useQuery({
    queryKey: ['admin-nourania-contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lesson_content')
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

  const handleUpload = useCallback(async (lessonId: number, files: FileList) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsUploading(true);
    setUploadingLessonId(lessonId);

    try {
      const existingCount = contents.filter(c => c.lesson_id === lessonId).length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `lesson-${lessonId}/${uniqueName}`;

        console.log(`Uploading file: ${file.name} to ${filePath}`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('nourania-content')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          toast.error(`Erreur upload: ${uploadError.message}`);
          throw uploadError;
        }

        console.log('Upload success:', uploadData);

        const { data: urlData } = supabase.storage
          .from('nourania-content')
          .getPublicUrl(filePath);

        console.log('Public URL:', urlData.publicUrl);

        const { data: insertData, error: insertError } = await supabase
          .from('nourania_lesson_content')
          .insert({
            lesson_id: lessonId,
            content_type: getContentType(file),
            file_url: urlData.publicUrl,
            file_name: file.name,
            display_order: existingCount + i,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (insertError) {
          console.error('DB insert error:', insertError);
          toast.error(`Erreur enregistrement: ${insertError.message}`);
          throw insertError;
        }

        console.log('DB insert success:', insertData);
      }

      await refetchContents();
      toast.success(`${files.length} fichier(s) téléversé(s) avec succès ✅`);
    } catch (error) {
      console.error('Upload process error:', error);
    } finally {
      setIsUploading(false);
      setUploadingLessonId(null);
    }
  }, [user, contents, refetchContents]);

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;

      // Extract storage path from public URL
      try {
        const url = new URL(content.file_url);
        const bucketPath = url.pathname.split('/object/public/nourania-content/');
        if (bucketPath[1]) {
          const decodedPath = decodeURIComponent(bucketPath[1]);
          console.log('Deleting storage file:', decodedPath);
          await supabase.storage.from('nourania-content').remove([decodedPath]);
        }
      } catch (e) {
        console.warn('Could not delete storage file:', e);
      }

      const { error } = await supabase
        .from('nourania_lesson_content')
        .delete()
        .eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-nourania-contents'] });
      queryClient.invalidateQueries({ queryKey: ['nourania-lesson-contents'] });
      toast.success('Contenu supprimé');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Gestion du contenu Nourania</h3>
      <p className="text-sm text-muted-foreground">
        Téléversez des vidéos, PDF ou images pour chaque leçon. Les fichiers persistent jusqu'à suppression manuelle.
      </p>

      <div className="space-y-3">
        {lessons.map((lesson) => {
          const lessonContents = contents.filter(c => c.lesson_id === lesson.id);
          const isThisLessonUploading = isUploading && uploadingLessonId === lesson.id;

          return (
            <Card key={lesson.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Leçon {lesson.lesson_number}</p>
                    <p className="text-sm text-muted-foreground">{lesson.title_french}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="video/*,application/pdf,image/*,.doc,.docx"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleUpload(lesson.id, e.target.files);
                        }
                        e.target.value = '';
                      }}
                      disabled={isThisLessonUploading}
                    />
                    <Button
                      size="sm"
                      disabled={isThisLessonUploading}
                      className="gap-2 pointer-events-none"
                    >
                      {isThisLessonUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isThisLessonUploading ? 'Envoi...' : 'Ajouter'}
                    </Button>
                  </div>
                </div>

                {lessonContents.length > 0 && (
                  <div className="space-y-2">
                    {lessonContents.map((content) => (
                      <div
                        key={content.id}
                        className="flex items-center justify-between bg-muted/50 rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getContentIcon(content.content_type)}
                          <span className="text-sm truncate">{content.file_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {content.content_type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(content.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {lessonContents.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun contenu</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminNouraniaContent;
