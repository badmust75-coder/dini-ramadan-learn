import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, Volume2, FileText, Video, Image as ImageIcon, File } from 'lucide-react';

const AlphabetPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLetter, setSelectedLetter] = useState<any>(null);

  const { data: letters = [], isLoading } = useQuery({
    queryKey: ['alphabet-letters-page'],
    queryFn: async () => {
      const { data, error } = await supabase.from('alphabet_letters').select('*').order('id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [] } = useQuery({
    queryKey: ['alphabet-contents-page'],
    queryFn: async () => {
      const { data, error } = await supabase.from('alphabet_content').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['user-alphabet-progress-page', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('user_alphabet_progress').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const toggleValidatedMutation = useMutation({
    mutationFn: async ({ letterId, isValidated }: { letterId: number; isValidated: boolean }) => {
      if (!user) throw new Error('Non connecté');
      const existing = (progress as any[]).find((p: any) => p.letter_id === letterId);
      if (existing) {
        const { error } = await supabase.from('user_alphabet_progress').update({ is_validated: isValidated }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_alphabet_progress').insert({ user_id: user.id, letter_id: letterId, is_validated: isValidated });
        if (error) throw error;
      }
    },
    onSuccess: (_, { isValidated }) => {
      queryClient.invalidateQueries({ queryKey: ['user-alphabet-progress-page', user?.id] });
      toast.success(isValidated ? '✅ Lettre apprise !' : 'Marqué comme non appris');
    },
  });

  const validatedCount = (progress as any[]).filter((p: any) => p.is_validated).length;
  const selectedContents = selectedLetter ? contents.filter((c: any) => c.letter_id === selectedLetter.id) : [];

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
      case 'audio': return <Volume2 className="h-4 w-4 text-primary" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-blue-500" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout title="Alphabet Arabe">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg">Alphabet Arabe</h2>
            <p className="text-sm text-muted-foreground font-arabic">الحروف العربية</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{validatedCount}/{letters.length}</p>
            <p className="text-xs text-muted-foreground">lettres apprises</p>
          </div>
        </div>

        {/* Letters grid */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {[...Array(28)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {letters.map((letter: any, index: number) => {
              const letterProgress = (progress as any[]).find((p: any) => p.letter_id === letter.id);
              const isValidated = letterProgress?.is_validated ?? false;
              const hasContent = contents.some((c: any) => c.letter_id === letter.id);

              return (
                <button
                  key={letter.id}
                  onClick={() => setSelectedLetter(letter)}
                  className={`relative flex flex-col items-center justify-between rounded-2xl p-2 border transition-all active:scale-95 min-h-[80px] ${
                    isValidated
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700'
                      : 'bg-card border-border hover:shadow-md'
                  }`}
                >
                  <span className="absolute top-1 left-1.5 text-[9px] text-muted-foreground">#{index + 1}</span>
                  {isValidated && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-2 w-2 text-white" />
                    </span>
                  )}
                  {hasContent && !isValidated && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                  <div className="flex-1 flex items-center justify-center">
                    <span className="font-arabic text-3xl text-foreground">{letter.letter_arabic}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground truncate w-full text-center">
                    {letter.name_french}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Letter detail dialog */}
        {selectedLetter && (
          <Dialog open onOpenChange={() => setSelectedLetter(null)}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-arabic text-4xl">{selectedLetter.letter_arabic}</span>
                  <div>
                    <p className="text-lg font-bold">{selectedLetter.name_french}</p>
                    <p className="text-sm text-muted-foreground font-arabic">{selectedLetter.name_arabic}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Positions */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Formes de la lettre</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Isolée', value: selectedLetter.position_isolated },
                      { label: 'Début', value: selectedLetter.position_initial },
                      { label: 'Milieu', value: selectedLetter.position_medial },
                      { label: 'Fin', value: selectedLetter.position_final },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted/50 rounded-xl p-2 text-center">
                        <p className="font-arabic text-2xl text-foreground">{value || '—'}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio */}
                {selectedLetter.audio_url && (
                  <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-primary" />
                    <audio src={selectedLetter.audio_url} controls className="flex-1 h-8" />
                  </div>
                )}

                {/* Multimedia content */}
                {selectedContents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ressources</h4>
                    {selectedContents.map((content: any) => (
                      <div key={content.id} className="border border-border rounded-xl overflow-hidden">
                        {content.content_type === 'video' && (
                          <video src={content.file_url} controls className="w-full" controlsList="nodownload" />
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
                      </div>
                    ))}
                  </div>
                )}

                {selectedContents.length === 0 && !selectedLetter.audio_url && (
                  <p className="text-center text-muted-foreground text-sm py-2">Aucun contenu multimédia disponible.</p>
                )}

                {/* Mark as learned */}
                {(() => {
                  const letterProgress = (progress as any[]).find((p: any) => p.letter_id === selectedLetter.id);
                  const isValidated = letterProgress?.is_validated ?? false;
                  return (
                    <Button
                      className="w-full gap-2"
                      variant={isValidated ? 'outline' : 'default'}
                      onClick={() => toggleValidatedMutation.mutate({ letterId: selectedLetter.id, isValidated: !isValidated })}
                    >
                      {isValidated ? <><Check className="h-4 w-4 text-green-500" /> Apprise ✅</> : '✏️ Marquer comme apprise'}
                    </Button>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
};

export default AlphabetPage;
