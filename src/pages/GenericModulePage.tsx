/**
 * GenericModulePage — Page générique avec grille de cartes pour tous les modules dynamiques
 * (Grammaire, Vocabulaire, Darija, Dictionnaire, Dhikr, Histoires prophètes, Hadiths, etc.)
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, Video, Volume2, Image as ImageIcon, File } from 'lucide-react';

const GenericModulePage = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const { data: module } = useQuery({
    queryKey: ['learning-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase.from('learning_modules').select('*').eq('id', moduleId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['module-cards', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_cards')
        .select('*')
        .eq('module_id', moduleId!)
        .order('section', { nullsFirst: true })
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });

  const { data: cardContents = [] } = useQuery({
    queryKey: ['module-card-contents', moduleId],
    queryFn: async () => {
      if (!cards.length) return [];
      const cardIds = cards.map((c: any) => c.id);
      const { data, error } = await supabase
        .from('module_card_content')
        .select('*')
        .in('card_id', cardIds)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: cards.length > 0,
  });

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
      case 'audio': return <Volume2 className="h-4 w-4 text-primary" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-blue-500" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  // Group cards by section
  const sections = cards.reduce((acc: Record<string, any[]>, card: any) => {
    const key = card.section || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(card);
    return acc;
  }, {});

  const selectedContents = selectedCard ? cardContents.filter((c: any) => c.card_id === selectedCard.id) : [];

  return (
    <AppLayout title={module?.title || 'Module'}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          {module?.title_arabic && <p className="font-arabic text-xl text-gold">{module.title_arabic}</p>}
          <h1 className="text-xl font-bold text-foreground">{module?.title}</h1>
          {module?.description && <p className="text-sm text-muted-foreground mt-1">{module.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">{cards.length} carte(s)</p>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucun contenu disponible</p>
            <p className="text-sm mt-1">L'enseignant ajoutera bientôt des ressources.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(sections).map(([section, sectionCards]) => (
              <div key={section}>
                {section && (
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                    {section}
                  </h3>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {(sectionCards as any[]).map((card: any, index: number) => {
                    const hasContent = cardContents.some((c: any) => c.card_id === card.id);
                    return (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="relative flex flex-col items-center justify-between rounded-2xl p-3 border border-border bg-card hover:shadow-md active:scale-95 transition-all min-h-[90px]"
                      >
                        <span className="absolute top-1.5 left-2 text-[10px] text-muted-foreground">#{index + 1}</span>
                        {hasContent && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                        )}
                        <div className="flex-1 flex items-center justify-center">
                          {card.image_url ? (
                            <img src={card.image_url} alt={card.title} className="w-12 h-12 object-contain" />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="w-full">
                          {card.title_arabic && (
                            <p className="font-arabic text-xs text-muted-foreground text-center">{card.title_arabic}</p>
                          )}
                          <p className="text-[11px] font-semibold text-foreground text-center truncate">{card.title}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Card detail dialog */}
        {selectedCard && (
          <Dialog open onOpenChange={() => setSelectedCard(null)}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedCard.title_arabic && (
                    <span className="font-arabic text-lg block text-muted-foreground">{selectedCard.title_arabic}</span>
                  )}
                  {selectedCard.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedCard.section && (
                  <Badge variant="outline">{selectedCard.section}</Badge>
                )}
                {selectedCard.description && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className="text-sm text-foreground">{selectedCard.description}</p>
                  </div>
                )}
                {selectedContents.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ressources</h4>
                    {selectedContents.map((content: any) => (
                      <div key={content.id} className="border border-border rounded-xl overflow-hidden">
                        {content.content_type === 'video' && (
                          <video src={content.file_url} controls className="w-full" />
                        )}
                        {content.content_type === 'image' && (
                          <img src={content.file_url} alt={content.file_name} className="w-full object-cover max-h-64" />
                        )}
                        {(content.content_type === 'pdf' || content.content_type === 'document') && (
                          <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-muted/50">
                            <FileText className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium">{content.file_name}</span>
                          </a>
                        )}
                        {content.content_type === 'audio' && (
                          <div className="p-3 flex items-center gap-3">
                            <Volume2 className="h-5 w-5 text-primary" />
                            <audio src={content.file_url} controls className="flex-1 h-8" />
                          </div>
                        )}
                        {!['video','image','pdf','document','audio'].includes(content.content_type) && (
                          <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-muted/50">
                            {getContentIcon(content.content_type)}
                            <span className="text-sm">{content.file_name}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">Aucun contenu disponible pour cette carte.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
};

export default GenericModulePage;
