import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Moon, BookOpen, Hand, BookMarked, Sparkles, MessageSquare, Star, Music, Video, FileText, Image, Heart, List, Scroll, Users, MoreVertical, EyeOff, Eye, Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import HomeworkCard from '@/components/homework/HomeworkCard';
import WelcomeNameDialog from '@/components/auth/WelcomeNameDialog';
import { useUserProgress } from '@/hooks/useUserProgress';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { requestNotificationPermission, registerServiceWorker, subscribeToPush } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
const ICON_MAP: Record<string, LucideIcon> = {
  Moon, BookOpen, Hand, BookMarked, Sparkles, MessageSquare, Star, Music, Video, FileText, Image, Heart, List, Scroll, Users,
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [activatingNotif, setActivatingNotif] = useState(false);
  const { data: progress } = useUserProgress();

  // Fetch modules from DB — admins see all, users see active only
  const { data: modules } = useQuery({
    queryKey: ['learning-modules', isAdmin],
    queryFn: async () => {
      let query = supabase.from('learning_modules').select('*').order('display_order');
      if (!isAdmin) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('learning_modules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['learning-modules'] });
      queryClient.invalidateQueries({ queryKey: ['admin-learning-modules'] });
      toast.success(is_active ? 'Module affiché aux élèves' : 'Module masqué aux élèves');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  // Fetch user profile to check if name is set
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Show welcome dialog if user has no name set
  useEffect(() => {
    if (!profileLoading && profile !== undefined && user) {
      const hasName = profile?.full_name && profile.full_name.trim().length > 0;
      if (!hasName) {
        setShowWelcomeDialog(true);
      }
    }
  }, [profile, profileLoading, user]);

  // Check notification permission and show banner if "default"
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      setShowNotifBanner(true);
    }
  }, [user]);

  const handleActivateNotifications = async () => {
    if (!user) return;
    setActivatingNotif(true);
    try {
      await registerServiceWorker();
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        const result = await subscribeToPush(user.id);
        if (result.success) {
          toast.success('Notifications activées !');
        } else {
          toast.error('Erreur : ' + result.detail);
        }
      } else {
        toast.info('Permission refusée');
      }
      setShowNotifBanner(false);
    } catch (e: any) {
      toast.error('Erreur : ' + e.message);
    }
    setActivatingNotif(false);
  };

  const handleWelcomeComplete = () => {
    setShowWelcomeDialog(false);
  };

  const handleModuleClick = (mod: any) => {
    if (mod.is_builtin && mod.builtin_path) {
      navigate(mod.builtin_path);
    } else {
      navigate(`/module/${mod.id}`);
    }
  };

  return (
    <>
      <WelcomeNameDialog open={showWelcomeDialog} onComplete={handleWelcomeComplete} />
      <AppLayout showBottomNav={false}>
        <div className="p-4 space-y-6">
          {/* Notification Permission Banner */}
          {showNotifBanner && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
              <Bell className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">🔔 Active les notifications pour ne rien manquer !</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setShowNotifBanner(false)}>
                  Plus tard
                </Button>
                <Button size="sm" onClick={handleActivateNotifications} disabled={activatingNotif}>
                  {activatingNotif ? '...' : 'Activer'}
                </Button>
              </div>
            </div>
          )}
          <div className="text-center py-6 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                <span className="font-arabic text-base text-primary">﷽</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Dini Bismillah</h1>
            </div>
            <p className="text-muted-foreground mb-1">Assalamou Alaykoum</p>
            <h2 className="text-2xl font-bold text-foreground">
              Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ''} !
            </h2>
            <p className="font-arabic text-xl text-gold mt-2">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>

          {/* Homework Card */}
          <HomeworkCard />

          {/* Quick Stats - filtered by active modules */}
          {progress && modules && (() => {
            const PROGRESS_MAP: Record<string, { label: string; value: string; color: string }> = {
              '/sourates': { label: 'Sourates', value: `${progress.sourates.validated} sur ${progress.sourates.total}`, color: 'text-gold' },
              '/nourania': { label: 'Nourania', value: `${progress.nourania.validated} sur ${progress.nourania.total}`, color: 'text-primary' },
              '/ramadan': { label: 'Ramadan', value: `${progress.ramadan.completed} sur ${progress.ramadan.total}`, color: 'text-gold' },
              '/alphabet': { label: 'Alphabet', value: `${progress.alphabet.validated} sur ${progress.alphabet.total}`, color: 'text-primary' },
              '/invocations': { label: 'Invocations', value: `${progress.invocations.memorized} sur ${progress.invocations.total}`, color: 'text-gold' },
              '/priere': { label: 'Prière', value: `${progress.prayer.validated} validées`, color: 'text-primary' },
            };
            const activeItems = (modules || [])
              .filter(m => m.is_active && m.is_builtin && m.builtin_path && PROGRESS_MAP[m.builtin_path])
              .map(m => ({ ...PROGRESS_MAP[m.builtin_path!], order: m.display_order }))
              .sort((a, b) => a.order - b.order);

            if (activeItems.length === 0) return null;

            return (
              <div className="bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in">
                <h3 className="font-bold text-foreground mb-3">Votre progression</h3>
                <div className={cn('grid gap-2', activeItems.length <= 3 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-6')}>
                  {activeItems.map((item) => (
                    <div key={item.label} className="text-center">
                      <div className={cn('text-lg font-bold', item.color)}>{item.value}</div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Module Cards Grid - Dynamic from DB */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {(modules || []).map((mod, index) => {
              const Icon = ICON_MAP[mod.icon] || BookOpen;
              return (
                <div key={mod.id} className="flex flex-col items-center relative">
                  <button
                    onClick={() => handleModuleClick(mod)}
                    className={cn(
                      'module-card relative overflow-hidden rounded-2xl p-4 text-left w-full',
                      'flex flex-col items-center justify-center min-h-[160px]',
                      'animate-slide-up',
                      `stagger-${(index % 6) + 1}`,
                      !mod.is_active && isAdmin && 'opacity-50 grayscale'
                    )}
                    style={{ animationFillMode: 'both' }}
                  >
                    {/* Background gradient overlay */}
                    <div
                      className={cn(
                        'absolute inset-0 opacity-10 bg-gradient-to-br',
                        mod.gradient
                      )}
                    />

                    {/* Hidden badge for admin */}
                    {isAdmin && !mod.is_active && (
                      <div className="absolute top-2 left-2 z-20 bg-destructive/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        Masqué
                      </div>
                    )}

                    {/* Icon or Image */}
                    <div className="relative z-10 mb-3">
                      {mod.image_url ? (
                        <img src={mod.image_url} alt={mod.title} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
                      ) : (
                        <div className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center',
                          'bg-gradient-to-br shadow-lg',
                          mod.gradient
                        )}>
                          <Icon className={cn('h-7 w-7', mod.icon_color)} />
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <div className="relative z-10 text-center">
                      <p className="font-arabic text-lg text-muted-foreground mb-1">
                        {mod.title_arabic}
                      </p>
                      <h3 className="font-bold text-foreground text-lg">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mod.description}
                      </p>
                    </div>

                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
                      <div className={cn(
                        'absolute inset-0 bg-gradient-to-br rounded-bl-full',
                        mod.gradient
                      )} />
                    </div>
                  </button>

                  {/* Admin 3-dot menu */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActiveMutation.mutate({ id: mod.id, is_active: !mod.is_active });
                            }}
                          >
                            {mod.is_active
                              ? <><EyeOff className="h-4 w-4 mr-2 text-destructive" /><span className="text-destructive">Masquer aux élèves</span></>
                              : <><Eye className="h-4 w-4 mr-2 text-green-600" /><span className="text-green-600">Afficher aux élèves</span></>
                            }
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </AppLayout>
    </>
  );
};

export default Index;
