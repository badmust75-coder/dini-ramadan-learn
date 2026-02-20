import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Moon, BookOpen, Hand, BookMarked, Sparkles, MessageSquare, Star, Music, Video, FileText, Image, Heart, List, Scroll, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import HomeworkCard from '@/components/homework/HomeworkCard';
import WelcomeNameDialog from '@/components/auth/WelcomeNameDialog';
import { useUserProgress } from '@/hooks/useUserProgress';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Moon, BookOpen, Hand, BookMarked, Sparkles, MessageSquare, Star, Music, Video, FileText, Image, Heart, List, Scroll, Users,
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const { data: progress } = useUserProgress();

  // Fetch modules from DB
  const { data: modules } = useQuery({
    queryKey: ['learning-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
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
          {/* Welcome Section */}
          <div className="text-center py-6 animate-fade-in">
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

          {/* Module Cards Grid - Dynamic from DB */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {(modules || []).map((mod, index) => {
              const Icon = ICON_MAP[mod.icon] || BookOpen;
              return (
                <div key={mod.id} className="flex flex-col items-center">
                  <button
                    onClick={() => handleModuleClick(mod)}
                    className={cn(
                      'module-card relative overflow-hidden rounded-2xl p-4 text-left w-full',
                      'flex flex-col items-center justify-center min-h-[160px]',
                      'animate-slide-up',
                      `stagger-${(index % 6) + 1}`
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
                </div>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in">
            <h3 className="font-bold text-foreground mb-3">Votre progression</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <div className="text-center">
                <div className="text-xl font-bold text-gold">{progress?.ramadan.percentage || 0}%</div>
                <p className="text-xs text-muted-foreground">Ramadan</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{progress?.nourania.percentage || 0}%</div>
                <p className="text-xs text-muted-foreground">Nourania</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gold">{progress?.alphabet.percentage || 0}%</div>
                <p className="text-xs text-muted-foreground">Alphabet</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{progress?.invocations.percentage || 0}%</div>
                <p className="text-xs text-muted-foreground">Invocations</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gold">{progress?.sourates.percentage || 0}%</div>
                <p className="text-xs text-muted-foreground">Sourates</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{progress?.prayer.percentage || 0}%</div>
                <p className="text-xs text-muted-foreground">Prière</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
};

export default Index;
