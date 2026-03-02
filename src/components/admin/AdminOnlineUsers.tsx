/**
 * AdminOnlineUsers — Real-time online users monitoring card
 * Shows all users with presence status, last connection time, and weekly connexion badge
 */
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Circle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const formatLastSeen = (lastSeen: string | null): string => {
  if (!lastSeen) return 'Jamais connecté';

  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < ONLINE_THRESHOLD_MS) return 'En ligne';

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}h${minutes}`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `Aujourd'hui à ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Hier à ${timeStr}`;

  const day = date.getDate();
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const month = months[date.getMonth()];
  return `${day} ${month} à ${timeStr}`;
};

/** Monday 00:00 of current week */
const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

const getBadgeStyle = (count: number) => {
  if (count >= 11) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
  if (count >= 6) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  if (count >= 3) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  return 'bg-muted text-muted-foreground';
};

const AdminOnlineUsers = () => {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['admin-online-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, email, last_seen, is_approved')
        .eq('is_approved', true);
      if (profilesError) throw profilesError;

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));

      return ((profiles || []) as Array<{
        user_id: string;
        full_name: string | null;
        email: string | null;
        last_seen: string | null;
        is_approved: boolean;
      }>).filter(u => !adminIds.has(u.user_id));
    },
    refetchInterval: 30_000,
  });

  // Weekly connexion counts
  const { data: weekCounts = {} } = useQuery({
    queryKey: ['admin-week-connexions'],
    queryFn: async () => {
      const weekStart = getWeekStart();
      const { data, error } = await (supabase as any)
        .from('connexion_logs')
        .select('user_id, connected_at')
        .gte('connected_at', weekStart);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of (data || [])) {
        counts[row.user_id] = (counts[row.user_id] || 0) + 1;
      }
      return counts;
    },
    refetchInterval: 30_000,
  });

  // Realtime refresh
  useEffect(() => {
    const ch1 = supabase
      .channel('admin-online-users-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-online-users'] });
      })
      .subscribe();

    const ch2 = supabase
      .channel('admin-connexion-logs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connexion_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-week-connexions'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [queryClient]);

  const now = Date.now();

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = a.last_seen && (now - new Date(a.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
      const bOnline = b.last_seen && (now - new Date(b.last_seen).getTime()) < ONLINE_THRESHOLD_MS;

      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      if (aOnline && bOnline) {
        return (a.full_name || '').localeCompare(b.full_name || '');
      }

      const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bTime - aTime;
    });
  }, [users, now]);

  const onlineCount = users.filter(u => u.last_seen && (now - new Date(u.last_seen).getTime()) < ONLINE_THRESHOLD_MS).length;

  return (
    <div className="rounded-2xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">👥 Utilisateurs en ligne</p>
            <p className="text-xs text-muted-foreground">
              🟢 {onlineCount} en ligne ({sortedUsers.length} inscrits)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {onlineCount}
          </span>
        </div>
      </div>

      {/* User list */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
        <div className="divide-y divide-border/50">
          {sortedUsers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Aucun utilisateur inscrit
            </div>
          ) : (
            sortedUsers.map((user) => {
              const isOnline = user.last_seen && (now - new Date(user.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
              const displayName = user.full_name || user.email?.split('@')[0] || 'Utilisateur';
              const statusText = formatLastSeen(user.last_seen);
              const weekCount = (weekCounts as Record<string, number>)[user.user_id] || 0;

              return (
                <div key={user.user_id} className="flex items-center gap-3 px-4 py-2.5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                        isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                      }`}
                    />
                  </div>

                  {/* Name & status */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isOnline ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                      {displayName}
                    </p>
                    <p className={`text-xs ${isOnline ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                      {statusText}
                    </p>
                  </div>

                  {/* Weekly connexion badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getBadgeStyle(weekCount)}`}>
                    {weekCount}x
                  </span>

                  {/* Online badge */}
                  {isOnline && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shrink-0">
                      En ligne
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOnlineUsers;
