import { useState, useRef } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import confetti from 'canvas-confetti';

const FastingTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [glowingDay, setGlowingDay] = useState<number | null>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const { data: fastingData = [] } = useQuery({
    queryKey: ['ramadan-fasting', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_ramadan_fasting')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const toggleFastingMutation = useMutation({
    mutationFn: async ({ dayNumber, hasFasted }: { dayNumber: number; hasFasted: boolean }) => {
      if (!user?.id) throw new Error('Non connecté');
      const existing = fastingData.find(f => f.day_number === dayNumber);
      if (existing) {
        const { error } = await supabase
          .from('user_ramadan_fasting')
          .update({ has_fasted: hasFasted })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_ramadan_fasting')
          .insert({ user_id: user.id, day_number: dayNumber, has_fasted: hasFasted });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ramadan-fasting'] }),
  });

  const getFastingStatus = (dayNumber: number) => {
    const entry = fastingData.find(f => f.day_number === dayNumber);
    if (!entry) return 'default';
    return entry.has_fasted ? 'fasted' : 'not-fasted';
  };

  const fireStarConfetti = (dayNumber: number) => {
    const btn = buttonRefs.current.get(dayNumber);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    confetti({
      particleCount: 30,
      spread: 50,
      startVelocity: 20,
      origin: { x, y },
      colors: ['#22c55e', '#d4af37', '#10b981', '#fbbf24'],
      scalar: 0.7,
      ticks: 60,
      zIndex: 9999,
    });
  };

  const handleToggle = (dayNumber: number) => {
    const current = getFastingStatus(dayNumber);
    if (current === 'default') {
      toggleFastingMutation.mutate({ dayNumber, hasFasted: true });
      setGlowingDay(dayNumber);
      fireStarConfetti(dayNumber);
      setTimeout(() => setGlowingDay(null), 800);
    } else if (current === 'fasted') {
      toggleFastingMutation.mutate({ dayNumber, hasFasted: false });
    } else {
      toggleFastingMutation.mutate({ dayNumber, hasFasted: true });
      setGlowingDay(dayNumber);
      fireStarConfetti(dayNumber);
      setTimeout(() => setGlowingDay(null), 800);
    }
  };

  const fastedCount = fastingData.filter(f => f.has_fasted).length;

  return (
    <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Suivi du Jeûne 🌙</span>
        <span className="text-xs text-muted-foreground">{fastedCount}/30 jours jeûnés</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
          const status = getFastingStatus(day);
          const isGlowing = glowingDay === day;
          return (
            <button
              key={day}
              ref={(el) => { if (el) buttonRefs.current.set(day, el); }}
              onClick={() => handleToggle(day)}
              className={cn(
                'relative flex items-center justify-center w-full aspect-square rounded-lg transition-all duration-200 hover:scale-110',
              )}
              title={`Jour ${day} - ${status === 'fasted' ? 'Jeûné ✓' : status === 'not-fasted' ? 'Non jeûné' : 'Cliquer pour marquer'}`}
            >
              <Star
                className={cn(
                  'h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300',
                  status === 'fasted' && 'text-green-500 fill-green-500 drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]',
                  status === 'fasted' && '[stroke:hsl(45,93%,47%)] [stroke-width:1.5]',
                  status === 'not-fasted' && 'text-yellow-400 fill-yellow-400',
                  status === 'default' && 'text-gray-300 fill-gray-200',
                  isGlowing && 'animate-pulse scale-125 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]',
                )}
              />
              <span className={cn(
                "absolute text-[7px] font-bold",
                status === 'fasted' ? 'text-white' : status === 'not-fasted' ? 'text-amber-900' : 'text-gray-500',
              )}>{day}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 justify-center text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-green-500 fill-green-500 [stroke:hsl(45,93%,47%)] [stroke-width:1.5]" />
          <span>Jeûné</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          <span>Non jeûné</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-gray-300 fill-gray-200" />
          <span>À marquer</span>
        </div>
      </div>
    </div>
  );
};

export default FastingTracker;
