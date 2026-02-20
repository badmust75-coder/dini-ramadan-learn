/**
 * GenericTimelinePage — Page élève générique avec design timeline vertical
 * Utilisé par: Vocabulaire, Lecture Coran, Darija, Dictionnaire, Dhikr, Hadiths, Histoires des Prophètes
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Video, Volume2, BookOpen, ChevronRight, Play, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ModuleConfig {
  gradientFrom: string;
  gradientTo: string;
  dotColor: string;
  lineColor: string;
  badgeColor: string;
  title: string;
  titleArabic?: string;
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  vocabulaire: {
    gradientFrom: '#059669', gradientTo: '#10b981',
    dotColor: '#10b981', lineColor: '#6ee7b7',
    badgeColor: '#059669', title: 'Vocabulaire', titleArabic: 'المفردات',
  },
  'lecture-coran': {
    gradientFrom: '#0f766e', gradientTo: '#14b8a6',
    dotColor: '#14b8a6', lineColor: '#5eead4',
    badgeColor: '#0f766e', title: 'Lecture du Coran', titleArabic: 'تلاوة القرآن',
  },
  darija: {
    gradientFrom: '#c2410c', gradientTo: '#f97316',
    dotColor: '#f97316', lineColor: '#fdba74',
    badgeColor: '#c2410c', title: 'Darija (Marocain)', titleArabic: 'الدارجة المغربية',
  },
  dictionnaire: {
    gradientFrom: '#3730a3', gradientTo: '#6366f1',
    dotColor: '#6366f1', lineColor: '#a5b4fc',
    badgeColor: '#3730a3', title: 'Dictionnaire', titleArabic: 'القاموس',
  },
  dhikr: {
    gradientFrom: '#be185d', gradientTo: '#ec4899',
    dotColor: '#ec4899', lineColor: '#f9a8d4',
    badgeColor: '#be185d', title: 'Dhikr', titleArabic: 'الذكر',
  },
  hadiths: {
    gradientFrom: '#b45309', gradientTo: '#f59e0b',
    dotColor: '#f59e0b', lineColor: '#fde68a',
    badgeColor: '#b45309', title: 'Hadiths', titleArabic: 'الأحاديث النبوية',
  },
  'histoires-prophetes': {
    gradientFrom: '#6d28d9', gradientTo: '#8b5cf6',
    dotColor: '#8b5cf6', lineColor: '#c4b5fd',
    badgeColor: '#6d28d9', title: 'Histoires des Prophètes', titleArabic: 'قصص الأنبياء',
  },
};

const GenericTimelinePage = () => {
  const location = useLocation();
  // Extract slug from path: /module/vocabulaire -> vocabulaire
  const moduleSlug = location.pathname.replace('/module/', '').replace('/', '');
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const config = MODULE_CONFIGS[moduleSlug || ''] || {
    gradientFrom: '#1e40af', gradientTo: '#2563eb',
    dotColor: '#3b82f6', lineColor: '#93c5fd',
    badgeColor: '#1e40af', title: 'Module', titleArabic: '',
  };

  const { data: module } = useQuery({
    queryKey: ['generic-module', moduleSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('builtin_path', `/module/${moduleSlug}`)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['generic-module-cards', module?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_cards')
        .select('*')
        .eq('module_id', module!.id)
        .order('section', { nullsFirst: true })
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!module?.id,
  });

  const { data: cardContents = [] } = useQuery({
    queryKey: ['generic-module-contents', module?.id],
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

  // Group cards by section
  const sections = (cards as any[]).reduce((acc: Record<string, any[]>, card: any) => {
    const key = card.section || '_root';
    if (!acc[key]) acc[key] = [];
    acc[key].push(card);
    return acc;
  }, {});

  const selectedContents = selectedCard
    ? (cardContents as any[]).filter((c: any) => c.card_id === selectedCard.id)
    : [];

  const hasContent = (cardId: string) =>
    (cardContents as any[]).some((c: any) => c.card_id === cardId);

  return (
    <AppLayout title={config.title}>
      <div className="p-4 space-y-0 pb-28">
        {/* Header */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})` }}
        >
          <p className="font-arabic text-xl text-white/70 mb-1">{module?.title_arabic || config.titleArabic}</p>
          <h1 className="text-2xl font-bold text-white">{module?.title || config.title}</h1>
          <p className="text-white/70 text-sm mt-1">{module?.description || ''}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
              {cards.length} leçon{cards.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="h-14 flex-1 bg-muted animate-pulse rounded-xl" />
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-lg">Aucune leçon disponible</p>
            <p className="text-sm mt-2">L'enseignant ajoutera bientôt du contenu.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {Object.entries(sections).map(([section, sectionCards], sectionIdx) => {
              const isLastSection = sectionIdx === Object.keys(sections).length - 1;
              return (
                <div key={section}>
                  {/* Section header */}
                  {section !== '_root' && (
                    <div className="flex items-center gap-3 py-4 px-2">
                      <div
                        className="ml-6 px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-md"
                        style={{ background: config.badgeColor }}
                      >
                        {section}
                      </div>
                    </div>
                  )}

                  {/* Timeline items */}
                  <div className="relative">
                    {(sectionCards as any[]).map((card: any, cardIdx: number) => {
                      const isLast = cardIdx === (sectionCards as any[]).length - 1 && isLastSection;
                      const hasMedia = hasContent(card.id);

                      return (
                        <div key={card.id} className="relative flex items-start group">
                          {/* Timeline line */}
                          {!isLast && (
                            <div
                              className="absolute left-[15px] top-8 bottom-0 w-0.5"
                              style={{ background: `linear-gradient(to bottom, ${config.lineColor}, #e2e8f0)` }}
                            />
                          )}

                          {/* Circle dot */}
                          <div className="shrink-0 mt-3 z-10">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white"
                              style={{ background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.dotColor})` }}
                            >
                              {hasMedia && <Play className="h-3 w-3 text-white fill-white" />}
                            </div>
                          </div>

                          {/* Card */}
                          <button
                            onClick={() => setSelectedCard(card)}
                            className={cn(
                              'flex-1 ml-4 mb-1 text-left rounded-xl px-4 py-3.5 border transition-all duration-200',
                              'bg-card border-border hover:shadow-md active:scale-[0.98]',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground leading-snug">{card.title}</p>
                                {card.title_arabic && (
                                  <p className="font-arabic text-sm text-muted-foreground mt-0.5">{card.title_arabic}</p>
                                )}
                                {card.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {hasMedia && (
                                  <span className="flex items-center gap-1">
                                    {(cardContents as any[]).filter((c: any) => c.card_id === card.id).map((c: any) => {
                                      if (c.content_type === 'video') return <Video key={c.id} className="h-3.5 w-3.5 text-blue-500" />;
                                      if (c.content_type === 'audio') return <Volume2 key={c.id} className="h-3.5 w-3.5 text-teal-500" />;
                                      if (c.content_type === 'pdf') return <FileText key={c.id} className="h-3.5 w-3.5 text-red-500" />;
                                      if (c.content_type === 'image') return <ImageIcon key={c.id} className="h-3.5 w-3.5 text-blue-400" />;
                                      return null;
                                    })}
                                  </span>
                                )}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedCard && (
        <Dialog open onOpenChange={() => setSelectedCard(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="space-y-1">
                {selectedCard.section && (
                  <Badge style={{ background: config.badgeColor, color: 'white' }} className="text-xs">
                    {selectedCard.section}
                  </Badge>
                )}
                {selectedCard.title_arabic && (
                  <p className="font-arabic text-lg text-muted-foreground">{selectedCard.title_arabic}</p>
                )}
                <DialogTitle className="text-lg leading-snug">{selectedCard.title}</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {selectedCard.description && (
                <div className="bg-muted/50 border border-border rounded-xl p-4">
                  <p className="text-sm text-foreground">{selectedCard.description}</p>
                </div>
              )}

              {selectedContents.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ressources</h4>
                  {selectedContents.map((content: any) => (
                    <div key={content.id} className="border border-border rounded-xl overflow-hidden">
                      {content.content_type === 'video' && (
                        <video src={content.file_url} controls className="w-full rounded-xl" />
                      )}
                      {content.content_type === 'audio' && (
                        <div className="p-4 flex items-center gap-3 bg-muted/30">
                          <Volume2 className="h-5 w-5 text-teal-500 shrink-0" />
                          <audio src={content.file_url} controls className="flex-1 h-8" />
                        </div>
                      )}
                      {(content.content_type === 'pdf' || content.content_type === 'document') && (
                        <a
                          href={content.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{content.file_name}</p>
                            <p className="text-xs text-muted-foreground">Ouvrir le PDF</p>
                          </div>
                        </a>
                      )}
                      {content.content_type === 'image' && (
                        <img src={content.file_url} alt={content.file_name} className="w-full object-cover max-h-64" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucune ressource pour cette leçon.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
};

export default GenericTimelinePage;
