import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Star, Crown, Settings, Save } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type GroupFilter = 'global' | 'petits' | 'jeunes' | 'adultes';

const GROUP_FILTERS: { key: GroupFilter; label: string; icon: string }[] = [
  { key: 'global', label: 'Global', icon: '🌍' },
  { key: 'petits', label: 'Petits', icon: '🧒' },
  { key: 'jeunes', label: 'Jeunes', icon: '🧑' },
  { key: 'adultes', label: 'Adultes', icon: '👤' },
];

interface RankingEntry {
  user_id: string;
  total_points: number;
  full_name: string | null;
  prayer_group: string | null;
  rank: number;
}

interface PointSetting {
  id: string;
  module_key: string;
  module_label: string;
  points_per_validation: number;
}

const MODULE_ICONS: Record<string, string> = {
  sourates: '📖',
  nourania: '🌙',
  ramadan: '🕌',
  alphabet: '🔤',
  invocations: '🤲',
  prayer: '🙏',
};

const getRankDisplay = (rank: number) => {
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <Star className="h-10 w-10 text-yellow-400 fill-yellow-400 drop-shadow-[0_2px_4px_rgba(234,179,8,0.5)]" />
      <span className="absolute text-[11px] font-extrabold text-yellow-900">{rank}</span>
    </div>
  );
};

const getRowStyle = (rank: number, isMe: boolean) => {
  if (isMe) return 'bg-gradient-to-r from-yellow-200 to-yellow-300 dark:from-yellow-700/50 dark:to-yellow-600/40 border-yellow-400 shadow-md ring-2 ring-yellow-400/60';
  if (rank === 1) return 'bg-gradient-to-r from-sky-100 to-sky-200 dark:from-sky-900/40 dark:to-sky-800/30 border-sky-300';
  if (rank === 2) return 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/30 border-green-300';
  if (rank === 3) return 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/30 border-orange-300';
  return 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700';
};

const getEncouragementMessage = (rank: number, total: number) => {
  if (rank <= 3) return { text: 'Bravo Champion(ne) ! Continue de briller ! 🌟', color: 'text-yellow-600 dark:text-yellow-400' };
  if (rank <= Math.ceil(total / 2)) return { text: 'Tu y es presque ! Encore un petit effort pour le podium ! 💪', color: 'text-primary' };
  return { text: 'Ne lâche rien ! Chaque petit pas compte, tu vas y arriver ! ✨', color: 'text-muted-foreground' };
};

const Classement = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editedPoints, setEditedPoints] = useState<Record<string, number>>({});
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('global');

  const { data: pointSettings = [] } = useQuery({
    queryKey: ['point-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_settings')
        .select('*')
        .order('module_key');
      if (error) throw error;
      return data as PointSetting[];
    },
  });

  const { data: allRankings, isLoading, refetch } = useQuery({
    queryKey: ['student-rankings'],
    queryFn: async () => {
      const { data: rankingData, error } = await supabase
        .from('student_ranking')
        .select('user_id, total_points')
        .order('total_points', { ascending: false });

      if (error) throw error;

      const userIds = (rankingData || []).map(r => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, prayer_group')
        .in('user_id', userIds);

      const entries: RankingEntry[] = [];
      let currentRank = 1;

      for (let i = 0; i < (rankingData || []).length; i++) {
        const item = rankingData![i];
        const profile = profiles?.find(p => p.user_id === item.user_id);
        if (i > 0 && item.total_points === rankingData![i - 1].total_points) {
          // same rank as previous (tie)
        } else {
          currentRank = i + 1;
        }
        entries.push({
          user_id: item.user_id,
          total_points: item.total_points,
          full_name: profile?.full_name || null,
          prayer_group: profile?.prayer_group || null,
          rank: currentRank,
        });
      }

      return entries;
    },
  });

  // Filter and re-rank based on group filter
  const rankings = useMemo(() => {
    if (!allRankings) return undefined;
    let filtered = allRankings;
    if (groupFilter !== 'global') {
      filtered = allRankings.filter(e => e.prayer_group === groupFilter);
    }
    // Re-assign ranks within filtered list
    let currentRank = 1;
    return filtered.map((entry, i) => {
      if (i > 0 && entry.total_points === filtered[i - 1].total_points) {
        // tie
      } else {
        currentRank = i + 1;
      }
      return { ...entry, rank: currentRank };
    });
  }, [allRankings, groupFilter]);

  const myProfile = allRankings?.find(r => r.user_id === user?.id);
  const myInFilter = rankings?.find(r => r.user_id === user?.id);

  const updatePointsMutation = useMutation({
    mutationFn: async (updates: Record<string, number>) => {
      for (const [moduleKey, points] of Object.entries(updates)) {
        const { error } = await supabase
          .from('point_settings')
          .update({ points_per_validation: points, updated_at: new Date().toISOString() })
          .eq('module_key', moduleKey);
        if (error) throw error;
      }
      const { data: allStudents } = await supabase
        .from('student_ranking')
        .select('user_id');
      if (allStudents) {
        for (const student of allStudents) {
          await supabase.rpc('recalculate_student_points', { p_user_id: student.user_id });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['point-settings'] });
      queryClient.invalidateQueries({ queryKey: ['student-rankings'] });
      toast.success('Barème mis à jour et points recalculés !');
      setSettingsOpen(false);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('rankings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_ranking' }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const handleOpenSettings = () => {
    const initial: Record<string, number> = {};
    pointSettings.forEach(s => { initial[s.module_key] = s.points_per_validation; });
    setEditedPoints(initial);
    setSettingsOpen(true);
  };

  const handleSavePoints = () => {
    updatePointsMutation.mutate(editedPoints);
  };

  const myRanking = myInFilter;
  const encouragement = myRanking ? getEncouragementMessage(myRanking.rank, rankings?.length || 0) : null;

  return (
    <AppLayout>
      <div className="px-4 py-6 pb-24 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-7 w-7 text-secondary" />
            <h1 className="text-2xl font-bold text-foreground">Classement</h1>
            <Crown className="h-7 w-7 text-secondary" />
          </div>
          <p className="text-sm text-muted-foreground">Qui sera au sommet cette semaine ?</p>
        </div>

        {/* Group filter */}
        <div className="flex gap-2 justify-center">
          {GROUP_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setGroupFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                groupFilter === f.key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* My position highlight */}
        {myRanking && encouragement && (
          <Card className="border-secondary/40 bg-gradient-to-r from-secondary/10 to-secondary/5">
            <CardContent className="p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                {getRankDisplay(myRanking.rank)}
                <div>
                  <p className="font-bold text-foreground text-lg">
                    {myRanking.rank === 1 ? '1er' : `${myRanking.rank}ème`}
                  </p>
                  <p className="text-sm text-muted-foreground">{myRanking.total_points} points</p>
                </div>
              </div>
              <p className={cn('text-sm font-medium animate-fade-in', encouragement.color)}>{encouragement.text}</p>
            </CardContent>
          </Card>
        )}

        {/* Table header */}
        {!isLoading && rankings && rankings.length > 0 && (
          <div className="flex items-center px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <span className="w-16 text-center">Rang</span>
            <span className="flex-1 ml-2">Nom</span>
            <span className="w-20 text-right">Score</span>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rankings?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 text-secondary/50" />
            <p>Aucun classement pour le moment</p>
            <p className="text-xs mt-1">
              {groupFilter !== 'global'
                ? `Aucun élève dans la catégorie "${groupFilter}"`
                : 'Les points seront attribués à chaque validation !'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankings?.map((entry, index) => {
              const isMe = entry.user_id === user?.id;
              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300 animate-fade-in',
                    getRowStyle(entry.rank, isMe),
                    isMe && 'scale-[1.02]',
                  )}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex-shrink-0 w-10 flex justify-center">
                    {getRankDisplay(entry.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold truncate text-sm', isMe ? 'text-primary' : 'text-foreground')}>
                      {isMe ? 'Toi' : (entry.full_name?.split(' ')[0] || 'Élève')}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-16 text-right">
                    <p className={cn(
                      'font-bold text-lg',
                      entry.rank === 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground',
                    )}>
                      {entry.total_points}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* User not in current filter */}
        {groupFilter !== 'global' && !myInFilter && myProfile && (
          <div className="text-center py-3 px-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">Vous n'êtes pas dans cette catégorie</p>
          </div>
        )}

        {/* Legend */}
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Barème des points :</p>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleOpenSettings}>
                  <Settings className="h-3 w-3 mr-1" />
                  Modifier
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
              {pointSettings.map(s => (
                <span key={s.module_key}>
                  {MODULE_ICONS[s.module_key] || '📌'} {s.module_label} : {s.points_per_validation} pts
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin point settings dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Modifier le barème
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {pointSettings.map(s => (
                <div key={s.module_key} className="flex items-center gap-3">
                  <span className="text-lg">{MODULE_ICONS[s.module_key] || '📌'}</span>
                  <label className="flex-1 text-sm font-medium text-foreground">{s.module_label}</label>
                  <Input
                    type="number"
                    min={0}
                    className="w-20 text-center"
                    value={editedPoints[s.module_key] ?? s.points_per_validation}
                    onChange={e => setEditedPoints(prev => ({ ...prev, [s.module_key]: parseInt(e.target.value) || 0 }))}
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleSavePoints}
              disabled={updatePointsMutation.isPending}
              className="w-full mt-2"
            >
              {updatePointsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer et recalculer
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Classement;