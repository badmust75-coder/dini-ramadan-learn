import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Play, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Page ranges for each lesson in the PDF (based on actual 34-page document)
// Pages 1-4 are intro, lessons start from page 5
const LESSON_PAGE_RANGES: Record<number, { start: number; end: number }> = {
  1: { start: 5, end: 6 },    // Lettres isolées
  2: { start: 7, end: 8 },    // Lettres composées
  3: { start: 9, end: 10 },   // Lettres disjointes
  4: { start: 11, end: 12 },  // Lettres avec voyelles
  5: { start: 13, end: 14 },  // Le Tanwin
  6: { start: 15, end: 15 },  // Exercices sur le Tanwin
  7: { start: 16, end: 16 },  // Le petit Alif
  8: { start: 17, end: 17 },  // Applications
  9: { start: 18, end: 19 },  // L'allongement (Madd)
  10: { start: 20, end: 21 }, // Le Soukoun
  11: { start: 22, end: 23 }, // La Chadda
  12: { start: 24, end: 25 }, // Chadda et Tanwin
  13: { start: 26, end: 27 }, // Lam solaire et lunaire
  14: { start: 28, end: 28 }, // Applications
  15: { start: 29, end: 30 }, // Règles du Tajwid
  16: { start: 31, end: 32 }, // Révision complète
  17: { start: 33, end: 34 }, // Examen final
};

const Nourania = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'pdf'>('video');

  // Fetch lessons from database
  const { data: lessons = [] } = useQuery({
    queryKey: ['nourania-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lessons')
        .select('*')
        .order('lesson_number');
      if (error) throw error;
      return data || [];
    },
  });

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
  const totalLessons = lessons.length || 17;
  const progressPercentage = Math.round((validatedCount / totalLessons) * 100);

  // Mutation for validating a lesson
  const validateMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      if (!user?.id) throw new Error('Non connecté');
      
      // Check if progress exists using the actual database lesson_id
      const existingProgress = userProgress.find(p => p.lesson_id === lessonId);
      
      if (existingProgress) {
        const { error } = await supabase
          .from('user_nourania_progress')
          .update({ is_validated: true, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_nourania_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
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

  const isLessonValidated = (lessonId: number) => {
    return userProgress.some(p => p.lesson_id === lessonId && p.is_validated);
  };

  // Extract YouTube video ID from URL
  const getVideoId = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
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
            <span className="text-sm font-bold text-primary">{validatedCount}/{totalLessons} leçons</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% complété</p>
        </div>

        {/* Lessons List */}
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const isValidated = isLessonValidated(lesson.id);
            const isExpanded = expandedLesson === lesson.id;
            const videoId = getVideoId(lesson.audio_url);
            const pageRange = LESSON_PAGE_RANGES[lesson.lesson_number] || { start: 1, end: 10 };

            return (
              <div
                key={lesson.id}
                className={cn(
                  'module-card rounded-2xl overflow-hidden transition-all duration-300 animate-slide-up',
                  isValidated && 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20',
                  isExpanded && 'shadow-elevated'
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Lesson Header */}
                <div
                  onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                  className="w-full p-4 flex items-center gap-4 cursor-pointer"
                >
                  {/* Lesson Number */}
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                    isValidated 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gradient-to-br from-primary to-royal-dark text-primary-foreground'
                  )}>
                    {isValidated ? <Check className="h-5 w-5" /> : lesson.lesson_number}
                  </div>

                  {/* Title */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-arabic text-lg text-foreground truncate">{lesson.title_arabic}</p>
                    <p className="text-sm text-muted-foreground truncate">{lesson.title_french}</p>
                  </div>

                  {/* Validation Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isValidated) {
                        validateMutation.mutate(lesson.id);
                      }
                    }}
                    disabled={isValidated || validateMutation.isPending}
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
                </div>

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
                    {activeTab === 'video' && videoId && (
                      <div className="aspect-video rounded-xl overflow-hidden bg-foreground/90">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={lesson.title_french}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* PDF Tab - Embedded PDF viewer with specific pages */}
                    {activeTab === 'pdf' && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground text-center">
                          Pages {pageRange.start} à {pageRange.end}
                        </p>
                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                          <iframe
                            src={`/pdf/nourania.pdf#page=${pageRange.start}`}
                            title={`${lesson.title_french} - PDF`}
                            className="w-full h-full"
                          />
                        </div>
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
