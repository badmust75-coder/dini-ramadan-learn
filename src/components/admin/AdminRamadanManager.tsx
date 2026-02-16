import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Video, HelpCircle, Trash2, Save, Loader2, Rocket, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';

interface AdminRamadanManagerProps {
  onBack: () => void;
}

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
}

interface QuestionForm {
  question: string;
  options: string[];
  correctOption: number;
  existingId?: string;
}

const emptyQuestion = (): QuestionForm => ({
  question: '',
  options: ['', '', '', ''],
  correctOption: 0,
});

const AdminRamadanManager = ({ onBack }: AdminRamadanManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'quiz' | 'allQuizzes'; id?: string; dayId?: number } | null>(null);
  
  // Quiz form: 5 questions per day
  const [questions, setQuestions] = useState<QuestionForm[]>([
    emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion(),
  ]);

  // Fetch ramadan settings
  const { data: settings } = useQuery({
    queryKey: ['ramadan-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch ramadan days
  const { data: days = [] } = useQuery({
    queryKey: ['admin-ramadan-days-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_days')
        .select('*')
        .order('day_number');
      if (error) throw error;
      return data;
    },
  });

  // Fetch quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ['admin-ramadan-quizzes'],
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

  const getQuizzesForDay = (dayId: number) => quizzes.filter(q => q.day_id === dayId);
  const currentDayData = days.find(d => d.id === selectedDay);
  const currentQuizzes = selectedDay ? getQuizzesForDay(selectedDay) : [];

  // Upload video mutation
  const uploadVideoMutation = useMutation({
    mutationFn: async ({ dayId, file }: { dayId: number; file: File }) => {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `day-${dayId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ramadan-videos')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('ramadan-videos')
        .getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('ramadan_days')
        .update({ video_url: publicUrl })
        .eq('id', dayId);
      if (updateError) throw updateError;
      
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-days-manager'] });
      toast({ title: 'Vidéo téléversée avec succès' });
      setUploading(false);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({ title: 'Erreur lors du téléversement', variant: 'destructive' });
      setUploading(false);
    },
  });

  // Save all 4 quiz questions mutation
  const saveQuizzesMutation = useMutation({
    mutationFn: async ({ dayId, questionForms }: { dayId: number; questionForms: QuestionForm[] }) => {
      for (const qf of questionForms) {
        if (!qf.question.trim()) continue; // skip empty questions
        
        if (qf.existingId) {
          const { error } = await supabase
            .from('ramadan_quizzes')
            .update({
              question: qf.question,
              options: qf.options as unknown as string,
              correct_option: qf.correctOption,
            })
            .eq('id', qf.existingId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('ramadan_quizzes')
            .insert({
              day_id: dayId,
              question: qf.question,
              options: qf.options as unknown as string,
              correct_option: qf.correctOption,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-quizzes'] });
      toast({ title: 'Quiz enregistré avec succès (5 questions)' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de l\'enregistrement', variant: 'destructive' });
    },
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      await supabase.from('quiz_responses').delete().eq('quiz_id', quizId);
      const { error } = await supabase
        .from('ramadan_quizzes')
        .delete()
        .eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-quizzes'] });
      toast({ title: 'Question supprimée' });
    },
  });

  // Delete all quizzes for a day
  const deleteAllQuizzesMutation = useMutation({
    mutationFn: async (dayId: number) => {
      const dayQuizzes = getQuizzesForDay(dayId);
      for (const q of dayQuizzes) {
        await supabase.from('quiz_responses').delete().eq('quiz_id', q.id);
        await supabase.from('ramadan_quizzes').delete().eq('id', q.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-quizzes'] });
      toast({ title: 'Toutes les questions supprimées' });
      setQuestions([emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion()]);
    },
  });

  // Reset calendar mutation - resets all users' progress
  const resetCalendarMutation = useMutation({
    mutationFn: async () => {
      // Delete all quiz responses
      const { error: respError } = await supabase
        .from('quiz_responses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (respError) throw respError;

      // Delete all user ramadan progress
      const { error: progError } = await supabase
        .from('user_ramadan_progress')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (progError) throw progError;

      // Reset settings: disable start and clear started_at
      const { error: settError } = await supabase
        .from('ramadan_settings')
        .update({
          start_enabled: false,
          started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings?.id);
      if (settError) throw settError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ramadan-progress'] });
      queryClient.invalidateQueries({ queryKey: ['ramadan-quiz-responses'] });
      toast({ title: '🔄 Calendrier réinitialisé pour tous les utilisateurs' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la réinitialisation', variant: 'destructive' });
    },
  });

  // Toggle start enabled mutation
  const toggleStartMutation = useMutation({
    mutationFn: async () => {
      const newValue = !settings?.start_enabled;
      const updateData: Record<string, unknown> = {
        start_enabled: newValue,
        updated_at: new Date().toISOString(),
      };
      // Set started_at when enabling for the first time
      if (newValue && !settings?.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('ramadan_settings')
        .update(updateData)
        .eq('id', settings?.id);
      if (error) throw error;
      return newValue;
    },
    onSuccess: (newValue) => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-settings'] });
      toast({
        title: newValue
          ? '🚀 Top départ activé ! Les élèves peuvent commencer.'
          : 'Top départ désactivé'
      });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedDay) {
      uploadVideoMutation.mutate({ dayId: selectedDay, file });
    }
  };

  const handleOpenDay = (dayId: number) => {
    setSelectedDay(dayId);
    const existing = getQuizzesForDay(dayId);
    const newQuestions: QuestionForm[] = [];
    for (let i = 0; i < 5; i++) {
      if (existing[i]) {
        newQuestions.push({
          question: existing[i].question,
          options: existing[i].options,
          correctOption: existing[i].correct_option ?? 0,
          existingId: existing[i].id,
        });
      } else {
        newQuestions.push(emptyQuestion());
      }
    }
    setQuestions(newQuestions);
  };

  const updateQuestion = (idx: number, field: keyof QuestionForm, value: unknown) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updateQuestionOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions(prev => {
      const copy = [...prev];
      const newOptions = [...copy[qIdx].options];
      newOptions[optIdx] = value;
      copy[qIdx] = { ...copy[qIdx], options: newOptions };
      return copy;
    });
  };

  const handleSaveQuiz = () => {
    if (!selectedDay) return;
    
    const filledQuestions = questions.filter(q => q.question.trim());
    if (filledQuestions.length === 0) {
      toast({ title: 'Veuillez remplir au moins une question', variant: 'destructive' });
      return;
    }
    for (const q of filledQuestions) {
      if (q.options.some(o => !o.trim())) {
        toast({ title: 'Veuillez remplir toutes les options des questions', variant: 'destructive' });
        return;
      }
    }
    
    saveQuizzesMutation.mutate({ dayId: selectedDay, questionForms: questions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">Gestion Ramadan</h2>
          <p className="text-sm text-muted-foreground">Téléverser vidéos et créer quiz (5 questions/jour)</p>
        </div>
      </div>

      {/* Top Départ Button */}
      <Card className={settings?.start_enabled ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${settings?.start_enabled ? 'bg-green-500' : 'bg-muted'}`}>
                <Rocket className={`h-6 w-6 ${settings?.start_enabled ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-bold text-foreground">Top Départ</p>
                <p className="text-sm text-muted-foreground">
                  {settings?.start_enabled
                    ? 'Les élèves peuvent accéder au Jour 1'
                    : 'Le calendrier est verrouillé pour les élèves'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => toggleStartMutation.mutate()}
              disabled={toggleStartMutation.isPending}
              variant={settings?.start_enabled ? 'destructive' : 'default'}
              className={!settings?.start_enabled ? 'bg-gradient-to-r from-green-500 to-green-600' : ''}
            >
              {toggleStartMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : settings?.start_enabled ? (
                'Désactiver'
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Lancer !
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Card className="border-orange-300 dark:border-orange-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-bold text-foreground">Réinitialiser</p>
                <p className="text-sm text-muted-foreground">
                  Remet à zéro la progression de tous les élèves
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                if (confirm('⚠️ Réinitialiser le calendrier pour TOUS les élèves ? Cette action est irréversible.')) {
                  resetCalendarMutation.mutate();
                }
              }}
              disabled={resetCalendarMutation.isPending}
              variant="outline"
              className="border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              {resetCalendarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réinitialiser
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Days Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
        {days.map((day) => {
          const hasVideo = !!day.video_url;
          const quizCount = getQuizzesForDay(day.id).length;
          
          return (
            <button
              key={day.id}
              onClick={() => handleOpenDay(day.id)}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200
                ${hasVideo && quizCount >= 5
                  ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                  : hasVideo || quizCount > 0
                  ? 'bg-gradient-to-br from-gold to-gold-dark text-primary'
                  : 'bg-muted hover:bg-muted/80 text-foreground'
                }
              `}
            >
              <span>{day.day_number}</span>
              <div className="flex gap-0.5 mt-1">
                {hasVideo && <Video className="h-3 w-3" />}
                {quizCount > 0 && <span className="text-[10px]">{quizCount}Q</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-green-600" />
          <span>Complet (vidéo + 5Q)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-gold to-gold-dark" />
          <span>Partiel</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-muted" />
          <span>Vide</span>
        </div>
      </div>

      {/* Day Editor Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Jour {currentDayData?.day_number}
              {currentDayData?.theme && (
                <Badge variant="outline">{currentDayData.theme}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Video Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Video className="h-4 w-4 text-primary" />
                Vidéo du jour
              </Label>
              
              {currentDayData?.video_url ? (
                <div className="space-y-2">
                  <video
                    src={currentDayData.video_url}
                    controls
                    className="w-full rounded-lg aspect-video bg-black"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune vidéo</p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Téléversement...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {currentDayData?.video_url ? 'Remplacer la vidéo' : 'Téléverser une vidéo'}
                  </>
                )}
              </Button>
            </div>

            {/* Quiz Section: 5 Questions */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <HelpCircle className="h-4 w-4 text-gold" />
                  Quiz du jour (5 questions)
                </Label>
                {currentQuizzes.length > 0 && selectedDay && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget({ type: 'allQuizzes', dayId: selectedDay })}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Tout suppr.
                  </Button>
                )}
              </div>

              {questions.map((qf, qIdx) => (
                <div key={qIdx} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Question {qIdx + 1}</Label>
                    {qf.existingId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => setDeleteTarget({ type: 'quiz', id: qf.existingId })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={qf.question}
                    onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                    placeholder={`Entrez la question ${qIdx + 1}...`}
                    rows={2}
                  />
                  <div className="space-y-1.5">
                    {qf.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-q${qIdx}`}
                          checked={qf.correctOption === optIdx}
                          onChange={() => updateQuestion(qIdx, 'correctOption', optIdx)}
                          className="h-3.5 w-3.5 accent-green-500"
                        />
                        <Input
                          value={opt}
                          onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${optIdx + 1}`}
                          className={`h-8 text-sm ${qf.correctOption === optIdx ? 'border-green-500' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button
                onClick={handleSaveQuiz}
                disabled={saveQuizzesMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {currentQuizzes.length > 0 ? 'Mettre à jour le quiz' : 'Créer le quiz (5 questions)'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.type === 'quiz' && deleteTarget.id) {
            deleteQuizMutation.mutate(deleteTarget.id);
            const qIdx = questions.findIndex(q => q.existingId === deleteTarget.id);
            if (qIdx >= 0) {
              setQuestions(prev => {
                const copy = [...prev];
                copy[qIdx] = emptyQuestion();
                return copy;
              });
            }
          } else if (deleteTarget?.type === 'allQuizzes' && deleteTarget.dayId) {
            deleteAllQuizzesMutation.mutate(deleteTarget.dayId);
          }
          setDeleteTarget(null);
        }}
        title={deleteTarget?.type === 'allQuizzes' ? 'Supprimer toutes les questions ?' : 'Supprimer cette question ?'}
        description={deleteTarget?.type === 'allQuizzes'
          ? 'Toutes les questions de ce jour seront supprimées définitivement.'
          : 'Cette question sera supprimée définitivement.'}
      />
    </div>
  );
};

export default AdminRamadanManager;
