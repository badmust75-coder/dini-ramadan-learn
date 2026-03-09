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
  is_unlocked: boolean;
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
      return (data as any[]).map(d => ({ ...d, is_unlocked: d.is_unlocked ?? false })) as RamadanDay[];
    },
  });

  // Fetch per-student day exceptions
  const { data: dayExceptions = [] } = useQuery({
    queryKey: ['ramadan-day-exceptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any).from('ramadan_day_exceptions').select('*').eq('user_id', user.id).eq('is_unlocked', true);
      if (error) throw error;
      return data as { id: string; user_id: string; day_id: number; is_unlocked: boolean }[];
    },
    enabled: !!user?.id,
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

  // Date-based auto-lock: Ramadan starts March 1, 2026
  const ramadanStart = new Date('2026-03-01T00:00:00');
  const currentRamadanDay = Math.floor((new Date().getTime() - ramadanStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const isFutureDay = (day: RamadanDay): boolean => {
    if (day.is_unlocked) return false;
    if (dayExceptions.some(e => e.day_id === day.id)) return false;
    return day.day_number > currentRamadanDay;
  };

  const isOldLocked = (day: RamadanDay): boolean => {
    if (day.is_unlocked) return false;
    if (dayExceptions.some(e => e.day_id === day.id)) return false;
    return day.day_number < currentRamadanDay - 3;
  };

  const isDateLocked = (day: RamadanDay): boolean => {
    return isFutureDay(day) || isOldLocked(day);
  };

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

    const ramadanStartClick = new Date('2026-03-01T00:00:00');
    const currentRamadanDayClick = Math.floor(
      (new Date().getTime() - ramadanStartClick.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const isInWindow = day.day_number >= (currentRamadanDayClick - 3)
                       && day.day_number <= currentRamadanDayClick;
    const isAdminUnlocked = day.is_unlocked === true;
    const hasPersonalException = dayExceptions.some(e => e.day_id === day.id);

    if (!isInWindow && !isAdminUnlocked && !hasPersonalException && !isCompleted) {
      if (day.day_number > currentRamadanDayClick) {
        toast.error("Ce jour n'est pas encore disponible 🔒");
      } else {
        toast.error("Ce jour est verrouillé. Demande à ton professeur de le rouvrir 🔓");
      }
      return;
    }

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
            const dateLocked = isDateLocked(day);
            const isLocked = dateLocked || notStarted || (!isUnlocked && !waiting);

            // Determine if this is the current Ramadan day
            const isCurrentDay = day.day_number === currentRamadanDay;
            // Is it before 16h for the current day?
            const isCurrentDayBeforeUnlock = isCurrentDay && waiting;
            // Is it current day and unlocked (after 16h)?
            const isCurrentDayUnlocked = isCurrentDay && !waiting && isUnlocked;
            // Accessible window days (J-1, J-2, J-3) but not current day
            const isAccessibleWindow = !isCurrentDay && !dateLocked && !isCompleted && (isUnlocked || waiting);
            // Old locked day (before J-3)
            const isOldLockedDay = isOldLocked(day);
            // Future locked day
            const isFutureLockedDay = isFutureDay(day);

            const getDayClasses = () => {
              // Completed: dark green background
              if (isCompleted) {
                return 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-md hover:scale-105 cursor-pointer';
              }
              // Current day (J): ORANGE background
              if (isCurrentDay) {
                return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md hover:scale-105 cursor-pointer';
              }
              // Accessible window (J-1, J-2, J-3): very light green
              if (isAccessibleWindow) {
                return 'bg-[hsl(140,40%,92%)] text-[hsl(140,30%,30%)] hover:scale-105 cursor-pointer';
              }
              // Old locked or future locked: beige/cream
              if (isOldLockedDay || isFutureLockedDay) {
                return 'bg-[hsl(40,30%,92%)] text-[hsl(30,20%,50%)] cursor-not-allowed';
              }
              // Default fallback
              return 'bg-muted text-muted-foreground cursor-not-allowed';
            };

            return (
              <button
                key={day.id}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200 relative',
                  getDayClasses()
                )}
              >
                {/* Small lock on old locked days (top-right) */}
                {isOldLockedDay && !isCompleted && (
                  <span className="absolute top-0.5 right-0.5 text-[8px]">🔒</span>
                )}

                {isCompleted ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span className="text-[10px] mt-0.5">{day.day_number}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">🌙</span>
                    <span className="text-[11px] font-bold">{day.day_number}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-green-600 to-green-700" />
            <span>Complété</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-500" />
            <span>En attente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[hsl(40,30%,92%)] flex items-center justify-center">
              <Lock className="h-2 w-2 text-[hsl(30,20%,50%)]" />
            </div>
            <span>Verrouillé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[hsl(140,40%,92%)]" />
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
