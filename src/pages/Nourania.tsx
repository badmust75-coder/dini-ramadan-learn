import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Play, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mapping des 17 leçons avec leurs vidéos YouTube
const NOURANIA_LESSONS = [
  { lesson: 1, titleAr: 'الدرس الأول - الحروف المفردة', titleFr: 'Leçon 1 - Les lettres isolées', videoId: 'SL5Z8sRV7_o' },
  { lesson: 2, titleAr: 'الدرس الثاني - الحروف المركبة', titleFr: 'Leçon 2 - Les lettres composées', videoId: 'rLR3VfPKXcU' },
  { lesson: 3, titleAr: 'الدرس الثالث - الحروف المقطعة', titleFr: 'Leçon 3 - Les lettres disjointes', videoId: 'HPAyEk_O-_Y' },
  { lesson: 4, titleAr: 'الدرس الرابع - الحروف المتحركة', titleFr: 'Leçon 4 - Les lettres avec voyelles', videoId: 'y6CsYzq0bCs' },
  { lesson: 5, titleAr: 'الدرس الخامس - التنوين', titleFr: 'Leçon 5 - Le Tanwin', videoId: 'R3dG3Z2fHHg' },
  { lesson: 6, titleAr: 'الدرس السادس - تدريبات على التنوين', titleFr: 'Leçon 6 - Exercices sur le Tanwin', videoId: 'MkkP3D8z7kI' },
  { lesson: 7, titleAr: 'الدرس السابع - الألف الصغيرة', titleFr: 'Leçon 7 - Le petit Alif', videoId: '4PyxmO2vO-M' },
  { lesson: 8, titleAr: 'الدرس الثامن - تطبيقات', titleFr: 'Leçon 8 - Applications', videoId: 'IRSimXTF9-c' },
  { lesson: 9, titleAr: 'الدرس التاسع - المد', titleFr: 'Leçon 9 - L\'allongement (Madd)', videoId: 'mNYli6aW_v8' },
  { lesson: 10, titleAr: 'الدرس العاشر - السكون', titleFr: 'Leçon 10 - Le Soukoun', videoId: '9vKvxR0F_RI' },
  { lesson: 11, titleAr: 'الدرس الحادي عشر - الشدة', titleFr: 'Leçon 11 - La Chadda', videoId: 'DKmzqPHrK6Y' },
  { lesson: 12, titleAr: 'الدرس الثاني عشر - الشدة والتنوين', titleFr: 'Leçon 12 - Chadda et Tanwin', videoId: 'h0cVtxnXVpM' },
  { lesson: 13, titleAr: 'الدرس الثالث عشر - اللام الشمسية والقمرية', titleFr: 'Leçon 13 - Lam solaire et lunaire', videoId: 'sxJzLeFZnXk' },
  { lesson: 14, titleAr: 'الدرس الرابع عشر - تطبيقات', titleFr: 'Leçon 14 - Applications', videoId: 'K5XjVHvfJBE' },
  { lesson: 15, titleAr: 'الدرس الخامس عشر - قواعد التجويد', titleFr: 'Leçon 15 - Règles du Tajwid', videoId: 'mS2wDPdx-UE' },
  { lesson: 16, titleAr: 'الدرس السادس عشر - مراجعة شاملة', titleFr: 'Leçon 16 - Révision complète', videoId: 'tZxLhL4bgBw' },
  { lesson: 17, titleAr: 'الدرس السابع عشر - الامتحان النهائي', titleFr: 'Leçon 17 - Examen final', videoId: 'Y1Xsp4O1EY0' },
];

const Nourania = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'pdf'>('video');

  // Fetch user's progress for all lessons
  const { data: userProgress = [] } = useQuery({
    queryKey: ['nourania-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_nourania_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate overall progress
  const validatedCount = userProgress.filter(p => p.is_validated).length;
  const progressPercentage = Math.round((validatedCount / 17) * 100);

  // Mutation for validating a lesson
  const validateMutation = useMutation({
    mutationFn: async (lessonNumber: number) => {
      if (!user?.id) throw new Error('Non connecté');
      
      // Check if progress exists
      const existingProgress = userProgress.find(p => p.lesson_id === lessonNumber);
      
      if (existingProgress) {
        // Update existing
        const { error } = await supabase
          .from('user_nourania_progress')
          .update({ is_validated: true, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('user_nourania_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonNumber,
            is_validated: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nourania-progress'] });
      toast.success('Leçon validée !');
    },
    onError: (error) => {
      toast.error('Erreur lors de la validation');
      console.error(error);
    },
  });

  const isLessonValidated = (lessonNumber: number) => {
    return userProgress.some(p => p.lesson_id === lessonNumber && p.is_validated);
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">القاعدة النورانية</h1>
          <p className="text-muted-foreground">Al-Qaida An-Nouraniya - 17 Leçons</p>
        </div>

        {/* Progress */}
        <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre progression</span>
            <span className="text-sm font-bold text-primary">{validatedCount}/17 leçons</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% complété</p>
        </div>

        {/* PDF Download Button */}
        <a 
          href="/pdf/nourania.pdf" 
          target="_blank" 
          rel="noopener noreferrer"
          className="module-card rounded-2xl p-4 flex items-center gap-4 hover:shadow-elevated transition-shadow animate-fade-in"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Télécharger le PDF complet</h3>
            <p className="text-sm text-muted-foreground">القاعدة النورانية - Toutes les leçons</p>
          </div>
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
        </a>

        {/* Lessons List */}
        <div className="space-y-3">
          {NOURANIA_LESSONS.map((lesson, index) => {
            const isValidated = isLessonValidated(lesson.lesson);
            const isExpanded = expandedLesson === lesson.lesson;

            return (
              <div
                key={lesson.lesson}
                className={cn(
                  'module-card rounded-2xl overflow-hidden transition-all duration-300 animate-slide-up',
                  isValidated && 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20',
                  isExpanded && 'shadow-elevated'
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Lesson Header */}
                <button
                  onClick={() => setExpandedLesson(isExpanded ? null : lesson.lesson)}
                  className="w-full p-4 flex items-center gap-4"
                >
                  {/* Lesson Number */}
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                    isValidated 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gradient-to-br from-primary to-royal-dark text-primary-foreground'
                  )}>
                    {isValidated ? <Check className="h-5 w-5" /> : lesson.lesson}
                  </div>

                  {/* Title */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-arabic text-lg text-foreground truncate">{lesson.titleAr}</p>
                    <p className="text-sm text-muted-foreground truncate">{lesson.titleFr}</p>
                  </div>

                  {/* Validation Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isValidated) {
                        validateMutation.mutate(lesson.lesson);
                      }
                    }}
                    disabled={isValidated}
                    size="sm"
                    className={cn(
                      'shrink-0 gap-2',
                      isValidated 
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60 hover:bg-muted' 
                        : 'bg-gradient-to-r from-gold to-gold-dark text-primary hover:from-gold-dark hover:to-gold'
                    )}
                  >
                    <Check className="h-4 w-4" />
                    {isValidated ? 'Validée' : 'Valider'}
                  </Button>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {/* Tabs */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setActiveTab('video')}
                        variant={activeTab === 'video' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Vidéo
                      </Button>
                      <Button
                        onClick={() => setActiveTab('pdf')}
                        variant={activeTab === 'pdf' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>

                    {/* Video Tab */}
                    {activeTab === 'video' && (
                      <div className="aspect-video rounded-xl overflow-hidden bg-foreground/90">
                        <iframe
                          src={`https://www.youtube.com/embed/${lesson.videoId}`}
                          title={lesson.titleFr}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* PDF Tab */}
                    {activeTab === 'pdf' && (
                      <div className="bg-muted/50 rounded-xl p-4 text-center">
                        <FileText className="h-12 w-12 text-gold mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Le PDF complet contient toutes les 17 leçons.
                          <br />Ouvrez le PDF et allez à la leçon {lesson.lesson}.
                        </p>
                        <a
                          href="/pdf/nourania.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Ouvrir le PDF
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Nourania;
