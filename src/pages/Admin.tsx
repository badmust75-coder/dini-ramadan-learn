import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import AdminModuleCard from '@/components/admin/AdminModuleCard';
import AdminModuleProgress from '@/components/admin/AdminModuleProgress';
import AdminUsersList from '@/components/admin/AdminUsersList';
import AdminStudentDetails from '@/components/admin/AdminStudentDetails';
import AdminRamadanManager from '@/components/admin/AdminRamadanManager';
import AdminMessaging from '@/components/admin/AdminMessaging';
import AdminNouraniaContent from '@/components/admin/AdminNouraniaContent';
import AdminSourateContent from '@/components/admin/AdminSourateContent';
import AdminSourateValidations from '@/components/admin/AdminSourateValidations';
import AdminRegistrationValidations from '@/components/admin/AdminRegistrationValidations';
import { 
  Users, 
  GraduationCap, 
  Moon, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  BookMarked, 
  Hand,
  Settings,
  Mail,
  ClipboardCheck,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ViewType = 'dashboard' | 'users' | 'students' | 'ramadan' | 'ramadan-manage' | 'nourania' | 'nourania-manage' | 'alphabet' | 'invocations' | 'sourates' | 'sourates-manage' | 'sourates-validations' | 'registration-validations' | 'prayer' | 'messages';

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRegistrations, setPendingRegistrations] = useState(0);

  // Fetch pending validation count
  const { data: pendingValidations } = useQuery({
    queryKey: ['admin-pending-validations-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sourate_validation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch pending registration count
  const { data: pendingRegCount } = useQuery({
    queryKey: ['admin-pending-registrations-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
      if (error) throw error;
      return count || 0;
    },
  });

  useEffect(() => {
    setPendingCount(pendingValidations || 0);
  }, [pendingValidations]);

  useEffect(() => {
    setPendingRegistrations(pendingRegCount || 0);
  }, [pendingRegCount]);

  // Realtime subscription for pending count updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-pending-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sourate_validation_requests',
      }, async () => {
        const { count } = await supabase
          .from('sourate_validation_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingCount(count || 0);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, async () => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);
        setPendingRegistrations(count || 0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalRamadanDays },
        { count: totalNouraniaLessons },
        { count: totalAlphabetLetters },
        { count: totalInvocations },
        { count: totalSourates },
        { count: totalPrayerCategories },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('ramadan_days').select('*', { count: 'exact', head: true }),
        supabase.from('nourania_lessons').select('*', { count: 'exact', head: true }),
        supabase.from('alphabet_letters').select('*', { count: 'exact', head: true }),
        supabase.from('invocations').select('*', { count: 'exact', head: true }),
        supabase.from('sourates').select('*', { count: 'exact', head: true }),
        supabase.from('prayer_categories').select('*', { count: 'exact', head: true }),
      ]);

      return {
        users: totalUsers || 0,
        ramadan: totalRamadanDays || 0,
        nourania: totalNouraniaLessons || 0,
        alphabet: totalAlphabetLetters || 0,
        invocations: totalInvocations || 0,
        sourates: totalSourates || 0,
        prayer: totalPrayerCategories || 0,
      };
    },
  });

  if (loading) {
    return (
      <AppLayout title="Tableau de bord">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleBack = () => setCurrentView('dashboard');

  // Render different views based on currentView
  if (currentView === 'users') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <AdminUsersList onBack={handleBack} />
        </div>
      </AppLayout>
    );
  }

  if (currentView === 'students') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <AdminStudentDetails onBack={handleBack} />
        </div>
      </AppLayout>
    );
  }

  if (currentView === 'ramadan-manage') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <AdminRamadanManager onBack={handleBack} />
        </div>
      </AppLayout>
    );
  }

  if (currentView === 'nourania-manage') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            ← Retour
          </Button>
          <AdminNouraniaContent />
        </div>
      </AppLayout>
    );
  }

  if (currentView === 'sourates-manage') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            ← Retour
          </Button>
          <AdminSourateContent />
        </div>
      </AppLayout>
    );
  }

  if (currentView === 'sourates-validations') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <AdminSourateValidations onBack={handleBack} />
        </div>
      </AppLayout>
    );
  }

  if (currentView === 'registration-validations') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <AdminRegistrationValidations onBack={handleBack} />
        </div>
      </AppLayout>
    );
  }

  if (currentView === 'messages') {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            ← Retour
          </Button>
          <AdminMessaging />
        </div>
      </AppLayout>
    );
  }

  if (['ramadan', 'nourania', 'alphabet', 'invocations', 'sourates', 'prayer'].includes(currentView)) {
    return (
      <AppLayout title="Tableau de bord">
        <div className="p-4">
          <AdminModuleProgress 
            module={currentView as 'ramadan' | 'nourania' | 'alphabet' | 'invocations' | 'sourates' | 'prayer'} 
            onBack={handleBack} 
          />
        </div>
      </AppLayout>
    );
  }

  // Dashboard view with all cards
  return (
    <AppLayout title="Tableau de bord">
      <div className="p-4 space-y-4">
        {/* Validation card at the TOP */}
        <button
          onClick={() => setCurrentView('sourates-validations')}
          className={`w-full rounded-2xl p-4 shadow-card border transition-all duration-300 ${
            pendingCount > 0
              ? 'bg-red-500/10 border-red-300 dark:border-red-700 hover:bg-red-500/20'
              : 'bg-green-500/10 border-green-300 dark:border-green-700 hover:bg-green-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                pendingCount > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                <ClipboardCheck className={`h-6 w-6 ${
                  pendingCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`font-bold text-base ${
                  pendingCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                }`}>
                  Validations en attente
                </p>
                <p className={`text-sm ${
                  pendingCount > 0 ? 'text-red-600/70 dark:text-red-400/70' : 'text-green-600/70 dark:text-green-400/70'
                }`}>
                  {pendingCount > 0 ? 'Sourate(s) à valider' : 'Aucune validation en attente'}
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <Badge className="bg-red-500 text-white hover:bg-red-600 text-lg px-3 py-1 animate-pulse">
                {pendingCount}
              </Badge>
            )}
          </div>
        </button>

        {/* Registration validation card */}
        <button
          onClick={() => setCurrentView('registration-validations')}
          className={`w-full rounded-2xl p-4 shadow-card border transition-all duration-300 ${
            pendingRegistrations > 0
              ? 'bg-red-500/10 border-red-300 dark:border-red-700 hover:bg-red-500/20'
              : 'bg-green-500/10 border-green-300 dark:border-green-700 hover:bg-green-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                pendingRegistrations > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                <UserCheck className={`h-6 w-6 ${
                  pendingRegistrations > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`font-bold text-base ${
                  pendingRegistrations > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                }`}>
                  Validation d'inscription
                </p>
                <p className={`text-sm ${
                  pendingRegistrations > 0 ? 'text-red-600/70 dark:text-red-400/70' : 'text-green-600/70 dark:text-green-400/70'
                }`}>
                  {pendingRegistrations > 0 ? 'Inscription(s) à valider' : 'Aucune inscription en attente'}
                </p>
              </div>
            </div>
            {pendingRegistrations > 0 && (
              <Badge className="bg-red-500 text-white hover:bg-red-600 text-lg px-3 py-1 animate-pulse">
                {pendingRegistrations}
              </Badge>
            )}
          </div>
        </button>

        <h2 className="text-xl font-bold text-foreground mb-4">Gestion des élèves</h2>

        <div className="space-y-3">
          <AdminModuleCard
            title="Utilisateurs"
            icon={Users}
            value={stats?.users || 0}
            subtitle="inscrits"
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-100 dark:bg-purple-900/30"
            cardBgColor="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
            onClick={() => setCurrentView('users')}
          />

          <AdminModuleCard
            title="Messages"
            icon={Mail}
            value="Voir"
            subtitle="Messages des élèves"
            color="text-pink-600 dark:text-pink-400"
            bgColor="bg-pink-100 dark:bg-pink-900/30"
            cardBgColor="bg-pink-50/50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800"
            onClick={() => setCurrentView('messages')}
          />

          <AdminModuleCard
            title="Élèves"
            icon={GraduationCap}
            value={stats?.users || 0}
            subtitle="suivis"
            color="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-100 dark:bg-amber-900/30"
            cardBgColor="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            onClick={() => setCurrentView('students')}
          />

          <AdminModuleCard
            title="Ramadan"
            icon={Moon}
            value={`${stats?.ramadan || 0} jours`}
            subtitle="Progression par élève"
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-100 dark:bg-emerald-900/30"
            cardBgColor="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
            onClick={() => setCurrentView('ramadan')}
            actionButton={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('ramadan-manage')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Gérer
              </Button>
            }
          />

          <AdminModuleCard
            title="Nourania"
            icon={Sparkles}
            value={`${stats?.nourania || 0} leçons`}
            subtitle="Progression par élève"
            color="text-sky-600 dark:text-sky-400"
            bgColor="bg-sky-100 dark:bg-sky-900/30"
            cardBgColor="bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800"
            onClick={() => setCurrentView('nourania')}
            actionButton={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('nourania-manage')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Gérer
              </Button>
            }
          />

          <AdminModuleCard
            title="Alphabet"
            icon={BookOpen}
            value={`${stats?.alphabet || 0} lettres`}
            subtitle="Progression par élève"
            color="text-orange-600 dark:text-orange-400"
            bgColor="bg-orange-100 dark:bg-orange-900/30"
            cardBgColor="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
            onClick={() => setCurrentView('alphabet')}
          />

          <AdminModuleCard
            title="Invocations"
            icon={MessageSquare}
            value={`${stats?.invocations || 0} disponibles`}
            subtitle="Progression par élève"
            color="text-teal-600 dark:text-teal-400"
            bgColor="bg-teal-100 dark:bg-teal-900/30"
            cardBgColor="bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800"
            onClick={() => setCurrentView('invocations')}
          />

          <AdminModuleCard
            title="Sourates"
            icon={BookMarked}
            value={`${stats?.sourates || 0} sourates`}
            subtitle="Progression par élève"
            color="text-indigo-600 dark:text-indigo-400"
            bgColor="bg-indigo-100 dark:bg-indigo-900/30"
            cardBgColor="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
            onClick={() => setCurrentView('sourates')}
            actionButton={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('sourates-manage')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Gérer
              </Button>
            }
          />

          <AdminModuleCard
            title="Prière"
            icon={Hand}
            value={`${stats?.prayer || 0} catégories`}
            subtitle="Progression par élève"
            color="text-rose-600 dark:text-rose-400"
            bgColor="bg-rose-100 dark:bg-rose-900/30"
            cardBgColor="bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
            onClick={() => setCurrentView('prayer')}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Admin;
