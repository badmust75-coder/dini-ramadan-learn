import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Star, Crown } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RankingEntry {
  user_id: string;
  total_points: number;
  full_name: string | null;
  rank: number;
}

const getRankDisplay = (rank: number) => {
  if (rank <= 3) {
    // Ranks 1-3: Gold trophy (star-shaped) with rank number inside
    return (
      <div className="relative flex items-center justify-center w-10 h-10">
        <Star className="h-10 w-10 text-yellow-400 fill-yellow-400 drop-shadow-[0_2px_4px_rgba(234,179,8,0.5)]" />
        <span className="absolute text-[11px] font-extrabold text-yellow-900">{rank}</span>
      </div>
    );
  }
  // Rank 4+: Same yellow star with rank number inside
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
  const { user } = useAuth();

  const { data: rankings, isLoading, refetch } = useQuery({
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
        .select('user_id, full_name')
        .in('user_id', userIds);

      const entries: RankingEntry[] = [];
      let currentRank = 1;

      for (let i = 0; i < (rankingData || []).length; i++) {
        const item = rankingData![i];
        if (i > 0 && item.total_points === rankingData![i - 1].total_points) {
          // same rank as previous (tie)
        } else {
          currentRank = i + 1;
        }
        entries.push({
          user_id: item.user_id,
          total_points: item.total_points,
          full_name: profiles?.find(p => p.user_id === item.user_id)?.full_name || null,
          rank: currentRank,
        });
      }

      return entries;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('rankings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_ranking' }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const myRanking = rankings?.find(r => r.user_id === user?.id);
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
            <p className="text-xs mt-1">Les points seront attribués à chaque validation !</p>
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
                  {/* Rank display */}
                  <div className="flex-shrink-0 w-10 flex justify-center">
                    {getRankDisplay(entry.rank)}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold truncate text-sm', isMe ? 'text-primary' : 'text-foreground')}>
                      {isMe ? 'Toi' : (entry.full_name || 'Élève')}
                    </p>
                  </div>

                  {/* Score */}
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

        {/* Legend */}
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Barème des points :</p>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
              <span>📖 Sourate validée : 10 pts</span>
              <span>🌙 Nourania validée : 15 pts</span>
              <span>🕌 Ramadan complété : 5 pts</span>
              <span>🔤 Lettre validée : 5 pts</span>
              <span>🤲 Invocation mémorisée : 5 pts</span>
              <span>🙏 Prière validée : 10 pts</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Classement;
