import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Navigation, MapPin, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePrayerTimesCity, PRIORITY_CITIES, OTHER_CITIES, CITIES, CityOption } from '@/hooks/usePrayerTimesCity';
import SunArcDisplay from '@/components/prayer/SunArcDisplay';
import QiblaCompass from '@/components/prayer/QiblaCompass';
import PrayerWeeklyCalendar from '@/components/prayer/PrayerWeeklyCalendar';
import PrayerModuleCards from '@/components/prayer/PrayerModuleCards';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const Priere = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showQibla, setShowQibla] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityOption>(CITIES[0]);

  const { prayerTimes, loading: prayerLoading, error: prayerError, getNextPrayer } = usePrayerTimesCity(selectedCity);

  const { data: dailyPrayers = [] } = useQuery({
    queryKey: ['user-daily-prayers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('user_daily_prayers')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', fromDate)
        .eq('is_checked', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const todayKey = getTodayKey();
  const todayChecked = dailyPrayers
    .filter(p => p.date === todayKey)
    .map(p => p.prayer_name);

  const calendarData = useMemo(() => {
    const map: Record<string, number> = {};
    dailyPrayers.forEach(p => {
      map[p.date] = (map[p.date] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [dailyPrayers]);

  const toggleDailyPrayerMutation = useMutation({
    mutationFn: async (prayerName: string) => {
      if (!user?.id) throw new Error('Non connecté');
      const existing = dailyPrayers.find(p => p.date === todayKey && p.prayer_name === prayerName);
      if (existing) {
        const { error } = await supabase.from('user_daily_prayers').delete().eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_daily_prayers').insert({ user_id: user.id, date: todayKey, prayer_name: prayerName, is_checked: true });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-daily-prayers', user?.id] }),
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const nextPrayer = prayerTimes ? getNextPrayer() : null;

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">الصلاة</h1>
          <p className="text-muted-foreground">La Prière - Apprentissage complet</p>
        </div>

        <PrayerWeeklyCalendar prayerData={calendarData} />

        {nextPrayer && (
          <div className="rounded-xl bg-green-700 text-white p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-200">Prochaine prière</p>
              <p className="font-bold text-lg">{nextPrayer.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-xl">{nextPrayer.time}</p>
              <p className="text-xs text-green-200 font-arabic">{nextPrayer.arabic}</p>
            </div>
          </div>
        )}

        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <button
                onClick={() => setShowCitySelector(!showCitySelector)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-muted/50 transition-colors"
              >
                <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                <span className="flex-1 text-left font-medium">{selectedCity.label}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showCitySelector && 'rotate-180')} />
              </button>
              {showCitySelector && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-card border border-border rounded-xl shadow-elevated max-h-56 overflow-y-auto">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">── Votre région ──</div>
                  {PRIORITY_CITIES.map((city) => (
                    <button
                      key={city.label}
                      onClick={() => { setSelectedCity(city); setShowCitySelector(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2',
                        selectedCity.label === city.label && 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 font-medium'
                      )}
                    >
                      <span className="flex-1">{city.label}</span>
                      <span className="text-xs text-muted-foreground">{city.country}</span>
                    </button>
                  ))}
                  <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">── France & International ──</div>
                  {OTHER_CITIES.map((city) => (
                    <button
                      key={city.label}
                      onClick={() => { setSelectedCity(city); setShowCitySelector(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2',
                        selectedCity.label === city.label && 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 font-medium'
                      )}
                    >
                      <span className="flex-1">{city.label}</span>
                      <span className="text-xs text-muted-foreground">{city.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => setShowQibla(true)} className="gap-2 bg-green-700 hover:bg-green-800 text-white shrink-0">
              <Navigation className="h-4 w-4" />
              Qibla
            </Button>
          </div>

          {prayerLoading ? (
            <div className="rounded-2xl bg-slate-800 h-40 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-5 w-5 animate-spin" />
                <span className="text-sm">Chargement des horaires...</span>
              </div>
            </div>
          ) : prayerError ? (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-center text-sm text-destructive">
              {prayerError}
            </div>
          ) : prayerTimes ? (
            <SunArcDisplay
              prayerTimes={prayerTimes}
              cityLabel={`${selectedCity.label}, ${selectedCity.country}`}
              checkedPrayers={todayChecked}
              onTogglePrayer={(name) => toggleDailyPrayerMutation.mutate(name)}
            />
          ) : null}
        </div>

        <PrayerModuleCards />
      </div>

      {showQibla && (
        <QiblaCompass city={selectedCity} onClose={() => setShowQibla(false)} />
      )}
    </AppLayout>
  );
};

export default Priere;
