import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Lock, Play, FileText, Image as ImageIcon, File, ChevronDown, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import NouraniaUnlockDialog from '@/components/nourania/NouraniaUnlockDialog';

const Nourania = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fireSuccess } = useConfetti();
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; lessonNumber: number; lessonId: number } | null>(null);

  // Fetch lessons
  const { data: lessons = [] } = useQuery({
    queryKey: ['nourania-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lessons')
        .select('*')
        .order('lesson_number');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lesson content
  const { data: lessonContents = [] } = useQuery({
    queryKey: ['nourania-lesson-contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lesson_content')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ['nourania-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_nourania_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's pending validation requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['nourania-validation-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('nourania_validation_requests')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Realtime: listen for admin approval to trigger confetti + unlock
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('nourania-validation-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'nourania_validation_requests',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new && (payload.new as any).status === 'approved') {
          queryClient.invalidateQueries({ queryKey: ['nourania-progress'] });
          queryClient.invalidateQueries({ queryKey: ['nourania-validation-requests'] });
          fireSuccess();
          toast.success('Leçon validée par l\'enseignant ! 🎉');

          // Find next lesson to show unlock dialog
          const approvedLessonId = (payload.new as any).lesson_id;
          const currentIndex = lessons.findIndex(l => l.id === approvedLessonId);
          const nextLesson = lessons[currentIndex + 1];
          if (nextLesson) {
            setTimeout(() => {
              setUnlockDialog({
                open: true,
                lessonNumber: nextLesson.lesson_number,
                lessonId: nextLesson.id,
              });
            }, 1500);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, lessons, queryClient, fireSuccess]);

  const validatedCount = userProgress.filter(p => p.is_validated).length;
  const totalLessons = lessons.length || 17;
  const progressPercentage = Math.round((validatedCount / totalLessons) * 100);

  const isLessonValidated = (lessonId: number) =>
    userProgress.some(p => p.lesson_id === lessonId && p.is_validated);

  const isLessonPendingValidation = (lessonId: number) =>
    pendingRequests.some(p => p.lesson_id === lessonId && p.status === 'pending');

  const hasLessonBeenStarted = (lessonId: number) =>
    userProgress.some(p => p.lesson_id === lessonId) || pendingRequests.some(p => p.lesson_id === lessonId);

  const isLessonUnlocked = (index: number) => {
    if (index === 0) return true;
    const previousLesson = lessons[index - 1];
    return previousLesson ? isLessonValidated(previousLesson.id) : false;
  };

  // Submit validation request (instead of auto-validating)
  const submitValidationMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      if (!user?.id) throw new Error('Non connecté');

      // Check if already requested
      const { data: existing } = await supabase
        .from('nourania_validation_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) throw new Error('Demande déjà envoyée');

      const { error } = await supabase
        .from('nourania_validation_requests')
        .insert({ user_id: user.id, lesson_id: lessonId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nourania-validation-requests'] });
      toast.success('Demande de validation envoyée à l\'enseignant ! 📩');
    },
    onError: (err: Error) => {
      if (err.message === 'Demande déjà envoyée') {
        toast.info('Demande déjà en cours de traitement');
      } else {
        toast.error('Erreur lors de l\'envoi de la demande');
      }
    },
  });

  const handleUnlockConfirm = () => {
    if (unlockDialog) {
      setExpandedLesson(unlockDialog.lessonId);
      setUnlockDialog(null);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const handleLessonClick = (lesson: typeof lessons[0], index: number) => {
    if (!isLessonUnlocked(index)) return;
    setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id);
  };

  // Get moon color classes based on lesson status
  const getMoonColors = (lessonId: number, index: number) => {
    const validated = isLessonValidated(lessonId);
    const pending = isLessonPendingValidation(lessonId);
    const started = hasLessonBeenStarted(lessonId);
    const unlocked = isLessonUnlocked(index);

    if (validated) {
      // Green with amber bold border
      return 'bg-green-500 text-white ring-2 ring-amber-400 ring-offset-1';
    }
    if (pending || started) {
      // Orange pastel (started but not validated)
      return 'bg-orange-200 dark:bg-orange-300 text-orange-800';
    }
    if (!unlocked) {
      return 'bg-green-100 dark:bg-green-200 text-green-600';
    }
    // Default unlocked but not started: amber
    return 'bg-amber-400 dark:bg-amber-500 text-amber-900';
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">القاعدة النورانية</h1>
          <p className="text-muted-foreground">Al-Qaida An-Nouraniya - {totalLessons} Leçons</p>
        </div>

        {/* Progress */}
        <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre progression</span>
            <span className="text-sm font-bold text-primary">{validatedCount}/{totalLessons} leçons</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% complété</p>
        </div>

        {/* Lessons List */}
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const isValidated = isLessonValidated(lesson.id);
            const isPending = isLessonPendingValidation(lesson.id);
            const unlocked = isLessonUnlocked(index);
            const isExpanded = expandedLesson === lesson.id;
            const contents = lessonContents.filter(c => c.lesson_id === lesson.id);

            return (
              <div
                key={lesson.id}
                className={cn(
                  'module-card rounded-2xl overflow-hidden transition-all duration-300 animate-slide-up',
                  isValidated && 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20',
                  isPending && 'border-orange-300/30 bg-orange-50/20 dark:bg-orange-950/10',
                  !unlocked && 'opacity-60',
                  isExpanded && 'shadow-elevated'
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Lesson Header */}
                <div
                  onClick={() => handleLessonClick(lesson, index)}
                  className={cn(
                    'w-full p-4 flex items-center gap-4',
                    unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                  )}
                >
                  {/* Moon badge with dynamic color */}
                  <div className="relative">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      getMoonColors(lesson.id, index)
                    )}>
                      {isValidated ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
                    </div>
                    {!unlocked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center">
                        <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-arabic text-lg text-foreground truncate">{lesson.title_arabic}</p>
                    <p className="text-sm text-muted-foreground truncate">{lesson.title_french}</p>
                  </div>

                  {/* Status */}
                  {isValidated ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1 shrink-0">
                      <Check className="h-3 w-3" /> Validée
                    </span>
                  ) : isPending ? (
                    <span className="text-xs text-orange-500 font-medium shrink-0">
                      ⏳ En attente
                    </span>
                  ) : unlocked ? (
                    <ChevronDown className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform shrink-0',
                      isExpanded && 'rotate-180'
                    )} />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && unlocked && (
                  <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {/* Content files */}
                    {contents.length > 0 ? (
                      <div className="space-y-3">
                        {contents.map((content) => (
                          <div key={content.id}>
                            {content.content_type === 'video' && (
                              <div className="aspect-video rounded-xl overflow-hidden bg-foreground/5">
                                <video
                                  src={content.file_url}
                                  controls
                                  className="w-full h-full"
                                  preload="metadata"
                                />
                              </div>
                            )}
                            {content.content_type === 'pdf' && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {getContentIcon('pdf')}
                                  <span>{content.file_name}</span>
                                </div>
                                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                                  <iframe
                                    src={content.file_url}
                                    title={content.file_name}
                                    className="w-full h-full"
                                  />
                                </div>
                              </div>
                            )}
                            {content.content_type === 'image' && (
                              <div className="rounded-xl overflow-hidden">
                                <img
                                  src={content.file_url}
                                  alt={content.file_name}
                                  className="w-full h-auto rounded-xl"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            {content.content_type === 'document' && (
                              <a
                                href={content.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                              >
                                {getContentIcon('document')}
                                <span className="text-sm">{content.file_name}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4 italic">
                        Contenu à venir...
                      </p>
                    )}

                    {/* Validate button - sends request to admin instead of auto-validating */}
                    {!isValidated && !isPending && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          submitValidationMutation.mutate(lesson.id);
                        }}
                        disabled={submitValidationMutation.isPending}
                        className="w-full gap-2 bg-gradient-to-r from-gold to-gold-dark text-primary hover:from-gold-dark hover:to-gold"
                      >
                        <Check className="h-4 w-4" />
                        Valider cette leçon
                      </Button>
                    )}

                    {isPending && (
                      <div className="text-center py-3 text-sm text-orange-600 dark:text-orange-400 font-medium">
                        ⏳ En attente de validation par l'enseignant
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlock Dialog */}
      {unlockDialog && (
        <NouraniaUnlockDialog
          open={unlockDialog.open}
          onOpenChange={(open) => !open && setUnlockDialog(null)}
          onConfirm={handleUnlockConfirm}
          lessonNumber={unlockDialog.lessonNumber}
        />
      )}
    </AppLayout>
  );
};

export default Nourania;
