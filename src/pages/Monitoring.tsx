import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/components/layout/AppLayout';
import {
  Activity, Bell, Database, AlertTriangle, Trash2, Send,
  RefreshCw, CheckCircle, XCircle, Users, MessageSquare,
  BarChart3, Clock, Loader2, UserCheck, ClipboardCheck, Sparkles, Hand
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, Cell, LabelList
} from 'recharts';

const StatusDot = ({ ok }: { ok: boolean | null }) => {
  if (ok === null) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  return ok
    ? <CheckCircle className="h-5 w-5 text-emerald-500" />
    : <XCircle className="h-5 w-5 text-red-500" />;
};

const Monitoring = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  // Section 1: Status
  const [status, setStatus] = useState<{
    supabase: boolean | null;
    edgeFn: boolean | null;
    sw: boolean | null;
    push: boolean | null;
  }>({ supabase: null, edgeFn: null, sw: null, push: null });
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Section 2: Push
  const [pushCount, setPushCount] = useState(0);
  const [testingSend, setTestingSend] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>([]);

  // Debug Push
  const [debugPush, setDebugPush] = useState<{
    vapidKey: string;
    mySubCount: number;
    vapidResult: string;
    notifPermission: string;
    swStatus: string;
  }>({ vapidKey: '...', mySubCount: 0, vapidResult: '...', notifPermission: '...', swStatus: '...' });
  const [testResult, setTestResult] = useState<{ status: number; body: string; endpoint: string } | null>(null);

  // Section 3: Activity
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [activityChart, setActivityChart] = useState<any[]>([]);

  // Section 4: DB Health
  const [dbStats, setDbStats] = useState({
    totalUsers: 0, activeWeek: 0, validationsMonth: 0, messagesMonth: 0,
    tableCounts: [] as { name: string; count: number }[]
  });

  // Section 5: Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Validation counts
  const [validationCounts, setValidationCounts] = useState({ registrations: 0, sourates: 0, nourania: 0, invocations: 0 });

  const checkStatus = useCallback(async () => {
    // Supabase ping
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      setStatus(s => ({ ...s, supabase: !error }));
    } catch { setStatus(s => ({ ...s, supabase: false })); }

    // Edge function
    try {
      const { error } = await supabase.functions.invoke('get-vapid-key');
      setStatus(s => ({ ...s, edgeFn: !error }));
    } catch { setStatus(s => ({ ...s, edgeFn: false })); }

    // Service Worker
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      setStatus(s => ({ ...s, sw: !!reg?.active }));
    } else {
      setStatus(s => ({ ...s, sw: false }));
    }

    // Push
    if ('PushManager' in window && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await (reg as any).pushManager.getSubscription();
        setStatus(s => ({ ...s, push: !!sub }));
      } catch { setStatus(s => ({ ...s, push: false })); }
    } else {
      setStatus(s => ({ ...s, push: false }));
    }

    setLastRefresh(new Date());
  }, []);

  const loadPushData = useCallback(async () => {
    const { count } = await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true });
    setPushCount(count || 0);

    const { data: hist } = await supabase.from('notification_history').select('*').order('created_at', { ascending: false }).limit(10);
    setNotifHistory(hist || []);

    // Debug: my subscriptions count
    if (user?.id) {
      const { count: myCount } = await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setDebugPush(prev => ({ ...prev, mySubCount: myCount || 0 }));
    }

    // Debug: VAPID key test
    try {
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      if (vapidError) {
        setDebugPush(prev => ({ ...prev, vapidResult: '❌ ' + vapidError.message, vapidKey: 'Erreur' }));
      } else {
        const key = vapidData?.vapidPublicKey || '';
        setDebugPush(prev => ({
          ...prev,
          vapidResult: key ? '✅ Clé reçue' : '⚠️ Clé vide',
          vapidKey: key ? key.substring(0, 20) + '...' : '(vide)'
        }));
      }
    } catch (e: any) {
      setDebugPush(prev => ({ ...prev, vapidResult: '❌ ' + e.message, vapidKey: 'Erreur' }));
    }

    // Debug: notification permission
    const perm = 'Notification' in window ? Notification.permission : 'non supporté';
    setDebugPush(prev => ({ ...prev, notifPermission: perm }));

    // Debug: SW status
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const swState = reg?.active ? 'active' : reg?.installing ? 'installing' : reg?.waiting ? 'waiting' : 'inactive';
      setDebugPush(prev => ({ ...prev, swStatus: reg ? `registered (${swState})` : 'non enregistré' }));
    } else {
      setDebugPush(prev => ({ ...prev, swStatus: 'non supporté' }));
    }
  }, [user?.id]);

  const loadActivity = useCallback(async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: online } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', fiveMinAgo);
    setOnlineCount(online || 0);

    // Activity chart: connections per day over last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const nextDayStr = format(subDays(new Date(), i - 1), 'yyyy-MM-dd');
      const { count: c } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('last_seen', dayStr).lt('last_seen', i === 0 ? new Date().toISOString() : nextDayStr);
      days.push({ day: format(day, 'EEE', { locale: fr }), connexions: c || 0 });
    }
    setActivityChart(days);
  }, []);

  const loadDbStats = useCallback(async () => {
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const weekAgo = startOfWeek(new Date()).toISOString();
    const { count: activeWeek } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', weekAgo);
    const monthStart = startOfMonth(new Date()).toISOString();

    // Validations this month (sourates + nourania + invocations)
    const { count: sv } = await supabase.from('sourate_validation_requests').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);
    const { count: nv } = await supabase.from('nourania_validation_requests').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);
    const { count: iv } = await supabase.from('invocation_validation_requests').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);

    const { count: msgs } = await supabase.from('user_messages').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);

    // Table row counts
    const tables = ['profiles', 'sourates', 'invocations', 'nourania_lessons', 'user_messages', 'push_subscriptions', 'attendance_records', 'homework_assignments'] as const;
    const counts: { name: string; count: number }[] = [];
    for (const t of tables) {
      const { count: c } = await supabase.from(t).select('*', { count: 'exact', head: true });
      counts.push({ name: t, count: c || 0 });
    }

    setDbStats({
      totalUsers: totalUsers || 0,
      activeWeek: activeWeek || 0,
      validationsMonth: (sv || 0) + (nv || 0) + (iv || 0),
      messagesMonth: msgs || 0,
      tableCounts: counts
    });
  }, []);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase.from('app_logs').select('*').in('level', ['error', 'warn']).order('created_at', { ascending: false }).limit(20);
    setLogs(data || []);
    const { count } = await supabase.from('app_logs').select('*', { count: 'exact', head: true }).in('level', ['error', 'warn']).eq('is_read', false);
    setErrorCount(count || 0);
  }, []);

  const loadValidationCounts = useCallback(async () => {
    const [reg, sou, nou, inv] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('sourate_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('nourania_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('invocation_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setValidationCounts({ registrations: reg.count || 0, sourates: sou.count || 0, nourania: nou.count || 0, invocations: inv.count || 0 });
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([checkStatus(), loadPushData(), loadActivity(), loadDbStats(), loadLogs(), loadValidationCounts()]);
  }, [checkStatus, loadPushData, loadActivity, loadDbStats, loadLogs, loadValidationCounts]);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    refreshAll();
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, navigate, refreshAll]);

  const handleTestPush = async () => {
    setTestingSend(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { title: '🧪 Test Monitoring', body: 'Notification de test depuis le monitoring', type: 'admin' }
      });
      if (error) {
        setTestResult({ status: 0, body: JSON.stringify(error, null, 2), endpoint: 'N/A' });
        toast({ title: '❌ Erreur', description: error.message, variant: 'destructive' });
      } else {
        setTestResult({ 
          status: 200, 
          body: JSON.stringify(data, null, 2), 
          endpoint: data?.debug_endpoint ? data.debug_endpoint.substring(0, 20) + '...' : 'N/A'
        });
        toast({ title: '✅ Notification envoyée', description: `${data?.sent || 0}/${data?.total || 0} reçue(s)` });
        // Save to history
        await supabase.from('notification_history').insert({
          title: '🧪 Test Monitoring', body: 'Test depuis monitoring', type: 'test',
          sent_by: user?.id, total_recipients: data?.total || 0,
          successful_sends: data?.sent || 0, failed_sends: data?.failed || 0,
          expired_cleaned: data?.expired || 0
        });
        loadPushData();
      }
    } catch (e: any) {
      setTestResult({ status: 0, body: e.message, endpoint: 'N/A' });
      toast({ title: '❌ Erreur', description: e.message, variant: 'destructive' });
    }
    setTestingSend(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast({ title: 'Champs requis', description: 'Titre et message obligatoires', variant: 'destructive' });
      return;
    }
    setBroadcasting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { title: broadcastTitle, body: broadcastBody, type: 'broadcast' }
      });
      if (error) throw error;
      toast({ title: '📢 Envoyé !', description: `${data?.sent || 0}/${data?.total || 0} notification(s)` });
      await supabase.from('notification_history').insert({
        title: broadcastTitle, body: broadcastBody, type: 'broadcast',
        sent_by: user?.id, total_recipients: data?.total || 0,
        successful_sends: data?.sent || 0, failed_sends: data?.failed || 0,
        expired_cleaned: data?.expired || 0
      });
      setBroadcastTitle(''); setBroadcastBody('');
      loadPushData();
    } catch (e: any) {
      toast({ title: '❌ Erreur', description: e.message, variant: 'destructive' });
    }
    setBroadcasting(false);
  };

  const handleClearLogs = async () => {
    setClearingLogs(true);
    await supabase.from('app_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    toast({ title: '🗑️ Logs vidés' });
    loadLogs();
    setClearingLogs(false);
  };

  const handleMarkLogsRead = async () => {
    await supabase.from('app_logs').update({ is_read: true }).eq('is_read', false);
    loadLogs();
  };

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Monitoring
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(lastRefresh, 'HH:mm:ss')}
            <Button variant="ghost" size="icon" onClick={refreshAll} className="h-7 w-7">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* SECTION 1: Application Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Statut de l'application
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Connexion Base de données', ok: status.supabase },
              { label: 'Fonctions backend', ok: status.edgeFn },
              { label: 'Service Worker PWA', ok: status.sw },
              { label: 'Notifications Push', ok: status.push },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-1">
                <span className="text-sm">{s.label}</span>
                <StatusDot ok={s.ok} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SECTION 1.5: Validations en attente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              ✅ Validations en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Inscriptions', count: validationCounts.registrations, icon: UserCheck, section: 'registration-validations' },
                { label: 'Sourates', count: validationCounts.sourates, icon: ClipboardCheck, section: 'sourates-validations' },
                { label: 'Nourania', count: validationCounts.nourania, icon: Sparkles, section: 'nourania-validations' },
                { label: 'Invocations', count: validationCounts.invocations, icon: Hand, section: 'invocations-validations' },
              ].map((item) => {
                const Icon = item.icon;
                const hasPending = item.count > 0;
                return (
                  <button
                    key={item.section}
                    onClick={() => navigate(`/admin?section=${item.section}`)}
                    className={`rounded-xl p-3 border transition-all text-center ${
                      hasPending
                        ? 'bg-red-500/10 border-red-300 dark:border-red-700 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${hasPending ? 'text-red-500' : 'text-emerald-500'}`} />
                    <p className={`text-xs font-medium ${hasPending ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{item.label}</p>
                    <p className={`text-xl font-bold ${hasPending ? 'text-red-600' : 'text-emerald-600'}`}>{item.count}</p>
                    {hasPending && <Badge className="bg-red-500 text-white text-[10px] px-1.5 mt-1 animate-pulse">{item.count}</Badge>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Push Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications Push
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Debug Push Card */}
            <div className="border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg p-3 bg-orange-50/50 dark:bg-orange-950/20 space-y-2">
              <p className="text-sm font-bold flex items-center gap-1">🔍 Debug Push</p>
              <div className="grid grid-cols-1 gap-1 text-xs font-mono">
                <div className="flex justify-between"><span className="text-muted-foreground">VAPID Key :</span><span className="truncate ml-2">{debugPush.vapidKey}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mes abonnements :</span><span>{debugPush.mySubCount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">get-vapid-key :</span><span>{debugPush.vapidResult}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Permission :</span>
                  <span className={debugPush.notifPermission === 'granted' ? 'text-emerald-600' : debugPush.notifPermission === 'denied' ? 'text-red-600' : 'text-orange-600'}>
                    {debugPush.notifPermission}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service Worker :</span><span>{debugPush.swStatus}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Abonnés actifs</span>
              <Badge variant="secondary" className="text-lg px-3">{pushCount}</Badge>
            </div>

            <Button onClick={handleTestPush} disabled={testingSend} size="sm" className="w-full">
              {testingSend ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : '🧪'} Envoyer notification test à moi-même
            </Button>

            {/* Test result inline */}
            {testResult && (
              <div className="border rounded-lg p-3 bg-muted/50 space-y-1 text-xs font-mono">
                <p className="font-bold text-sm">📋 Résultat du test :</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Statut HTTP :</span><span className={testResult.status === 200 ? 'text-emerald-600' : 'text-red-600'}>{testResult.status || 'Erreur'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Endpoint :</span><span>{testResult.endpoint}</span></div>
                <div>
                  <span className="text-muted-foreground">Réponse :</span>
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] bg-background p-2 rounded border max-h-32 overflow-auto">{testResult.body}</pre>
                </div>
              </div>
            )}

            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">📢 Notification à tous les élèves</p>
              <Input placeholder="Titre" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} />
              <Textarea placeholder="Message" value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} rows={2} />
              <Button onClick={handleBroadcast} disabled={broadcasting} size="sm" className="w-full">
                {broadcasting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Envoyer
              </Button>
            </div>

            {notifHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Historique (10 dernières)</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {notifHistory.map(h => (
                    <div key={h.id} className="text-xs border rounded p-2 flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{h.title}</span>
                        <p className="text-muted-foreground truncate">{h.body}</p>
                        <span className="text-muted-foreground">{format(new Date(h.created_at), 'dd/MM HH:mm')}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={h.successful_sends > 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {h.successful_sends > 0 ? '✅' : '❌'} {h.successful_sends}/{h.total_recipients}
                        </span>
                        {h.expired_cleaned > 0 && (
                          <p className="text-orange-500">🧹 {h.expired_cleaned} expirés</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: Real-time Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Activité en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Utilisateurs en ligne</span>
              <Badge className="bg-emerald-500 text-lg px-3">{onlineCount}</Badge>
            </div>

            {activityChart.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">📈 Connexions des 7 derniers jours</p>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={activityChart}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-background border rounded-lg px-3 py-2 shadow-lg text-sm">
                            <p className="font-medium">{label} : {payload[0].value} connexions</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="connexions" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="connexions" position="top" fontSize={11} fontWeight="bold" />
                      {activityChart.map((entry, index) => {
                        const max = Math.max(...activityChart.map(e => e.connexions), 1);
                        const ratio = entry.connexions / max;
                        const hue = 210 + ratio * 30; // blue to gold-ish
                        return <Cell key={index} fill={`hsl(${hue}, 70%, ${50 - ratio * 15}%)`} />;
                      })}
                    </Bar>
                    <Line type="monotone" dataKey="connexions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4: Database Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> Santé de la base de données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Utilisateurs inscrits', value: dbStats.totalUsers },
                { label: 'Actifs cette semaine', value: dbStats.activeWeek },
                { label: 'Validations ce mois', value: dbStats.validationsMonth },
                { label: 'Messages ce mois', value: dbStats.messagesMonth },
              ].map(s => (
                <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Lignes par table</p>
              <div className="space-y-1">
                {dbStats.tableCounts.map(t => (
                  <div key={t.name} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="font-mono">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: Error Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" /> Logs d'erreurs
              {errorCount > 0 && (
                <Badge className="bg-red-500 ml-2">{errorCount} non lu(s)</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              {errorCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkLogsRead}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Marquer lu
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={handleClearLogs} disabled={clearingLogs}>
                <Trash2 className="h-4 w-4 mr-1" /> Vider les logs
              </Button>
            </div>

            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun log d'erreur 🎉</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className={`text-xs border rounded p-2 ${log.level === 'error' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-950/20'} ${!log.is_read ? 'font-medium' : ''}`}>
                    <div className="flex justify-between">
                      <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'} className="text-[10px] h-4">
                        {log.level}
                      </Badge>
                      <span className="text-muted-foreground">{format(new Date(log.created_at), 'dd/MM HH:mm:ss')}</span>
                    </div>
                    <p className="mt-1">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Monitoring;
