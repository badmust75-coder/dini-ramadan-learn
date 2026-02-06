import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Play, HelpCircle, Moon, Star, Lock, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import UnlockConfirmDialog from '@/components/ramadan/UnlockConfirmDialog';

interface RamadanDay {
  id: number;
  day_number: number;
  theme: string | null;
  video_url: string | null;
  pdf_url: string | null;
}

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
}

interface UserProgress {
  id: string;
  day_id: number;
  video_watched: boolean;
  quiz_completed: boolean;
  pdf_read: boolean;
}

const Ramadan = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fireSuccess } = useConfetti();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'quiz'>('video');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [pendingDayToOpen, setPendingDayToOpen] = useState<RamadanDay | null>(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  // Update current hour every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch ramadan settings
  const { data: settings } = useQuery({
    queryKey: ['ramadan-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch all days
  const { data: days = [] } = useQuery({
    queryKey: ['ramadan-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_days')
        .select('*')
        .order('day_number');
      if (error) throw error;
      return data as RamadanDay[];
    },
  });

  // Fetch quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ['ramadan-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_quizzes')
        .select('*');
      if (error) throw error;
      return data.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
      })) as Quiz[];
    },
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ['ramadan-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_ramadan_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user?.id,
  });

  // Calculate overall progress
  const completedDays = userProgress.filter(p => p.quiz_completed).length;
  const progressPercentage = Math.round((completedDays / 30) * 100);

  const getDayProgress = (dayId: number) => {
    return userProgress.find(p => p.day_id === dayId);
  };

  const getQuizForDay = (dayId: number) => {
    return quizzes.find(q => q.day_id === dayId);
  };

  // Check if it's after 16h (4 PM)
  const isAfter16h = currentHour >= 16;

  // Check if a day is unlocked
  const isDayUnlocked = (dayNumber: number) => {
    // Day 1 requires admin to enable start
    if (dayNumber === 1) {
      return settings?.start_enabled === true;
    }
    
    // For other days: previous quiz must be completed AND it must be after 16h
    const previousDay = days.find(d => d.day_number === dayNumber - 1);
    if (!previousDay) return false;
    
    const previousProgress = getDayProgress(previousDay.id);
    const previousQuizCompleted = previousProgress?.quiz_completed === true;
    
    // Must have completed previous quiz AND be after 16h
    return previousQuizCompleted && isAfter16h;
  };

  // Check if day can potentially unlock (quiz done but waiting for 16h)
  const isWaitingFor16h = (dayNumber: number) => {
    if (dayNumber === 1) return false;
    
    const previousDay = days.find(d => d.day_number === dayNumber - 1);
    if (!previousDay) return false;
    
    const previousProgress = getDayProgress(previousDay.id);
    const previousQuizCompleted = previousProgress?.quiz_completed === true;
    
    return previousQuizCompleted && !isAfter16h;
  };

  // Check if a day has content (video and quiz)
  const dayHasContent = (day: RamadanDay) => {
    const hasVideo = !!day.video_url;
    const hasQuiz = !!getQuizForDay(day.id);
    return hasVideo && hasQuiz;
  };

  // Mark progress mutation
  const markProgressMutation = useMutation({
    mutationFn: async ({ dayId, field }: { dayId: number; field: 'video_watched' | 'quiz_completed' }) => {
      if (!user?.id) throw new Error('Non connecté');
      
      const existingProgress = userProgress.find(p => p.day_id === dayId);
      
      if (existingProgress) {
        const { error } = await supabase
          .from('user_ramadan_progress')
          .update({ [field]: true, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_ramadan_progress')
          .insert({
            user_id: user.id,
            day_id: dayId,
            [field]: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-progress'] });
    },
  });

  const handleDayClick = (day: RamadanDay) => {
    const isUnlocked = isDayUnlocked(day.day_number);
    const hasContent = dayHasContent(day);
    const waitingFor16h = isWaitingFor16h(day.day_number);
    
    // Day 1 not enabled by admin
    if (day.day_number === 1 && !settings?.start_enabled) {
      toast.error('Le calendrier n\'est pas encore ouvert. Patience !');
      return;
    }
    
    // Waiting for 16h
    if (waitingFor16h) {
      toast.info('Ce jour sera disponible à partir de 16h. Bsaha ftourek ! 🌙');
      return;
    }
    
    if (!isUnlocked) {
      toast.error('Complétez d\'abord le quiz du jour précédent');
      return;
    }
    
    if (!hasContent) {
      toast.info('Contenu pas encore disponible pour ce jour');
      return;
    }
    
    // For days after day 1, show confirmation dialog
    if (day.day_number > 1 && expandedDay !== day.id) {
      setPendingDayToOpen(day);
      return;
    }
    
    openDay(day);
  };

  const openDay = (day: RamadanDay) => {
    setExpandedDay(expandedDay === day.id ? null : day.id);
    setActiveTab('video');
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
  };

  const handleConfirmOpen = () => {
    if (pendingDayToOpen) {
      openDay(pendingDayToOpen);
      setPendingDayToOpen(null);
    }
  };

  const handleSubmitQuiz = (quiz: Quiz, dayId: number) => {
    if (selectedAnswer === null) return;
    
    const correct = selectedAnswer === quiz.correct_option;
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      // Fire confetti for correct answer
      fireSuccess();
      // Mark quiz as completed
      markProgressMutation.mutate({ dayId, field: 'quiz_completed' });
      toast.success('Bravo ! Bonne réponse ! 🎉');
    } else {
      toast.error('Réponse incorrecte, réessayez !');
      // Reset for retry
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
      }, 2000);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header with Islamic Design */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Moon className="h-6 w-6 text-gold" />
            <h1 className="text-2xl font-bold text-foreground font-arabic">رمضان كريم</h1>
            <Star className="h-5 w-5 text-gold" />
          </div>
          <p className="text-muted-foreground">30 Jours de Spiritualité</p>
        </div>

        {/* Progress Card */}
        <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in bg-gradient-to-br from-primary/5 to-gold/5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre parcours spirituel</span>
            <span className="text-sm font-bold text-gold">{completedDays}/30 jours</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% du Ramadan complété</p>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {days.map((day) => {
            const progress = getDayProgress(day.id);
            const isCompleted = progress?.quiz_completed;
            const isExpanded = expandedDay === day.id;
            const isUnlocked = isDayUnlocked(day.day_number);
            const hasContent = dayHasContent(day);

            const waitingFor16h = isWaitingFor16h(day.day_number);
            const notStarted = day.day_number === 1 && !settings?.start_enabled;

            return (
              <button
                key={day.id}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200 relative',
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md'
                    : waitingFor16h
                    ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white cursor-wait'
                    : notStarted || !isUnlocked
                    ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                    : !hasContent
                    ? 'bg-muted/30 text-muted-foreground/50'
                    : isExpanded
                    ? 'bg-gradient-to-br from-gold to-gold-dark text-primary shadow-elevated'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : waitingFor16h ? (
                  <Clock className="h-4 w-4" />
                ) : notStarted || !isUnlocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <span>{day.day_number}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-green-600" />
            <span>Complété</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
              <Clock className="h-2 w-2 text-white" />
            </div>
            <span>Dispo à 16h</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
              <Lock className="h-2 w-2" />
            </div>
            <span>Verrouillé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted" />
            <span>Disponible</span>
          </div>
        </div>

        {/* Expanded Day Content */}
        {expandedDay && (
          <div className="module-card rounded-2xl overflow-hidden animate-fade-in">
            {(() => {
              const day = days.find(d => d.id === expandedDay);
              if (!day) return null;
              
              const quiz = getQuizForDay(day.id);
              const progress = getDayProgress(day.id);

              return (
                <>
                  {/* Day Header */}
                  <div className="p-4 bg-gradient-to-r from-primary to-royal-dark text-primary-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                        <span className="font-bold">{day.day_number}</span>
                      </div>
                      <div>
                        <h3 className="font-bold">Jour {day.day_number}</h3>
                        {day.theme && <p className="text-sm opacity-80">{day.theme}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b">
                    <button
                      onClick={() => setActiveTab('video')}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                        activeTab === 'video'
                          ? 'border-gold text-gold'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Play className="h-4 w-4" />
                      Vidéo
                      {progress?.video_watched && <Check className="h-3 w-3 text-green-500" />}
                    </button>
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                        activeTab === 'quiz'
                          ? 'border-gold text-gold'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <HelpCircle className="h-4 w-4" />
                      Quiz
                      {progress?.quiz_completed && <Check className="h-3 w-3 text-green-500" />}
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {/* Video Tab */}
                    {activeTab === 'video' && day.video_url && (
                      <div className="space-y-4">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black">
                          <video
                            src={day.video_url}
                            controls
                            className="w-full h-full"
                            onEnded={() => {
                              if (!progress?.video_watched) {
                                markProgressMutation.mutate({ dayId: day.id, field: 'video_watched' });
                              }
                            }}
                          />
                        </div>
                        {!progress?.video_watched && (
                          <Button
                            onClick={() => markProgressMutation.mutate({ dayId: day.id, field: 'video_watched' })}
                            className="w-full bg-gradient-to-r from-gold to-gold-dark text-primary"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Marquer comme vue
                          </Button>
                        )}
                        {progress?.video_watched && !progress?.quiz_completed && (
                          <Button
                            onClick={() => setActiveTab('quiz')}
                            className="w-full"
                          >
                            <ChevronRight className="h-4 w-4 mr-2" />
                            Passer au quiz
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Quiz Tab */}
                    {activeTab === 'quiz' && quiz && (
                      <div className="space-y-4">
                        {progress?.quiz_completed ? (
                          <div className="text-center py-8 space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                              <Check className="h-8 w-8 text-green-500" />
                            </div>
                            <h4 className="font-semibold text-foreground">Quiz complété !</h4>
                            <p className="text-sm text-muted-foreground">
                              Vous avez déjà validé ce quiz. Le jour suivant est déverrouillé.
                            </p>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-semibold text-foreground">{quiz.question}</h4>
                            
                            <RadioGroup
                              value={selectedAnswer?.toString()}
                              onValueChange={(val) => {
                                if (!showResult) {
                                  setSelectedAnswer(parseInt(val));
                                }
                              }}
                            >
                              {quiz.options.map((option, idx) => (
                                <div 
                                  key={idx} 
                                  className={cn(
                                    'flex items-center space-x-3 p-3 rounded-lg border transition-colors',
                                    showResult && idx === quiz.correct_option && 'border-green-500 bg-green-50',
                                    showResult && selectedAnswer === idx && idx !== quiz.correct_option && 'border-destructive bg-destructive/10',
                                    !showResult && 'hover:bg-muted/50'
                                  )}
                                >
                                  <RadioGroupItem 
                                    value={idx.toString()} 
                                    id={`option-${idx}`}
                                    disabled={showResult}
                                  />
                                  <Label 
                                    htmlFor={`option-${idx}`} 
                                    className={cn(
                                      'flex-1 cursor-pointer',
                                      showResult && idx === quiz.correct_option && 'text-green-700 font-medium',
                                      showResult && selectedAnswer === idx && idx !== quiz.correct_option && 'text-destructive'
                                    )}
                                  >
                                    {option}
                                    {showResult && idx === quiz.correct_option && ' ✓'}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>

                            {!showResult && (
                              <Button
                                onClick={() => handleSubmitQuiz(quiz, day.id)}
                                disabled={selectedAnswer === null}
                                className="w-full bg-gradient-to-r from-primary to-royal-dark"
                              >
                                <ChevronRight className="h-4 w-4 mr-2" />
                                Valider ma réponse
                              </Button>
                            )}

                            {showResult && !isCorrect && (
                              <div className="text-center text-sm text-destructive">
                                Réessayez dans un moment...
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
        {/* Unlock Confirmation Dialog */}
        <UnlockConfirmDialog
          open={!!pendingDayToOpen}
          onOpenChange={(open) => !open && setPendingDayToOpen(null)}
          onConfirm={handleConfirmOpen}
          dayNumber={pendingDayToOpen?.day_number || 0}
        />
      </div>
    </AppLayout>
  );
};

export default Ramadan;
