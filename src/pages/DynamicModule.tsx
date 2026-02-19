import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileText, Video, Music, Image, Download, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const CONTENT_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  video: Video,
  audio: Music,
  image: Image,
};

const DynamicModule = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['learning-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('id', moduleId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  const { data: contents, isLoading: contentsLoading } = useQuery({
    queryKey: ['module-content', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_content')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });

  const isLoading = moduleLoading || contentsLoading;

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url;
  };

  const renderContent = (item: any) => {
    const Icon = CONTENT_ICONS[item.content_type] || FileText;

    if (item.content_type === 'video') {
      if (isYouTubeUrl(item.file_url)) {
        return (
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe
              src={getYouTubeEmbedUrl(item.file_url)}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        );
      }
      return (
        <video controls className="w-full rounded-xl">
          <source src={item.file_url} />
        </video>
      );
    }

    if (item.content_type === 'audio') {
      return (
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
          <Music className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.title}</p>
            <audio controls className="w-full mt-2">
              <source src={item.file_url} />
            </audio>
          </div>
        </div>
      );
    }

    if (item.content_type === 'pdf') {
      return (
        <div className="aspect-[4/5] rounded-xl overflow-hidden border border-border">
          <iframe src={item.file_url} className="w-full h-full" />
        </div>
      );
    }

    if (item.content_type === 'image') {
      return (
        <img src={item.file_url} alt={item.title} className="w-full rounded-xl" />
      );
    }

    return (
      <a href={item.file_url} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir le fichier
        </Button>
      </a>
    );
  };

  return (
    <AppLayout title={module?.title || 'Module'}>
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : module ? (
          <>
            <div className="text-center py-4">
              <p className="font-arabic text-2xl text-gold mb-1">{module.title_arabic}</p>
              <h1 className="text-2xl font-bold text-foreground">{module.title}</h1>
              {module.description && (
                <p className="text-muted-foreground mt-1">{module.description}</p>
              )}
            </div>

            {contents && contents.length > 0 ? (
              <div className="space-y-4">
                {contents.map((item: any) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = CONTENT_ICONS[item.content_type] || FileText; return <Icon className="h-5 w-5 text-primary" />; })()}
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                      </div>
                      {renderContent(item)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun contenu disponible pour le moment.</p>
                  <p className="text-sm text-muted-foreground mt-1">L'enseignant ajoutera bientôt des ressources.</p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground">Module introuvable</p>
        )}
      </div>
    </AppLayout>
  );
};

export default DynamicModule;
