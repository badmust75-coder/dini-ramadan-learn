/**
 * AdminOnlineUsers — Real-time online users monitoring card
 * Shows all users with presence status and last connection time
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

  // Check if today
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `Aujourd'hui à ${timeStr}`;

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Hier à ${timeStr}`;

  // Full date in French
  const day = date.getDate();
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const month = months[date.getMonth()];
  return `Connecté le ${day} ${month} à ${timeStr}`;
};

const AdminOnlineUsers = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ['admin-online-users'],
    queryFn: async () => {
      // Get all approved users
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, email, last_seen, is_approved')
        .eq('is_approved', true);
      if (profilesError) throw profilesError;

      // Get admin user_ids to exclude
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));

      // Filter out admins
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

  // Realtime: refresh when profiles change
  useEffect(() => {
    const channel = supabase
      .channel('admin-online-users-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-online-users'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const now = Date.now();

  // Sort: online first (alphabetically), then offline by last_seen DESC
  const sortedUsers = [...users].sort((a, b) => {
    const aOnline = a.last_seen && (now - new Date(a.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
    const bOnline = b.last_seen && (now - new Date(b.last_seen).getTime()) < ONLINE_THRESHOLD_MS;

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    if (aOnline && bOnline) {
      // Both online: alphabetical
      const aName = (a.full_name || a.email || '').toLowerCase();
      const bName = (b.full_name || b.email || '').toLowerCase();
      return aName.localeCompare(bName);
    }

    // Both offline: most recent first
    const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
    const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
    return bTime - aTime;
  });

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
            <p className="font-semibold text-sm text-foreground">Suivi en temps réel</p>
            <p className="text-xs text-muted-foreground">{sortedUsers.length} utilisateur{sortedUsers.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {onlineCount} en ligne
          </span>
        </div>
      </div>

      {/* User list */}
      <ScrollArea className="max-h-[60vh]">
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

                  {/* Online badge */}
                  {isOnline && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shrink-0">
                      Actif
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminOnlineUsers;
