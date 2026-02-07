import { useState } from 'react';
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
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewType = 'dashboard' | 'users' | 'students' | 'ramadan' | 'ramadan-manage' | 'nourania' | 'alphabet' | 'invocations' | 'sourates' | 'prayer' | 'messages';

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

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
        <h2 className="text-xl font-bold text-foreground mb-4">Gestion des élèves</h2>

        <div className="space-y-3">
          <AdminModuleCard
            title="Utilisateurs"
            icon={Users}
            value={stats?.users || 0}
            subtitle="inscrits"
            color="text-primary"
            bgColor="bg-primary/10"
            onClick={() => setCurrentView('users')}
          />

          <AdminModuleCard
            title="Messages"
            icon={Mail}
            value="Voir"
            subtitle="Messages des élèves"
            color="text-primary"
            bgColor="bg-primary/10"
            onClick={() => setCurrentView('messages')}
          />

          <AdminModuleCard
            title="Élèves"
            icon={GraduationCap}
            value={stats?.users || 0}
            subtitle="suivis"
            color="text-gold"
            bgColor="bg-gold/10"
            onClick={() => setCurrentView('students')}
          />

          <div className="space-y-2">
            <AdminModuleCard
              title="Ramadan"
              icon={Moon}
              value={`${stats?.ramadan || 0} jours`}
              subtitle="Progression par élève"
              color="text-primary"
              bgColor="bg-primary/10"
              onClick={() => setCurrentView('ramadan')}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCurrentView('ramadan-manage')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Gérer vidéos & quiz
            </Button>
          </div>

          <AdminModuleCard
            title="Nourania"
            icon={Sparkles}
            value={`${stats?.nourania || 0} leçons`}
            subtitle="Progression par élève"
            color="text-gold"
            bgColor="bg-gold/10"
            onClick={() => setCurrentView('nourania')}
          />

          <AdminModuleCard
            title="Alphabet"
            icon={BookOpen}
            value={`${stats?.alphabet || 0} lettres`}
            subtitle="Progression par élève"
            color="text-primary"
            bgColor="bg-primary/10"
            onClick={() => setCurrentView('alphabet')}
          />

          <AdminModuleCard
            title="Invocations"
            icon={MessageSquare}
            value={`${stats?.invocations || 0} disponibles`}
            subtitle="Progression par élève"
            color="text-gold"
            bgColor="bg-gold/10"
            onClick={() => setCurrentView('invocations')}
          />

          <AdminModuleCard
            title="Sourates"
            icon={BookMarked}
            value={`${stats?.sourates || 0} sourates`}
            subtitle="Progression par élève"
            color="text-primary"
            bgColor="bg-primary/10"
            onClick={() => setCurrentView('sourates')}
          />

          <AdminModuleCard
            title="Prière"
            icon={Hand}
            value={`${stats?.prayer || 0} catégories`}
            subtitle="Progression par élève"
            color="text-gold"
            bgColor="bg-gold/10"
            onClick={() => setCurrentView('prayer')}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Admin;
