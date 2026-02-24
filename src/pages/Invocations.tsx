import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sun, Moon, CloudMoon, Home, Church, Plane, Shirt, Bath, UtensilsCrossed, CloudRain, Heart, BedDouble, Droplets, PawPrint, Activity, Hand, BookOpen, Loader2, Check, Video, FileText, Volume2, Image as ImageIcon, X, Send, Clock, Lock, XCircle } from 'lucide-react';

// Default icon mapping by title keyword
const getDefaultIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('matin')) return Sun;
  if (t.includes('soir')) return Moon;
  if (t.includes('nuit')) return CloudMoon;
  if (t.includes('maison')) return Home;
  if (t.includes('mosquée') || t.includes('mosque')) return Church;
  if (t.includes('voyage')) return Plane;
  if (t.includes('habit')) return Shirt;
  if (t.includes('toilet') || t.includes('ablution')) return Bath;
  if (t.includes('nourriture') || t.includes('repas')) return UtensilsCrossed;
  if (t.includes('pluie')) return CloudRain;
  if (t.includes('mariage')) return Heart;
  if (t.includes('sommeil') || t.includes('dormir')) return BedDouble;
  if (t.includes('ablutions')) return Droplets;
  if (t.includes('animal')) return PawPrint;
  if (t.includes('maladie')) return Activity;
  if (t.includes('décès') || t.includes('mort')) return Hand;
  return BookOpen;
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'quotidienne': return 'bg-teal-500';
    case 'lieu': return 'bg-blue-500';
    case 'événement': return 'bg-purple-500';
    case 'nature': return 'bg-green-500';
    default: return 'bg-primary';
  }
};

const getCategoryLabel = (category: string | null) => {
  switch (category) {
    case 'quotidienne': return 'Quotidienne';
    case 'lieu': return 'Lieu';
    case 'événement': return 'Événement';
    case 'nature': return 'Nature';
    default: return 'Général';
  }
};

interface InvocationDetailDialogProps {
  invocation: any;
  contents: any[];
  progress: any;
  validationRequest: any;
  onClose: () => void;
  onMarkMemorized: (invocationId: number, isMemorized: boolean) => void;
  onRequestValidation: (invocationId: number) => void;
  isRequestingValidation: boolean;
}

const InvocationDetailDialog = ({ invocation, contents, progress, validationRequest, onClose, onMarkMemorized, onRequestValidation, isRequestingValidation }: InvocationDetailDialogProps) => {
  const isMemorized = progress?.is_memorized ?? false;
  const isValidated = progress?.is_validated ?? false;
  const isRefused = validationRequest?.status === 'refused';

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{invocation.title_french}</span>
            {invocation.category && (
              <Badge className={`${getCategoryColor(invocation.category)} text-white text-xs`}>
                {getCategoryLabel(invocation.category)}
              </Badge>
            )}
          </DialogTitle>
          {invocation.title_arabic && (
            <p className="font-arabic text-xl text-right text-muted-foreground">{invocation.title_arabic}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Arabic content */}
          {invocation.content_arabic && (
            <div className="bg-muted/30 rounded-xl p-4 text-right">
              <p className="font-arabic text-xl leading-loose text-foreground">{invocation.content_arabic}</p>
            </div>
          )}

          {/* French content */}
          {invocation.content_french && (
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-sm text-muted-foreground italic">{invocation.content_french}</p>
            </div>
          )}

          {/* Media contents */}
          {contents.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ressources</h4>
              {contents.map((content) => (
                <div key={content.id} className="border border-border rounded-xl overflow-hidden">
                  {content.content_type === 'video' && (
                    <div className="aspect-video">
                      <video src={content.file_url} controls className="w-full h-full" controlsList="nodownload" />
                    </div>
                  )}
                  {content.content_type === 'image' && (
                    <img src={content.file_url} alt={content.file_name} className="w-full object-cover max-h-64" />
                  )}
                  {(content.content_type === 'pdf' || content.content_type === 'document') && (
                    <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
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
                  {!['video', 'image', 'pdf', 'document', 'audio'].includes(content.content_type) && (
                    <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                      {getContentIcon(content.content_type)}
                      <span className="text-sm">{content.file_name}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {contents.length === 0 && !invocation.content_arabic && !invocation.content_french && (
            <p className="text-center text-muted-foreground text-sm py-4">Aucun contenu disponible pour le moment.</p>
          )}

          {/* Memorized button */}
          <Button
            className="w-full gap-2"
            variant={isMemorized ? 'outline' : 'default'}
            onClick={() => onMarkMemorized(invocation.id, !isMemorized)}
          >
            {isMemorized ? (
              <><Check className="h-4 w-4 text-green-500" /> Mémorisé ✅</>
            ) : (
              <><Hand className="h-4 w-4" /> Marquer comme mémorisé</>
            )}
          </Button>

          {/* Refused indicator */}
          {isRefused && !isValidated && (
            <div className="flex items-center justify-center gap-2 py-2 text-destructive font-medium text-sm">
              <XCircle className="h-5 w-5" />
              Refusé — réessayez
            </div>
          )}

          {/* Validation request button */}
          {isValidated ? (
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 dark:text-green-400 font-medium">
              <Check className="h-5 w-5" />
              Validé par l'enseignant ✅
            </div>
          ) : validationRequest?.status === 'pending' ? (
            <div className="flex items-center justify-center gap-2 py-2 text-amber-600 dark:text-amber-400 font-medium">
              <Clock className="h-5 w-5" />
              Validation en attente...
            </div>
          ) : (
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => onRequestValidation(invocation.id)}
              disabled={isRequestingValidation}
            >
              <Send className="h-4 w-4" />
              Demander la validation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Invocations = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedInvocation, setSelectedInvocation] = useState<any>(null);

  const { data: invocations = [], isLoading } = useQuery({
    queryKey: ['invocations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invocations')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [] } = useQuery({
    queryKey: ['invocation-contents-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invocation_content')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['user-invocation-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_invocation_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch validation requests
  const { data: validationRequests = [] } = useQuery({
    queryKey: ['user-invocation-validation-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('invocation_validation_requests')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime subscription for validation requests & progress
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('invocation-unlock-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invocation_validation_requests',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-invocation-validation-requests', user.id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_invocation_progress',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-invocation-progress', user.id] });
        queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const toggleMemorizedMutation = useMutation({
    mutationFn: async ({ invocationId, isMemorized }: { invocationId: number; isMemorized: boolean }) => {
      if (!user) throw new Error('Non connecté');
      const existing = progress.find((p: any) => p.invocation_id === invocationId);
      if (existing) {
        const { error } = await supabase
          .from('user_invocation_progress')
          .update({ is_memorized: isMemorized })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_invocation_progress')
          .insert({ user_id: user.id, invocation_id: invocationId, is_memorized: isMemorized });
        if (error) throw error;
      }
    },
    onSuccess: (_, { isMemorized }) => {
      queryClient.invalidateQueries({ queryKey: ['user-invocation-progress', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      toast.success(isMemorized ? '✅ Invocation mémorisée !' : 'Marqué comme non mémorisé');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const requestValidationMutation = useMutation({
    mutationFn: async (invocationId: number) => {
      if (!user) throw new Error('Non connecté');
      // Delete any previous refused request for this invocation
      await supabase
        .from('invocation_validation_requests')
        .delete()
        .eq('user_id', user.id)
        .eq('invocation_id', invocationId)
        .eq('status', 'refused');
      const { error } = await supabase
        .from('invocation_validation_requests')
        .insert({ user_id: user.id, invocation_id: invocationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-invocation-validation-requests', user?.id] });
      toast.success('📩 Demande de validation envoyée !');
    },
    onError: () => toast.error('Erreur lors de l\'envoi de la demande'),
  });

  // Build the set of validated invocation IDs for determining unlock state
  const validatedInvocationIds = new Set(
    progress.filter((p: any) => p.is_validated).map((p: any) => p.invocation_id)
  );

  // Determine which cards are unlocked:
  // Card at index 0 is always unlocked.
  // Card at index N is unlocked if invocation at index N-1 is validated.
  const isCardUnlocked = (index: number) => {
    if (isAdmin) return true; // Admin sees all unlocked
    if (index === 0) return true;
    const prevInvocation = invocations[index - 1];
    if (!prevInvocation) return false;
    return validatedInvocationIds.has(prevInvocation.id);
  };

  const getCardValidationRequest = (invocationId: number) => {
    // Return the most recent relevant request
    const reqs = validationRequests.filter((r: any) => r.invocation_id === invocationId);
    const pending = reqs.find((r: any) => r.status === 'pending');
    if (pending) return pending;
    const refused = reqs.find((r: any) => r.status === 'refused');
    if (refused) return refused;
    return reqs[0] || null;
  };

  const validatedCount = progress.filter((p: any) => p.is_validated).length;

  const handleCardClick = (invocation: any, index: number) => {
    if (!isCardUnlocked(index)) {
      toast.info('🔒 Cette invocation sera débloquée après validation de l\'invocation précédente par l\'admin.');
      return;
    }
    setSelectedInvocation(invocation);
  };

  return (
    <AppLayout title="Invocations">
      <div className="p-4 space-y-4">
        {/* Header stats */}
        <div className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg">Mes Invocations</h2>
            <p className="text-sm text-muted-foreground font-arabic">أذكاري</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{validatedCount}/{invocations.length}</p>
            <p className="text-xs text-muted-foreground">mémorisées</p>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {invocations.map((invocation, index) => {
              const Icon = getDefaultIcon(invocation.title_french);
              const invProgress = progress.find((p: any) => p.invocation_id === invocation.id);
              const isValidated = invProgress?.is_validated ?? false;
              const unlocked = isCardUnlocked(index);
              const valReq = getCardValidationRequest(invocation.id);
              const isPending = valReq?.status === 'pending';
              const isRefused = valReq?.status === 'refused' && !isValidated;

              return (
                <button
                  key={invocation.id}
                  onClick={() => handleCardClick(invocation, index)}
                  className={`relative flex flex-col items-center justify-between bg-card border border-border rounded-2xl p-3 transition-all min-h-[110px] ${
                    unlocked
                      ? 'hover:shadow-md active:scale-95'
                      : 'opacity-50 grayscale cursor-not-allowed'
                  }`}
                >
                  {/* Number badge */}
                  <span className="absolute top-1.5 left-2 text-[10px] text-muted-foreground font-semibold">
                    #{index + 1}
                  </span>

                  {/* Top-right indicator */}
                  {!unlocked ? (
                    <span className="absolute top-1.5 right-1.5">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </span>
                  ) : isValidated ? (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  ) : isPending ? (
                    <span className="absolute top-1.5 right-1.5">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </span>
                  ) : isRefused ? (
                    <span className="absolute top-1.5 right-1.5">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </span>
                  ) : null}

                  {/* Icon or image */}
                  <div className="mt-3 flex-1 flex items-center justify-center">
                    {invocation.image_url ? (
                      <img src={invocation.image_url} alt={invocation.title_french} className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-xs font-semibold text-foreground text-center mt-2 leading-tight">
                    {invocation.title_french}
                  </p>

                  {/* Refused label */}
                  {isRefused && unlocked && (
                    <span className="text-[9px] text-destructive font-medium mt-0.5">Refusé</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {invocations.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Hand className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune invocation disponible.</p>
          </div>
        )}
      </div>

      {selectedInvocation && (
        <InvocationDetailDialog
          invocation={selectedInvocation}
          contents={contents.filter((c: any) => c.invocation_id === selectedInvocation.id)}
          progress={progress.find((p: any) => p.invocation_id === selectedInvocation.id)}
          validationRequest={getCardValidationRequest(selectedInvocation.id)}
          onClose={() => setSelectedInvocation(null)}
          onMarkMemorized={(id, mem) => toggleMemorizedMutation.mutate({ invocationId: id, isMemorized: mem })}
          onRequestValidation={(id) => requestValidationMutation.mutate(id)}
          isRequestingValidation={requestValidationMutation.isPending}
        />
      )}
    </AppLayout>
  );
};

export default Invocations;
