import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, List, Video, BookOpen, Star, Heart, Bell, Calendar, Image, Music, File, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, List, Video, BookOpen, Star, Heart, Bell, Calendar, Image, Music,
};

const Ressources = () => {
  const { data: cards, isLoading } = useQuery({
    queryKey: ['user-dynamic-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_cards')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const renderCardContent = (card: any) => {
    switch (card.content_type) {
      case 'text':
        return <p className="text-sm whitespace-pre-wrap">{card.content || 'Aucun contenu'}</p>;
      case 'list':
        return (
          <ul className="space-y-1">
            {card.content?.split('\n').filter(Boolean).map((item: string, i: number) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        );
      case 'video':
        if (card.content) {
          const isYoutube = card.content.includes('youtube') || card.content.includes('youtu.be');
          if (isYoutube) {
            const videoId = card.content.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
            return (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen />
              </div>
            );
          }
          return <video src={card.content} controls className="w-full rounded-lg" />;
        }
        return null;
      case 'document':
        return card.file_url ? (
          <Button variant="outline" size="sm" asChild>
            <a href={card.file_url} target="_blank" rel="noopener noreferrer">
              <File className="h-4 w-4 mr-1" />
              {card.file_name || 'Ouvrir le document'}
            </a>
          </Button>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <AppLayout title="Ressources">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Ressources</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : cards && cards.length > 0 ? (
          <div className="space-y-4">
            {cards.map(card => {
              const Icon = ICON_MAP[card.icon] || FileText;
              return (
                <Card key={card.id} className={`overflow-hidden`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${card.bg_color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-foreground">{card.title}</h3>
                    </div>
                    {renderCardContent(card)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune ressource disponible</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Ressources;
