import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Play, FileText, HelpCircle, ChevronRight, Moon, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RamadanDay {
  id: number;
  day_number: number;
  theme: string | null;
  video_url: string | null;
  pdf_url: string | null;
}

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
}

interface QuizResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  selected_option: number;
}

const Ramadan = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'quiz' | 'pdf'>('video');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [pollResults, setPollResults] = useState<Record<string, number[]>>({});

  // Fetch all days
  const { data: days = [] } = useQuery({
    queryKey: ['ramadan-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_days')
        .select('*')
        .order('day_number');
      if (error) throw error;
      return data as RamadanDay[];
    },
  });

  // Fetch quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ['ramadan-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_quizzes')
        .select('*');
      if (error) throw error;
      return data.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
      })) as Quiz[];
    },
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ['ramadan-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_ramadan_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's quiz responses
  const { data: userResponses = [] } = useQuery({
    queryKey: ['quiz-responses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as QuizResponse[];
    },
    enabled: !!user?.id,
  });

  // Real-time polling subscription
  useEffect(() => {
    const channel = supabase
      .channel('quiz-responses-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_responses' },
        () => {
          // Refresh poll results on any change
          fetchPollResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch poll results for all quizzes
  const fetchPollResults = async () => {
    const { data, error } = await supabase
      .from('quiz_responses')
      .select('quiz_id, selected_option');
    
    if (error) return;
    
    const results: Record<string, number[]> = {};
    data.forEach(response => {
      if (!results[response.quiz_id]) {
        results[response.quiz_id] = [0, 0, 0, 0];
      }
      results[response.quiz_id][response.selected_option]++;
    });
    setPollResults(results);
  };

  useEffect(() => {
    fetchPollResults();
  }, []);

  // Submit quiz response
  const submitQuizMutation = useMutation({
    mutationFn: async ({ quizId, selectedOption }: { quizId: string; selectedOption: number }) => {
      if (!user?.id) throw new Error('Non connecté');
      
      const { error } = await supabase
        .from('quiz_responses')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          selected_option: selectedOption,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-responses'] });
      toast.success('Réponse enregistrée !');
      setSelectedAnswer(null);
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi');
    },
  });

  // Mark progress
  const markProgressMutation = useMutation({
    mutationFn: async ({ dayId, field }: { dayId: number; field: 'video_watched' | 'pdf_read' | 'quiz_completed' }) => {
      if (!user?.id) throw new Error('Non connecté');
      
      const existingProgress = userProgress.find(p => p.day_id === dayId);
      
      if (existingProgress) {
        const { error } = await supabase
          .from('user_ramadan_progress')
          .update({ [field]: true, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_ramadan_progress')
          .insert({
            user_id: user.id,
            day_id: dayId,
            [field]: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-progress'] });
    },
  });

  // Calculate overall progress
  const completedDays = userProgress.filter(p => p.video_watched && p.quiz_completed).length;
  const progressPercentage = Math.round((completedDays / 30) * 100);

  // Extract YouTube video ID
  const getVideoId = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const getDayProgress = (dayId: number) => {
    return userProgress.find(p => p.day_id === dayId);
  };

  const getQuizForDay = (dayId: number) => {
    return quizzes.find(q => q.day_id === dayId);
  };

  const hasUserAnsweredQuiz = (quizId: string) => {
    return userResponses.some(r => r.quiz_id === quizId);
  };

  const getUserAnswer = (quizId: string) => {
    const response = userResponses.find(r => r.quiz_id === quizId);
    return response?.selected_option;
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header with Islamic Design */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Moon className="h-6 w-6 text-gold" />
            <h1 className="text-2xl font-bold text-foreground font-arabic">رمضان كريم</h1>
            <Star className="h-5 w-5 text-gold" />
          </div>
          <p className="text-muted-foreground">30 Jours de Spiritualité</p>
        </div>

        {/* Progress Card */}
        <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in bg-gradient-to-br from-primary/5 to-gold/5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre parcours spirituel</span>
            <span className="text-sm font-bold text-gold">{completedDays}/30 jours</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% du Ramadan complété</p>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {days.map((day) => {
            const progress = getDayProgress(day.id);
            const isCompleted = progress?.video_watched && progress?.quiz_completed;
            const isExpanded = expandedDay === day.id;

            return (
              <button
                key={day.id}
                onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200',
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md'
                    : isExpanded
                    ? 'bg-gradient-to-br from-gold to-gold-dark text-primary shadow-elevated'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{day.day_number}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Expanded Day Content */}
        {expandedDay && (
          <div className="module-card rounded-2xl overflow-hidden animate-fade-in">
            {(() => {
              const day = days.find(d => d.id === expandedDay);
              if (!day) return null;
              
              const quiz = getQuizForDay(day.id);
              const videoId = getVideoId(day.video_url);
              const progress = getDayProgress(day.id);
              const hasAnswered = quiz ? hasUserAnsweredQuiz(quiz.id) : false;
              const userAnswer = quiz ? getUserAnswer(quiz.id) : undefined;
              const results = quiz ? pollResults[quiz.id] || [0, 0, 0, 0] : [0, 0, 0, 0];
              const totalResponses = results.reduce((a, b) => a + b, 0);

              return (
                <>
                  {/* Day Header */}
                  <div className="p-4 bg-gradient-to-r from-primary to-royal-dark text-primary-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                        <span className="font-bold">{day.day_number}</span>
                      </div>
                      <div>
                        <h3 className="font-bold">Jour {day.day_number}</h3>
                        <p className="text-sm opacity-80">{day.theme}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b">
                    <button
                      onClick={() => setActiveTab('video')}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                        activeTab === 'video'
                          ? 'border-gold text-gold'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Play className="h-4 w-4" />
                      Vidéo
                      {progress?.video_watched && <Check className="h-3 w-3 text-green-500" />}
                    </button>
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                        activeTab === 'quiz'
                          ? 'border-gold text-gold'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <HelpCircle className="h-4 w-4" />
                      Quiz
                      {progress?.quiz_completed && <Check className="h-3 w-3 text-green-500" />}
                    </button>
                    {day.pdf_url && (
                      <button
                        onClick={() => setActiveTab('pdf')}
                        className={cn(
                          'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                          activeTab === 'pdf'
                            ? 'border-gold text-gold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {/* Video Tab */}
                    {activeTab === 'video' && videoId && (
                      <div className="space-y-4">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={day.theme || ''}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        {!progress?.video_watched && (
                          <Button
                            onClick={() => markProgressMutation.mutate({ dayId: day.id, field: 'video_watched' })}
                            className="w-full bg-gradient-to-r from-gold to-gold-dark text-primary"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Marquer comme vue
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Quiz Tab */}
                    {activeTab === 'quiz' && quiz && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">{quiz.question}</h4>
                        
                        {hasAnswered ? (
                          // Show results with real-time poll
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Résultats du sondage ({totalResponses} réponses)
                            </p>
                            {quiz.options.map((option, idx) => {
                              const count = results[idx] || 0;
                              const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                              const isCorrect = idx === quiz.correct_option;
                              const isUserChoice = idx === userAnswer;

                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className={cn(
                                      isCorrect && 'text-green-600 font-medium',
                                      isUserChoice && !isCorrect && 'text-destructive'
                                    )}>
                                      {option}
                                      {isCorrect && ' ✓'}
                                      {isUserChoice && ' (votre choix)'}
                                    </span>
                                    <span className="text-muted-foreground">{percentage}%</span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full transition-all duration-500',
                                        isCorrect ? 'bg-green-500' : 'bg-primary'
                                      )}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Show quiz form
                          <div className="space-y-4">
                            <RadioGroup
                              value={selectedAnswer?.toString()}
                              onValueChange={(val) => setSelectedAnswer(parseInt(val))}
                            >
                              {quiz.options.map((option, idx) => (
                                <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                            <Button
                              onClick={() => {
                                if (selectedAnswer !== null) {
                                  submitQuizMutation.mutate({ quizId: quiz.id, selectedOption: selectedAnswer });
                                  markProgressMutation.mutate({ dayId: day.id, field: 'quiz_completed' });
                                }
                              }}
                              disabled={selectedAnswer === null || submitQuizMutation.isPending}
                              className="w-full bg-gradient-to-r from-primary to-royal-dark"
                            >
                              <ChevronRight className="h-4 w-4 mr-2" />
                              Valider ma réponse
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PDF Tab */}
                    {activeTab === 'pdf' && day.pdf_url && (
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                        <iframe
                          src={day.pdf_url}
                          title={`PDF - Jour ${day.day_number}`}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Ramadan;
