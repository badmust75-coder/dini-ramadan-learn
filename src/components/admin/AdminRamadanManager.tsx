import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Video, HelpCircle, Trash2, Save, Loader2, Rocket, RotateCcw, Plus, GripVertical, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminRamadanActivities from '@/components/admin/AdminRamadanActivities';

interface AdminRamadanManagerProps {
  onBack: () => void;
}

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
  explanation: string | null;
  question_order: number;
}

interface DayVideo {
  id: string;
  day_id: number;
  video_url: string;
  file_name: string | null;
  display_order: number;
}

interface QuestionForm {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  existingId?: string;
}

const emptyQuestion = (): QuestionForm => ({
  question: '',
  options: ['', '', '', ''],
  correctOptions: [],
  explanation: '',
});

// Sortable question component
const SortableQuestionCard = ({
  qf,
  qIdx,
  updateQuestion,
  updateQuestionOption,
  removeQuestion,
}: {
  qf: QuestionForm;
  qIdx: number;
  updateQuestion: (idx: number, field: keyof QuestionForm, value: unknown) => void;
  updateQuestionOption: (qIdx: number, optIdx: number, value: string) => void;
  removeQuestion: (idx: number) => void;
}) => {
  const id = qf.existingId || `new-${qIdx}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            type="button"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <Label className="text-sm font-medium">Question {qIdx + 1}</Label>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={() => removeQuestion(qIdx)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
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
              type="checkbox"
              checked={qf.correctOptions.includes(optIdx)}
              onChange={() => {
                const newCorrect = qf.correctOptions.includes(optIdx)
                  ? qf.correctOptions.filter(i => i !== optIdx)
                  : [...qf.correctOptions, optIdx];
                updateQuestion(qIdx, 'correctOptions', newCorrect);
              }}
              className="h-3.5 w-3.5 accent-green-500"
            />
            <Input
              value={opt}
              onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
              placeholder={`Option ${optIdx + 1}`}
              className={`h-8 text-sm ${qf.correctOptions.includes(optIdx) ? 'border-green-500' : ''}`}
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-1">Cochez toutes les bonnes réponses</p>
      </div>
      <div className="pt-2 border-t">
        <Label className="text-xs text-muted-foreground">📝 Explication / Correction</Label>
        <Textarea
          value={qf.explanation}
          onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
          placeholder="Ex: Adam est le premier homme sur terre, il a été créé d'argile..."
          rows={2}
          className="mt-1 text-sm"
        />
      </div>
    </div>
  );
};

const AdminRamadanManager = ({ onBack }: AdminRamadanManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'quiz' | 'allQuizzes' | 'video'; id?: string; dayId?: number } | null>(null);
  const [themeInput, setThemeInput] = useState('');
  const [savingTheme, setSavingTheme] = useState(false);

  // Unlimited questions
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);
  const [maxErrorsInput, setMaxErrorsInput] = useState<string>('3');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch ramadan settings
  const { data: settings } = useQuery({
    queryKey: ['ramadan-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ramadan_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  // Sync maxErrorsInput with settings
  useEffect(() => {
    if (settings && (settings as any).max_errors != null) {
      setMaxErrorsInput(String((settings as any).max_errors));
    }
  }, [settings]);

  // Fetch ramadan days
  const { data: days = [] } = useQuery({
    queryKey: ['admin-ramadan-days-manager'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ramadan_days').select('*').order('day_number');
      if (error) throw error;
      return data;
    },
  });

  // Fetch day videos
  const { data: dayVideos = [] } = useQuery({
    queryKey: ['admin-ramadan-day-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_day_videos')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as DayVideo[];
    },
  });

  // Fetch quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ['admin-ramadan-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ramadan_quizzes').select('*').order('question_order');
      if (error) throw error;
      return data.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
      })) as Quiz[];
    },
  });

  const getQuizzesForDay = (dayId: number) => quizzes.filter(q => q.day_id === dayId).sort((a, b) => a.question_order - b.question_order);
  const getVideosForDay = (dayId: number) => dayVideos.filter(v => v.day_id === dayId);
  const currentDayData = days.find(d => d.id === selectedDay);
  const currentQuizzes = selectedDay ? getQuizzesForDay(selectedDay) : [];
  const currentVideos = selectedDay ? getVideosForDay(selectedDay) : [];

  // Upload video mutation (multi-video)
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

      const existingVideos = getVideosForDay(dayId);
      const { error: insertError } = await supabase
        .from('ramadan_day_videos')
        .insert({
          day_id: dayId,
          video_url: publicUrl,
          file_name: file.name,
          display_order: existingVideos.length,
        });
      if (insertError) throw insertError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-day-videos'] });
      toast({ title: 'Vidéo téléversée avec succès' });
      setUploading(false);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({ title: 'Erreur lors du téléversement', variant: 'destructive' });
      setUploading(false);
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase.from('ramadan_day_videos').delete().eq('id', videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-day-videos'] });
      toast({ title: 'Vidéo supprimée' });
    },
  });

  // Save theme mutation
  const saveThemeMutation = useMutation({
    mutationFn: async ({ dayId, theme }: { dayId: number; theme: string }) => {
      const { error } = await supabase
        .from('ramadan_days')
        .update({ theme: theme || null })
        .eq('id', dayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-days-manager'] });
      toast({ title: 'Thème enregistré' });
      setSavingTheme(false);
    },
    onError: () => {
      toast({ title: 'Erreur lors de l\'enregistrement', variant: 'destructive' });
      setSavingTheme(false);
    },
  });

  // Save quiz questions (unlimited, with explanation and order) — no duplicates
  const saveQuizzesMutation = useMutation({
    mutationFn: async ({ dayId, questionForms }: { dayId: number; questionForms: QuestionForm[] }) => {
      // Fetch all existing questions for this day to detect duplicates
      const { data: existingQuizzes } = await supabase
        .from('ramadan_quizzes')
        .select('id, question')
        .eq('day_id', dayId);
      const existingTexts = new Set(
        (existingQuizzes || []).map(q => q.question.trim().toLowerCase())
      );

      let skippedCount = 0;

      for (let i = 0; i < questionForms.length; i++) {
        const qf = questionForms[i];
        if (!qf.question.trim()) continue;

        const normalizedQuestion = qf.question.trim().toLowerCase();

        if (qf.existingId) {
          // Update existing question (allowed even if text matches itself)
          const { error } = await supabase
            .from('ramadan_quizzes')
            .update({
              question: qf.question,
              options: qf.options as unknown as string,
              correct_option: qf.correctOptions[0] ?? 0,
              correct_options: qf.correctOptions,
              explanation: qf.explanation || null,
              question_order: i,
            })
            .eq('id', qf.existingId);
          if (error) throw error;
        } else {
          // New question: skip if duplicate
          if (existingTexts.has(normalizedQuestion)) {
            skippedCount++;
            continue;
          }
          const { error } = await supabase
            .from('ramadan_quizzes')
            .insert({
              day_id: dayId,
              question: qf.question,
              options: qf.options as unknown as string,
              correct_option: qf.correctOptions[0] ?? 0,
              correct_options: qf.correctOptions,
              explanation: qf.explanation || null,
              question_order: i,
            });
          if (error) throw error;
          // Track newly added question to prevent intra-batch duplicates
          existingTexts.add(normalizedQuestion);
        }
      }

      return skippedCount;
    },
    onSuccess: (skippedCount) => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-quizzes'] });
      if (skippedCount > 0) {
        toast({ title: `Quiz enregistré — ${skippedCount} doublon(s) ignoré(s)` });
      } else {
        toast({ title: 'Quiz enregistré avec succès' });
      }
    },
    onError: () => {
      toast({ title: 'Erreur lors de l\'enregistrement', variant: 'destructive' });
    },
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      await supabase.from('quiz_responses').delete().eq('quiz_id', quizId);
      const { error } = await supabase.from('ramadan_quizzes').delete().eq('id', quizId);
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
      setQuestions([emptyQuestion()]);
    },
  });

  // Reset calendar mutation
  const resetCalendarMutation = useMutation({
    mutationFn: async () => {
      const { error: respError } = await supabase
        .from('quiz_responses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (respError) throw respError;

      const { error: progError } = await supabase
        .from('user_ramadan_progress')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (progError) throw progError;

      const { error: settError } = await supabase
        .from('ramadan_settings')
        .update({ start_enabled: false, started_at: null, updated_at: new Date().toISOString() })
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

  // Toggle start mutation
  const toggleStartMutation = useMutation({
    mutationFn: async () => {
      const newValue = !settings?.start_enabled;
      const updateData: Record<string, unknown> = {
        start_enabled: newValue,
        updated_at: new Date().toISOString(),
      };
      if (newValue && !settings?.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      const { error } = await supabase.from('ramadan_settings').update(updateData).eq('id', settings?.id);
      if (error) throw error;
      return newValue;
    },
    onSuccess: (newValue) => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-settings'] });
      toast({ title: newValue ? '🚀 Top départ activé !' : 'Top départ désactivé' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    },
  });

  // Save max errors threshold mutation
  const saveMaxErrorsMutation = useMutation({
    mutationFn: async (maxErrors: number) => {
      const { error } = await supabase
        .from('ramadan_settings')
        .update({ max_errors: maxErrors, updated_at: new Date().toISOString() } as any)
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-settings'] });
      toast({ title: `✅ Seuil mis à jour : ${maxErrorsInput} erreur(s) max` });
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
    e.target.value = '';
  };

  const handleOpenDay = (dayId: number) => {
    setSelectedDay(dayId);
    const day = days.find(d => d.id === dayId);
    setThemeInput(day?.theme || '');
    const existing = getQuizzesForDay(dayId);
    if (existing.length > 0) {
      setQuestions(existing.map(q => ({
        question: q.question,
        options: q.options,
        correctOptions: (q as any).correct_options?.length > 0 
          ? (q as any).correct_options 
          : (q.correct_option !== null ? [q.correct_option] : []),
        explanation: q.explanation || '',
        existingId: q.id,
      })));
    } else {
      setQuestions([emptyQuestion()]);
    }
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

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (idx: number) => {
    const qf = questions[idx];
    if (qf.existingId) {
      setDeleteTarget({ type: 'quiz', id: qf.existingId });
    } else {
      setQuestions(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setQuestions(prev => {
      const oldIndex = prev.findIndex(q => (q.existingId || `new-${prev.indexOf(q)}`) === active.id);
      const newIndex = prev.findIndex(q => (q.existingId || `new-${prev.indexOf(q)}`) === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
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

  const handleSaveTheme = () => {
    if (!selectedDay) return;
    setSavingTheme(true);
    saveThemeMutation.mutate({ dayId: selectedDay, theme: themeInput });
  };

  const questionIds = questions.map((q, idx) => q.existingId || `new-${idx}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">Gestion Ramadan</h2>
          <p className="text-sm text-muted-foreground">Vidéos (playlist), quiz illimité et thèmes personnalisés</p>
        </div>
      </div>

      {/* Top Départ */}
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
              ) : settings?.start_enabled ? 'Désactiver' : (
                <><Rocket className="h-4 w-4 mr-2" />Lancer !</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seuil d'erreurs configurables */}
      <Card className="border-amber-300 dark:border-amber-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-foreground">Seuil d'erreurs maximum</p>
              <p className="text-sm text-muted-foreground">
                Nombre d'erreurs autorisées avant de bloquer la validation d'un quiz
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMaxErrorsInput(prev => String(Math.max(1, parseInt(prev || '3') - 1)))}
              >
                -
              </Button>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxErrorsInput}
                onChange={e => setMaxErrorsInput(e.target.value)}
                className="w-20 text-center font-bold text-lg"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMaxErrorsInput(prev => String(Math.min(10, parseInt(prev || '3') + 1)))}
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground">erreur(s) max</span>
            </div>
            <Button
              onClick={() => {
                const val = parseInt(maxErrorsInput);
                if (isNaN(val) || val < 1) return;
                saveMaxErrorsMutation.mutate(val);
              }}
              disabled={saveMaxErrorsMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saveMaxErrorsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Save className="h-4 w-4 mr-2" />Sauvegarder</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Actuellement : si un élève fait {(settings as any)?.max_errors ?? 3} erreur(s) ou plus, sa journée n'est pas validée.
          </p>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card className="border-orange-300 dark:border-orange-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-bold text-foreground">Réinitialiser</p>
                <p className="text-sm text-muted-foreground">Remet à zéro la progression de tous les élèves</p>
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
                <><RotateCcw className="h-4 w-4 mr-2" />Réinitialiser</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Days Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
        {days.map((day) => {
          const videoCount = getVideosForDay(day.id).length;
          const hasVideo = videoCount > 0 || !!day.video_url;
          const quizCount = getQuizzesForDay(day.id).length;

          return (
            <button
              key={day.id}
              onClick={() => handleOpenDay(day.id)}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200
                ${hasVideo && quizCount >= 1
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
                {videoCount > 1 && <span className="text-[9px]">x{videoCount}</span>}
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
          <span>Complet</span>
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
            {/* Theme Section */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">🏷️ Titre / Thématique du jour</Label>
              <div className="flex gap-2">
                <Input
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  placeholder="Ex: La Patience (As-Sabr)..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveTheme}
                  disabled={savingTheme || saveThemeMutation.isPending}
                  size="sm"
                >
                  {saveThemeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Videos Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Video className="h-4 w-4 text-primary" />
                Vidéos du jour ({currentVideos.length})
              </Label>

              {currentVideos.length > 0 ? (
                <div className="space-y-2">
                  {currentVideos.map((video, idx) => (
                    <div key={video.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Vidéo {idx + 1}</p>
                        <p className="text-xs truncate">{video.file_name || 'Vidéo téléversée'}</p>
                      </div>
                      <video src={video.video_url} className="h-10 w-16 rounded object-cover bg-black flex-shrink-0" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive flex-shrink-0"
                        onClick={() => setDeleteTarget({ type: 'video', id: video.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : currentDayData?.video_url ? (
                <div className="p-2 border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Vidéo existante (format ancien)</p>
                  <video src={currentDayData.video_url} controls className="w-full rounded aspect-video bg-black" />
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
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Téléversement...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Ajouter une vidéo</>
                )}
              </Button>
            </div>

            {/* Quiz Section: Unlimited with DnD */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <HelpCircle className="h-4 w-4 text-gold" />
                  Quiz du jour ({currentQuizzes.length} question{currentQuizzes.length !== 1 ? 's' : ''})
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

              <p className="text-xs text-muted-foreground">↕️ Glissez-déposez les questions pour réorganiser l'ordre</p>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
                  {questions.map((qf, qIdx) => (
                    <SortableQuestionCard
                      key={qf.existingId || `new-${qIdx}`}
                      qf={qf}
                      qIdx={qIdx}
                      updateQuestion={updateQuestion}
                      updateQuestionOption={updateQuestionOption}
                      removeQuestion={removeQuestion}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add question button */}
              <Button
                variant="outline"
                onClick={addQuestion}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une question
              </Button>

              <Button
                onClick={handleSaveQuiz}
                disabled={saveQuizzesMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveQuizzesMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement...</>
                ) : (
                  currentQuizzes.length > 0 ? 'Mettre à jour le quiz' : 'Créer le quiz'
                )}
              </Button>
            </div>

            {/* Activities Section */}
            {selectedDay && <AdminRamadanActivities dayId={selectedDay} />}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.type === 'quiz' && deleteTarget.id) {
            deleteQuizMutation.mutate(deleteTarget.id);
            setQuestions(prev => prev.filter(q => q.existingId !== deleteTarget.id));
          } else if (deleteTarget?.type === 'allQuizzes' && deleteTarget.dayId) {
            deleteAllQuizzesMutation.mutate(deleteTarget.dayId);
          } else if (deleteTarget?.type === 'video' && deleteTarget.id) {
            deleteVideoMutation.mutate(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        title={
          deleteTarget?.type === 'allQuizzes' ? 'Supprimer toutes les questions ?' :
          deleteTarget?.type === 'video' ? 'Supprimer cette vidéo ?' :
          'Supprimer cette question ?'
        }
        description={
          deleteTarget?.type === 'allQuizzes'
            ? 'Toutes les questions de ce jour seront supprimées définitivement.'
            : deleteTarget?.type === 'video'
            ? 'Cette vidéo sera supprimée définitivement.'
            : 'Cette question sera supprimée définitivement.'
        }
      />
    </div>
  );
};

export default AdminRamadanManager;
