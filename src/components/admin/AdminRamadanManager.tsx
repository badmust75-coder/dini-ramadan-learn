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
import { ArrowLeft, Upload, Video, HelpCircle, Trash2, Save, Loader2, Rocket, RotateCcw, Plus, GripVertical, AlertTriangle, FileText, Volume2, Image, Lock, Unlock, Check, Moon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const quizSectionRef = useRef<HTMLDivElement>(null);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [scrollToSection, setScrollToSection] = useState<'video' | 'quiz' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingActivity, setUploadingActivity] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'quiz' | 'allQuizzes' | 'video' | 'activity'; id?: string; dayId?: number } | null>(null);
  const activityInputRef = useRef<HTMLInputElement>(null);
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
    refetchOnMount: 'always',
    staleTime: 0,
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

  // Fetch activities
  const { data: dayActivities = [] } = useQuery({
    queryKey: ['admin-ramadan-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_day_activities')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for student picker
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email').eq('is_approved', true).order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch day exceptions
  const { data: dayExceptions = [] } = useQuery({
    queryKey: ['admin-ramadan-day-exceptions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ramadan_day_exceptions').select('*');
      if (error) throw error;
      return data as { id: string; user_id: string; day_id: number; is_unlocked: boolean; created_at: string }[];
    },
  });

  const [selectedStudentForException, setSelectedStudentForException] = useState<string>('');

  const getQuizzesForDay = (dayId: number) => quizzes.filter(q => q.day_id === dayId).sort((a, b) => a.question_order - b.question_order);
  const getVideosForDay = (dayId: number) => dayVideos.filter(v => v.day_id === dayId);
  const getActivitiesForDay = (dayId: number) => dayActivities.filter(a => a.day_id === dayId);
  const getExceptionsForDay = (dayId: number) => dayExceptions.filter(e => e.day_id === dayId && e.is_unlocked);
  const currentDayData = days.find(d => d.id === selectedDay);
  const currentQuizzes = selectedDay ? getQuizzesForDay(selectedDay) : [];
  const currentVideos = selectedDay ? getVideosForDay(selectedDay) : [];
  const currentActivities = selectedDay ? getActivitiesForDay(selectedDay) : [];
  const currentExceptions = selectedDay ? getExceptionsForDay(selectedDay) : [];

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
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-days-manager'] });
      queryClient.refetchQueries({ queryKey: ['admin-ramadan-day-videos'] });
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

  // Upload activity mutation
  const uploadActivityMutation = useMutation({
    mutationFn: async ({ dayId, file }: { dayId: number; file: File }) => {
      setUploadingActivity(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `activity-${dayId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('ramadan-activities')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ramadan-activities')
        .getPublicUrl(fileName);

      // Determine type
      let type = 'document';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      else if (file.type.startsWith('image/')) type = 'document';

      const existingActivities = getActivitiesForDay(dayId);
      const { error: insertError } = await supabase
        .from('ramadan_day_activities')
        .insert({
          day_id: dayId,
          type,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          order_index: existingActivities.length,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-activities'] });
      toast({ title: 'Activité ajoutée avec succès' });
      setUploadingActivity(false);
    },
    onError: (error) => {
      console.error('Upload activity error:', error);
      toast({ title: 'Erreur lors du téléversement', variant: 'destructive' });
      setUploadingActivity(false);
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from('ramadan_day_activities').delete().eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-activities'] });
      toast({ title: 'Activité supprimée' });
    },
  });

  // Toggle is_unlocked on a day (global unlock)
  const toggleDayUnlockMutation = useMutation({
    mutationFn: async ({ dayId, isUnlocked }: { dayId: number; isUnlocked: boolean }) => {
      const { error } = await (supabase as any).from('ramadan_days').update({ is_unlocked: isUnlocked }).eq('id', dayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-days-manager'] });
      queryClient.invalidateQueries({ queryKey: ['ramadan-days'] });
      toast({ title: 'Statut de verrouillage mis à jour' });
    },
  });

  // Add per-student exception
  const addExceptionMutation = useMutation({
    mutationFn: async ({ userId, dayId }: { userId: string; dayId: number }) => {
      const { error } = await (supabase as any).from('ramadan_day_exceptions').upsert({ user_id: userId, day_id: dayId, is_unlocked: true }, { onConflict: 'user_id,day_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-day-exceptions'] });
      toast({ title: 'Jour déverrouillé pour cet élève' });
      setSelectedStudentForException('');
    },
  });

  // Delete exception
  const deleteExceptionMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const { error } = await (supabase as any).from('ramadan_day_exceptions').delete().eq('id', exceptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-day-exceptions'] });
      toast({ title: 'Exception supprimée' });
    },
  });


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
    if (file && selectedDay && !uploadVideoMutation.isPending) {
      uploadVideoMutation.mutate({ dayId: selectedDay, file });
    }
    e.target.value = '';
  };

  const handleActivityFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedDay) {
      uploadActivityMutation.mutate({ dayId: selectedDay, file });
    }
    e.target.value = '';
  };

  const handleOpenDay = (dayId: number, section?: 'video' | 'quiz') => {
    setSelectedDay(dayId);
    setScrollToSection(section || null);
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

  // Scroll to section after dialog opens
  useEffect(() => {
    if (selectedDay && scrollToSection) {
      const timer = setTimeout(() => {
        const ref = scrollToSection === 'video' ? videoSectionRef : quizSectionRef;
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setScrollToSection(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedDay, scrollToSection]);

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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
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
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
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

      {/* Days Grid - Calendar style */}
      <h3 className="text-lg font-semibold text-foreground">📅 Les 30 jours</h3>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {days.map((day) => {
          const videoCount = getVideosForDay(day.id).length;
          const hasVideo = videoCount > 0 || !!day.video_url;
          const quizCount = getQuizzesForDay(day.id).length;
          const hasQuiz = quizCount > 0;
          const isComplete = hasVideo && hasQuiz;
          const isPartial = hasVideo || hasQuiz;
          const isGloballyUnlocked = (day as any).is_unlocked;
          const hasExceptions = getExceptionsForDay(day.id).length > 0;

          const getDayBg = () => {
            if (isComplete) return 'bg-gradient-to-br from-green-600 to-green-700 text-white';
            if (isPartial) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white';
            return 'bg-[hsl(40,30%,92%)] text-[hsl(30,20%,50%)]';
          };

          return (
            <div
              key={day.id}
              className={`relative rounded-lg p-1 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 min-h-[56px] ${getDayBg()}`}
              onClick={() => handleOpenDay(day.id)}
            >
              {/* Lock indicator */}
              <span className="absolute top-0.5 left-0.5 text-[7px] leading-none">
                {isGloballyUnlocked ? '🔓' : hasExceptions ? '🔑' : '🔒'}
              </span>

              {/* Day number */}
              <span className="text-[10px] font-bold leading-none">{day.day_number}</span>

              {/* Theme title preview */}
              {day.theme && (
                <span className="text-[6px] leading-tight text-center opacity-90 line-clamp-2 max-w-full px-0.5 mt-0.5">
                  {day.theme}
                </span>
              )}

              {/* Content counts */}
              {(isComplete || isPartial) && (
                <span className="text-[6px] opacity-70 leading-none mt-0.5">{videoCount}V+{quizCount}Q</span>
              )}

              {/* Admin action icons */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0.5">
                <button
                  className="text-[8px] hover:scale-125 transition-transform z-10"
                  onClick={(e) => { e.stopPropagation(); handleOpenDay(day.id, 'video'); }}
                  title="Gérer les vidéos"
                >
                  🎬
                </button>
                <button
                  className="text-[8px] hover:scale-125 transition-transform z-10"
                  onClick={(e) => { e.stopPropagation(); handleOpenDay(day.id, 'quiz'); }}
                  title="Gérer le quiz"
                >
                  ✏️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-green-600 to-green-700" />
          <span>Complet</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-500" />
          <span>Partiel</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[hsl(40,30%,92%)]" />
          <span>Vide</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔒</span><span>Verrouillé</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔓</span><span>Déverrouillé</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔑</span><span>Exceptions</span>
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
            {/* Unlock Section */}
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  {(currentDayData as any)?.is_unlocked ? <Unlock className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                  Déverrouillage global
                </Label>
                <Switch
                  checked={(currentDayData as any)?.is_unlocked ?? false}
                  onCheckedChange={(checked) => {
                    if (selectedDay) toggleDayUnlockMutation.mutate({ dayId: selectedDay, isUnlocked: checked });
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {(currentDayData as any)?.is_unlocked
                  ? '🔓 Ce jour est déverrouillé pour tous les élèves'
                  : '🔒 Verrouillage automatique actif (fenêtre de 4 jours)'}
              </p>

              {/* Per-student exceptions */}
              <div className="border-t pt-3 space-y-2">
                <Label className="text-xs font-semibold">🔑 Déverrouiller pour un élève spécifique</Label>
                <div className="flex gap-2">
                  <Select value={selectedStudentForException} onValueChange={setSelectedStudentForException}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Sélectionner un élève..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter(p => !currentExceptions.some(e => e.user_id === p.user_id))
                        .map(p => (
                          <SelectItem key={p.user_id} value={p.user_id} className="text-xs">
                            {p.full_name || p.email || 'Sans nom'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!selectedStudentForException || !selectedDay || addExceptionMutation.isPending}
                    onClick={() => {
                      if (selectedStudentForException && selectedDay) {
                        addExceptionMutation.mutate({ userId: selectedStudentForException, dayId: selectedDay });
                      }
                    }}
                  >
                    {addExceptionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                  </Button>
                </div>
                {currentExceptions.length > 0 && (
                  <div className="space-y-1">
                    {currentExceptions.map(exc => {
                      const profile = profiles.find(p => p.user_id === exc.user_id);
                      return (
                        <div key={exc.id} className="flex items-center justify-between p-1.5 rounded bg-green-500/10 text-xs">
                          <span className="truncate">{profile?.full_name || profile?.email || exc.user_id}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive"
                            onClick={() => deleteExceptionMutation.mutate(exc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

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
            <div className="space-y-3" ref={videoSectionRef}>
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
                disabled={uploading || uploadVideoMutation.isPending}
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
            <div className="space-y-4 border-t pt-4" ref={quizSectionRef}>
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
            <div className="space-y-3 border-t pt-4">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                Activités du jour ({currentActivities.length})
              </Label>

              {currentActivities.length > 0 && (
                <div className="space-y-2">
                  {currentActivities.map((activity) => {
                    const isVideo = activity.file_type?.startsWith('video/');
                    const isAudio = activity.file_type?.startsWith('audio/');
                    const isImage = activity.file_type?.startsWith('image/');
                    return (
                      <div key={activity.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                        <div className="flex-shrink-0">
                          {isVideo ? <Video className="h-4 w-4 text-primary" /> :
                           isAudio ? <Volume2 className="h-4 w-4 text-primary" /> :
                           isImage ? <Image className="h-4 w-4 text-primary" /> :
                           <FileText className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-medium">{activity.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">{activity.type}</p>
                        </div>
                        {isImage && (
                          <img src={activity.file_url} alt="" className="h-10 w-16 rounded object-cover flex-shrink-0" />
                        )}
                        {isVideo && (
                          <video src={activity.file_url} className="h-10 w-16 rounded object-cover bg-black flex-shrink-0" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive flex-shrink-0"
                          onClick={() => setDeleteTarget({ type: 'activity', id: activity.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                ref={activityInputRef}
                type="file"
                accept="image/*,video/*,audio/*,application/pdf,.pdf"
                onChange={handleActivityFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => activityInputRef.current?.click()}
                disabled={uploadingActivity}
                variant="outline"
                className="w-full"
              >
                {uploadingActivity ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Téléversement...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Ajouter une activité (PDF, image, vidéo, audio)</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <ConfirmDeleteDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            if (!target) return;
            if (target.type === 'quiz' && target.id) {
              deleteQuizMutation.mutate(target.id);
              setQuestions(prev => prev.filter(q => q.existingId !== target.id));
            } else if (target.type === 'allQuizzes' && target.dayId) {
              deleteAllQuizzesMutation.mutate(target.dayId);
            } else if (target.type === 'video' && target.id) {
              deleteVideoMutation.mutate(target.id);
            } else if (target.type === 'activity' && target.id) {
              deleteActivityMutation.mutate(target.id);
            }
          }}
          title={
            deleteTarget.type === 'allQuizzes' ? 'Supprimer toutes les questions ?' :
            deleteTarget.type === 'video' ? 'Supprimer cette vidéo ?' :
            deleteTarget.type === 'activity' ? 'Supprimer cette activité ?' :
            'Supprimer cette question ?'
          }
          description={
            deleteTarget.type === 'allQuizzes'
              ? 'Toutes les questions de ce jour seront supprimées définitivement.'
              : deleteTarget.type === 'video'
              ? 'Cette vidéo sera supprimée définitivement.'
              : deleteTarget.type === 'activity'
              ? 'Cette activité sera supprimée définitivement.'
              : 'Cette question sera supprimée définitivement.'
          }
        />
      )}
    </div>
  );
};

export default AdminRamadanManager;
