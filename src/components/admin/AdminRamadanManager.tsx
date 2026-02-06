import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Video, HelpCircle, Plus, Trash2, Save, Loader2, Rocket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

const AdminRamadanManager = ({ onBack }: AdminRamadanManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Quiz form state
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);

  // Fetch ramadan settings (start_enabled)
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

  // Get quiz for a specific day
  const getQuizForDay = (dayId: number) => quizzes.find(q => q.day_id === dayId);
  const currentDayData = days.find(d => d.id === selectedDay);
  const currentQuiz = selectedDay ? getQuizForDay(selectedDay) : null;

  // Upload video mutation
  const uploadVideoMutation = useMutation({
    mutationFn: async ({ dayId, file }: { dayId: number; file: File }) => {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `day-${dayId}-${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('ramadan-videos')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ramadan-videos')
        .getPublicUrl(fileName);
      
      // Update day with video URL
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

  // Save/Update quiz mutation
  const saveQuizMutation = useMutation({
    mutationFn: async ({ dayId, question, options, correctOption, existingQuizId }: {
      dayId: number;
      question: string;
      options: string[];
      correctOption: number;
      existingQuizId?: string;
    }) => {
      if (existingQuizId) {
        const { error } = await supabase
          .from('ramadan_quizzes')
          .update({
            question,
            options: options as unknown as string,
            correct_option: correctOption,
          })
          .eq('id', existingQuizId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ramadan_quizzes')
          .insert({
            day_id: dayId,
            question,
            options: options as unknown as string,
            correct_option: correctOption,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-quizzes'] });
      toast({ title: 'Quiz enregistré avec succès' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de l\'enregistrement', variant: 'destructive' });
    },
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      // First delete all responses for this quiz
      await supabase.from('quiz_responses').delete().eq('quiz_id', quizId);
      
      const { error } = await supabase
        .from('ramadan_quizzes')
        .delete()
        .eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-quizzes'] });
      toast({ title: 'Quiz supprimé' });
      setQuizQuestion('');
      setQuizOptions(['', '', '', '']);
      setCorrectOption(0);
    },
  });

  // Toggle start enabled mutation
  const toggleStartMutation = useMutation({
    mutationFn: async () => {
      const newValue = !settings?.start_enabled;
      const { error } = await supabase
        .from('ramadan_settings')
        .update({ 
          start_enabled: newValue, 
          updated_at: new Date().toISOString() 
        })
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
    const quiz = getQuizForDay(dayId);
    if (quiz) {
      setQuizQuestion(quiz.question);
      setQuizOptions(quiz.options);
      setCorrectOption(quiz.correct_option ?? 0);
    } else {
      setQuizQuestion('');
      setQuizOptions(['', '', '', '']);
      setCorrectOption(0);
    }
  };

  const handleSaveQuiz = () => {
    if (!selectedDay || !quizQuestion.trim() || quizOptions.some(o => !o.trim())) {
      toast({ title: 'Veuillez remplir tous les champs', variant: 'destructive' });
      return;
    }
    
    saveQuizMutation.mutate({
      dayId: selectedDay,
      question: quizQuestion,
      options: quizOptions,
      correctOption,
      existingQuizId: currentQuiz?.id,
    });
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
          <p className="text-sm text-muted-foreground">Téléverser vidéos et créer quiz</p>
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

      {/* Days Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
        {days.map((day) => {
          const hasVideo = !!day.video_url;
          const hasQuiz = !!getQuizForDay(day.id);
          
          return (
            <button
              key={day.id}
              onClick={() => handleOpenDay(day.id)}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200
                ${hasVideo && hasQuiz 
                  ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' 
                  : hasVideo || hasQuiz
                  ? 'bg-gradient-to-br from-gold to-gold-dark text-primary'
                  : 'bg-muted hover:bg-muted/80 text-foreground'
                }
              `}
            >
              <span>{day.day_number}</span>
              <div className="flex gap-0.5 mt-1">
                {hasVideo && <Video className="h-3 w-3" />}
                {hasQuiz && <HelpCircle className="h-3 w-3" />}
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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
                  <p className="text-xs text-muted-foreground truncate">
                    {currentDayData.video_url}
                  </p>
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

            {/* Quiz Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <HelpCircle className="h-4 w-4 text-gold" />
                  Quiz du jour
                </Label>
                {currentQuiz && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteQuizMutation.mutate(currentQuiz.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Question</Label>
                  <Textarea
                    value={quizQuestion}
                    onChange={(e) => setQuizQuestion(e.target.value)}
                    placeholder="Entrez la question du quiz..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Options (sélectionnez la bonne réponse)</Label>
                  {quizOptions.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={correctOption === idx}
                        onChange={() => setCorrectOption(idx)}
                        className="h-4 w-4 accent-green-500"
                      />
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...quizOptions];
                          newOptions[idx] = e.target.value;
                          setQuizOptions(newOptions);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className={correctOption === idx ? 'border-green-500' : ''}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSaveQuiz}
                  disabled={saveQuizMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {currentQuiz ? 'Mettre à jour le quiz' : 'Créer le quiz'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRamadanManager;
