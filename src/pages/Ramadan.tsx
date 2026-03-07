import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Play, Moon, Star, Lock, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import UnlockConfirmDialog from '@/components/ramadan/UnlockConfirmDialog';
import RamadanDayDialog from '@/components/ramadan/RamadanDayDialog';
import FastingTracker from '@/components/ramadan/FastingTracker';

interface RamadanDay {
  id: number;
  day_number: number;
  theme: string | null;
  video_url: string | null;
  pdf_url: string | null;
}

interface DayVideo {
  id: string;
  day_id: number;
  video_url: string;
  file_name: string | null;
  display_order: number;
}

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
  correct_options?: number[];
  explanation: string | null;
  question_order: number;
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
  const [openDay, setOpenDay] = useState<RamadanDay | null>(null);
  const [pendingDayToOpen, setPendingDayToOpen] = useState<RamadanDay | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = setInterval(() => setNow(new Date()), 60000);
    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) { clearInterval(interval); interval = null; }
      } else {
        setNow(new Date());
        if (!interval) interval = setInterval(() => setNow(new Date()), 60000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const { data: settings } = useQuery({
    queryKey: ['ramadan-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ramadan_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const { data: days = [] } = useQuery({
    queryKey: ['ramadan-days'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ramadan_days').select('*').order('day_number');
      if (error) throw error;
      return data as RamadanDay[];
    },
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['ramadan-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ramadan_quizzes').select('*').order('question_order');
      if (error) throw error;
      return data.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string),
        correct_options: Array.isArray((q as any).correct_options) ? (q as any).correct_options : [],
      })) as Quiz[];
    },
  });

  const { data: dayVideos = [] } = useQuery({
    queryKey: ['ramadan-day-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_day_videos')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as DayVideo[];
    },
  });

  const { data: userProgress = [] } = useQuery({
    queryKey: ['ramadan-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_ramadan_progress').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user?.id,
  });

  const { data: quizResponses = [] } = useQuery({
    queryKey: ['ramadan-quiz-responses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('quiz_responses').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const completedDays = userProgress.filter(p => p.quiz_completed).length;
  const progressPercentage = Math.round((completedDays / 30) * 100);
  const getDayProgress = (dayId: number) => userProgress.find(p => p.day_id === dayId);
  const getVideosForDay = (dayId: number) => dayVideos.filter(v => v.day_id === dayId);
  const getQuizzesForDay = (dayId: number) => quizzes.filter(q => q.day_id === dayId);

  const getDayUnlockTime = (dayNumber: number): Date | null => {
    if (!settings?.started_at) return null;
    const startDate = new Date(settings.started_at);
    if (dayNumber === 1) return startDate;
    const unlockDate = new Date(startDate);
    unlockDate.setDate(unlockDate.getDate() + (dayNumber - 1));
    unlockDate.setHours(16, 0, 0, 0);
    return unlockDate;
  };

  const isDayUnlocked = (dayNumber: number) => {
    if (!settings?.start_enabled) return false;
    if (dayNumber === 1) return true;
    const previousDay = days.find(d => d.day_number === dayNumber - 1);
    if (!previousDay) return false;
    const previousProgress = getDayProgress(previousDay.id);
    if (!previousProgress?.quiz_completed) return false;
    const unlockTime = getDayUnlockTime(dayNumber);
    if (!unlockTime) return false;
    return now >= unlockTime;
  };

  const isWaitingForTime = (dayNumber: number) => {
    if (dayNumber === 1 || !settings?.start_enabled) return false;
    const previousDay = days.find(d => d.day_number === dayNumber - 1);
    if (!previousDay) return false;
    const previousProgress = getDayProgress(previousDay.id);
    if (!previousProgress?.quiz_completed) return false;
    const unlockTime = getDayUnlockTime(dayNumber);
    if (!unlockTime) return false;
    return now < unlockTime;
  };

  const dayHasContent = (day: RamadanDay) => {
    const hasVideo = getVideosForDay(day.id).length > 0 || !!day.video_url;
    return hasVideo && getQuizzesForDay(day.id).length > 0;
  };

  const markProgressMutation = useMutation({
    mutationFn: async ({ dayId, field }: { dayId: number; field: 'video_watched' | 'quiz_completed' }) => {
      if (!user?.id) throw new Error('Non connecté');
      const existingProgress = userProgress.find(p => p.day_id === dayId);
      if (existingProgress) {
        const { error } = await supabase.from('user_ramadan_progress')
          .update({ [field]: true, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_ramadan_progress')
          .insert({ user_id: user.id, day_id: dayId, [field]: true });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ramadan-progress'] }),
  });

  const saveQuizResponseMutation = useMutation({
    mutationFn: async ({ quizId, selectedOption, attemptNumber, isCorrect }: { quizId: string; selectedOption: number; attemptNumber: number; isCorrect: boolean }) => {
      if (!user?.id) throw new Error('Non connecté');
      const { error } = await supabase.from('quiz_responses')
        .insert({ user_id: user.id, quiz_id: quizId, selected_option: selectedOption, attempt_number: attemptNumber, is_correct: isCorrect });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ramadan-quiz-responses'] }),
  });

  const handleDayClick = (day: RamadanDay) => {
    const isUnlocked = isDayUnlocked(day.day_number);
    const hasContent = dayHasContent(day);
    const waiting = isWaitingForTime(day.day_number);
    const progress = getDayProgress(day.id);
    const isCompleted = progress?.quiz_completed;

    // Completed days always open directly for review
    if (isCompleted && hasContent) {
      setOpenDay(day);
      return;
    }

    if (day.day_number === 1 && !settings?.start_enabled) {
      toast.error('Le calendrier n\'est pas encore ouvert. Patience !');
      return;
    }
    if (waiting) {
      toast.info(`Rendez-vous demain à partir de 16h et bsaha ftourek 🌙`, {
        style: { textAlign: 'center', display: 'flex', justifyContent: 'center' },
      });
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

    // Day 1 opens directly, other days show confirmation
    if (day.day_number > 1) {
      setPendingDayToOpen(day);
    } else {
      setOpenDay(day);
    }
  };

  const handleConfirmOpen = () => {
    if (pendingDayToOpen) {
      setOpenDay(pendingDayToOpen);
      setPendingDayToOpen(null);
    }
  };

  const handleQuizSubmit = (allCorrect: boolean, wrongCount: number) => {
    if (!openDay) return;
    const maxErrors = (settings as any)?.max_errors ?? 3;
    // Seuil : moins de maxErrors erreurs requis pour valider
    if (wrongCount < maxErrors) {
      fireSuccess();
      markProgressMutation.mutate({ dayId: openDay.id, field: 'quiz_completed' });
      if (allCorrect) {
        toast.success('Bravo ! Toutes les réponses sont correctes ! 🎉');
      } else {
        toast.success(`Bien joué ! ${wrongCount} erreur(s) seulement, journée validée ! 👍`);
      }
    }
    // Si wrongCount >= maxErrors, le dialog affiche déjà l'écran d'échec — pas de toast ici
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Moon className="h-6 w-6 text-gold" />
            <h1 className="text-2xl font-bold text-foreground font-arabic">رمضان كريم</h1>
            <Star className="h-5 w-5 text-gold" />
          </div>
          <p className="text-muted-foreground">30 Jours de Spiritualité</p>
        </div>

        {/* Fasting Tracker */}
        <FastingTracker />

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
            const isUnlocked = isDayUnlocked(day.day_number);
            const hasContent = dayHasContent(day);
            const waiting = isWaitingForTime(day.day_number);
            const notStarted = day.day_number === 1 && !settings?.start_enabled;
            const isLocked = notStarted || (!isUnlocked && !waiting);

            const getDayBg = (dayNum: number) => {
              if (isCompleted) return 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md hover:scale-105 cursor-pointer';
              if (waiting) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white cursor-wait';
              if (dayNum <= 10) return 'bg-[hsl(140,40%,88%)] text-[hsl(140,30%,35%)]';
              if (dayNum <= 20) return 'bg-gradient-to-br from-[hsl(140,40%,88%)] to-[hsl(50,60%,85%)] text-[hsl(45,40%,30%)]';
              return 'bg-gradient-to-br from-[hsl(50,60%,85%)] to-[hsl(35,70%,75%)] text-[hsl(30,50%,25%)]';
            };

            return (
              <button
                key={day.id}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200 relative',
                  getDayBg(day.day_number),
                  !isCompleted && !waiting && !isUnlocked && 'cursor-not-allowed',
                  !isCompleted && !waiting && isUnlocked && !hasContent && 'opacity-60',
                  !isCompleted && !waiting && isUnlocked && hasContent && 'hover:scale-105'
                )}
              >
                {/* Lock badge top-right */}
                {(isLocked || waiting) && !isCompleted && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white shadow flex items-center justify-center">
                    {waiting ? (
                      <Clock className="h-2.5 w-2.5 text-orange-500" />
                    ) : (
                      <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </div>
                )}

                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <>
                    {/* Moon + star icon */}
                    <svg viewBox="0 0 24 24" className="h-4 w-4 mb-0.5 opacity-70" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.82 0 3.53-.5 5-1.35-2.99-1.73-5-4.95-5-8.65s2.01-6.92 5-8.65C15.53 2.5 13.82 2 12 2z" opacity="0.8"/>
                      <path d="M17 7l.62 1.38L19 9l-1.38.62L17 11l-.62-1.38L15 9l1.38-.62L17 7z" opacity="0.9"/>
                    </svg>
                    <span className="text-[10px]">{day.day_number}</span>
                  </>
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
            <span>En attente</span>
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

        {/* Day Dialog */}
        {openDay && (
          <RamadanDayDialog
            open={!!openDay}
            onOpenChange={(isOpen) => !isOpen && setOpenDay(null)}
            dayNumber={openDay.day_number}
            dayId={openDay.id}
            theme={openDay.theme}
            videoUrl={openDay.video_url}
            videos={getVideosForDay(openDay.id)}
            quizzes={getQuizzesForDay(openDay.id)}
            quizCompleted={!!getDayProgress(openDay.id)?.quiz_completed}
            videoWatched={!!getDayProgress(openDay.id)?.video_watched}
            maxErrors={(settings as any)?.max_errors ?? 3}
            onMarkVideoWatched={() => markProgressMutation.mutate({ dayId: openDay.id, field: 'video_watched' })}
            onSubmitQuiz={handleQuizSubmit}
            onSaveQuizResponse={(quizId, selectedOption, attemptNumber, isCorrect) => saveQuizResponseMutation.mutate({ quizId, selectedOption, attemptNumber, isCorrect })}
          />
        )}

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
