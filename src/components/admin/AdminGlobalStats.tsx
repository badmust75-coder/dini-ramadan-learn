import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  onBack: () => void;
}

const AdminGlobalStats = ({ onBack }: Props) => {
  // Fetch all data in parallel
  const { data, isLoading } = useQuery({
    queryKey: ['admin-global-stats'],
    queryFn: async () => {
      const [
        { data: progress },
        { data: profiles },
        { data: connexions },
        { data: days },
        { data: quizResponses },
        { data: quizzes },
      ] = await Promise.all([
        (supabase as any).from('user_ramadan_progress').select('user_id, day_id, quiz_completed, video_watched, pdf_read').limit(1000),
        (supabase as any).from('profiles').select('user_id, full_name').eq('is_approved', true).limit(500),
        (supabase as any).from('connexion_logs').select('user_id, connected_at').limit(2000),
        (supabase as any).from('ramadan_days').select('id, day_number'),
        (supabase as any).from('quiz_responses').select('quiz_id, is_correct, user_id').eq('is_correct', false).limit(2000),
        (supabase as any).from('ramadan_quizzes').select('id, question, day_id'),
      ]);
      return {
        progress: progress || [],
        profiles: profiles || [],
        connexions: connexions || [],
        days: days || [],
        quizResponses: quizResponses || [],
        quizzes: quizzes || [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">← Retour</Button>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const { progress, profiles, connexions, days, quizResponses, quizzes } = data;
  const totalEntries = progress.length;

  // SECTION 1 — Taux moyens
  const quizRate = totalEntries > 0 ? Math.round((progress.filter((p: any) => p.quiz_completed).length / totalEntries) * 100) : 0;
  const videoRate = totalEntries > 0 ? Math.round((progress.filter((p: any) => p.video_watched).length / totalEntries) * 100) : 0;
  const pdfRate = totalEntries > 0 ? Math.round((progress.filter((p: any) => p.pdf_read).length / totalEntries) * 100) : 0;

  // SECTION 2 — Actifs vs Inactifs
  const activeUserIds = new Set([
    ...progress.map((p: any) => p.user_id),
    ...connexions.map((c: any) => c.user_id),
  ]);
  const totalStudents = profiles.length;
  const activeCount = profiles.filter((p: any) => activeUserIds.has(p.user_id)).length;
  const inactiveCount = totalStudents - activeCount;
  const activePercent = totalStudents > 0 ? Math.round((activeCount / totalStudents) * 100) : 0;

  // SECTION 3 — Top élèves
  const quizByUser = new Map<string, { quiz: number; video: number }>();
  progress.forEach((p: any) => {
    const cur = quizByUser.get(p.user_id) || { quiz: 0, video: 0 };
    if (p.quiz_completed) cur.quiz++;
    if (p.video_watched) cur.video++;
    quizByUser.set(p.user_id, cur);
  });
  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name || 'Sans nom']));
  const topStudents = Array.from(quizByUser.entries())
    .map(([uid, stats]) => ({ name: profileMap.get(uid) || 'Sans nom', ...stats }))
    .sort((a, b) => b.quiz - a.quiz)
    .slice(0, 10);
  const medals = ['🥇', '🥈', '🥉'];

  // SECTION 4 — Connexions par jour
  const connexionsByDay = new Map<string, number>();
  connexions.forEach((c: any) => {
    const day = c.connected_at?.substring(0, 10);
    if (day) connexionsByDay.set(day, (connexionsByDay.get(day) || 0) + 1);
  });
  const connexionChartData = Array.from(connexionsByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({
      date: format(new Date(date), 'dd MMM', { locale: fr }),
      connexions: count,
    }));

  // SECTION 5 — Progression jour par jour
  const dayMap = new Map(days.map((d: any) => [d.id, d.day_number]));
  const totalStudentsForProgress = new Set(progress.map((p: any) => p.user_id)).size || 1;
  const quizByDay = new Map<number, number>();
  progress.forEach((p: any) => {
    if (p.quiz_completed) {
      const dn = dayMap.get(p.day_id) as number | undefined;
      if (dn) quizByDay.set(dn, (quizByDay.get(dn) || 0) + 1);
    }
  });
  const progressChartData = Array.from({ length: 30 }, (_, i) => ({
    jour: `J${i + 1}`,
    pct: Math.round(((quizByDay.get(i + 1) || 0) / totalStudentsForProgress) * 100),
  }));

  const daysWithData = progressChartData.filter(d => d.pct > 0);
  const bestDay = daysWithData.length > 0 ? daysWithData.reduce((a, b) => a.pct > b.pct ? a : b) : null;
  const worstDay = daysWithData.length > 0 ? daysWithData.reduce((a, b) => a.pct < b.pct ? a : b) : null;
  const avgPct = daysWithData.length > 0 ? Math.round(daysWithData.reduce((s, d) => s + d.pct, 0) / daysWithData.length) : 0;
  const progressLineColor = avgPct > 50 ? 'hsl(142, 71%, 45%)' : avgPct >= 25 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';

  // SECTION 6 — Erreurs les plus fréquentes
  const errorsByQuiz = new Map<string, number>();
  quizResponses.forEach((r: any) => {
    errorsByQuiz.set(r.quiz_id, (errorsByQuiz.get(r.quiz_id) || 0) + 1);
  });
  const quizMap = new Map(quizzes.map((q: any) => [q.id, q]));
  const topErrors = Array.from(errorsByQuiz.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([qid, count]) => {
      const quiz = quizMap.get(qid) as any;
      const dayNumber = quiz ? (dayMap.get(quiz.day_id) as number | undefined) : null;
      return {
        question: (quiz?.question as string) || 'Question inconnue',
        dayNumber: dayNumber || '?',
        errors: count,
      };
    });
  const maxErrors = topErrors.length > 0 ? topErrors[0].errors : 1;

  return (
    <div className="p-4 space-y-6">
      <Button variant="ghost" onClick={onBack}>← Retour</Button>
      <h2 className="text-xl font-bold">📊 Statistiques globales — Ramadan</h2>

      {/* SECTION 1 */}
      <div>
        <h3 className="font-semibold mb-3">Taux de complétion moyens</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Quiz', value: quizRate, emoji: '✅' },
            { label: 'Vidéo', value: videoRate, emoji: '🎥' },
            { label: 'PDF', value: pdfRate, emoji: '📄' },
          ].map(s => (
            <Card key={s.label} className="text-center">
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{s.value}%</p>
                <p className="text-xs text-muted-foreground">{s.emoji} {s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 2 */}
      <div>
        <h3 className="font-semibold mb-3">Élèves actifs vs inactifs</h3>
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600 font-medium">{activeCount} actifs</span>
              <span className="text-muted-foreground">{inactiveCount} inactifs</span>
            </div>
            <Progress value={activePercent} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">{activePercent}% d'élèves actifs sur {totalStudents}</p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3 */}
      <div>
        <h3 className="font-semibold mb-3">🏆 Top 10 élèves</h3>
        <div className="space-y-2">
          {topStudents.map((s, i) => (
            <Card key={i} className={i < 3 ? 'border-yellow-300 dark:border-yellow-700' : ''}>
              <CardContent className="py-2 px-3 flex items-center gap-3">
                <span className="text-lg w-8 text-center">{medals[i] || `${i + 1}.`}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm break-words">{String(s.name)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  <p>{s.quiz} quiz</p>
                  <p>{s.video} vidéos</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {topStudents.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
        </div>
      </div>

      {/* SECTION 4 */}
      <div>
        <h3 className="font-semibold mb-3">📈 Connexions par jour</h3>
        <Card>
          <CardContent className="pt-4">
            {connexionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={connexionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="connexions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 5 */}
      <div>
        <h3 className="font-semibold mb-3">📉 Progression quiz jour par jour</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="text-center">
            <CardContent className="py-2 px-1">
              <p className="text-lg font-bold">{bestDay ? bestDay.jour : '—'}</p>
              <p className="text-xs text-muted-foreground">📈 Meilleur {bestDay ? `(${bestDay.pct}%)` : ''}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-2 px-1">
              <p className="text-lg font-bold">{worstDay ? worstDay.jour : '—'}</p>
              <p className="text-xs text-muted-foreground">📉 Difficile {worstDay ? `(${worstDay.pct}%)` : ''}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-2 px-1">
              <p className="text-lg font-bold">{avgPct}%</p>
              <p className="text-xs text-muted-foreground">📊 Moyenne</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={progressChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jour" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} interval={0} />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold">{d.jour} — {d.pct}% des élèves ont complété</p>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="pct" stroke={progressLineColor} strokeWidth={2} dot={{ r: 4, fill: progressLineColor }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 6 */}
      <div>
        <h3 className="font-semibold mb-3">❌ Questions avec le plus d'erreurs</h3>
        <div className="space-y-2">
          {topErrors.map((e, i) => (
            <Card key={i}>
              <CardContent className="py-3 px-4">
                <p className="text-sm font-medium break-words">{e.question}</p>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Jour {e.dayNumber}</span>
                  <span className="text-red-500 font-semibold">{e.errors} erreur(s)</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${Math.round((e.errors / maxErrors) * 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
          {topErrors.length === 0 && <p className="text-sm text-muted-foreground">Aucune erreur 🎉</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalStats;
