import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, User, Search, ChevronRight, 
  Moon, Sparkles, BookOpen, Hand, BookMarked,
  MessageSquare, MoreVertical, CalendarIcon
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import AdminStudentGroups from './AdminStudentGroups';

interface StudentProgress {
  sourates: { validated: number; total: number };
  ramadan: { completed: number; total: number };
  nourania: { validated: number; total: number };
  prayer: { validated: number; total: number };
  alphabet: { validated: number; total: number };
  invocations: { memorized: number; total: number };
}

interface AdminStudentDetailsProps {
  onBack: () => void;
}

const AdminStudentDetails = ({ onBack }: AdminStudentDetailsProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string; email: string; full_name: string | null;
  } | null>(null);

  // DOB dialog state
  const [dobDialogStudent, setDobDialogStudent] = useState<{ id: string; full_name: string | null } | null>(null);
  const [dobValue, setDobValue] = useState('');
  const [savingDob, setSavingDob] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ['admin-students-details'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, created_at, date_of_birth');
      if (error) throw error;
      return profiles || [];
    },
  });

  const { data: studentProgress } = useQuery({
    queryKey: ['student-progress-details', selectedStudent?.id],
    enabled: !!selectedStudent,
    queryFn: async () => {
      if (!selectedStudent) return null;
      const [
        { data: sourateProgress }, { data: ramadanProgress },
        { data: nouraniaProgress }, { data: prayerProgress },
        { data: alphabetProgress }, { data: invocationProgress },
        { count: totalSourates }, { count: totalRamadanDays },
        { count: totalNouraniaLessons }, { count: totalPrayerCategories },
        { count: totalAlphabetLetters }, { count: totalInvocations },
      ] = await Promise.all([
        supabase.from('user_sourate_progress').select('is_validated').eq('user_id', selectedStudent.id),
        supabase.from('user_ramadan_progress').select('video_watched, quiz_completed, pdf_read').eq('user_id', selectedStudent.id),
        supabase.from('user_nourania_progress').select('is_validated').eq('user_id', selectedStudent.id),
        supabase.from('user_prayer_progress').select('is_validated').eq('user_id', selectedStudent.id),
        supabase.from('user_alphabet_progress').select('is_validated').eq('user_id', selectedStudent.id),
        supabase.from('user_invocation_progress').select('is_memorized').eq('user_id', selectedStudent.id),
        supabase.from('sourates').select('*', { count: 'exact', head: true }),
        supabase.from('ramadan_days').select('*', { count: 'exact', head: true }),
        supabase.from('nourania_lessons').select('*', { count: 'exact', head: true }),
        supabase.from('prayer_categories').select('*', { count: 'exact', head: true }),
        supabase.from('alphabet_letters').select('*', { count: 'exact', head: true }),
        supabase.from('invocations').select('*', { count: 'exact', head: true }),
      ]);
      return {
        sourates: { validated: sourateProgress?.filter(p => p.is_validated).length || 0, total: totalSourates || 0 },
        ramadan: { completed: ramadanProgress?.filter(p => p.quiz_completed).length || 0, total: totalRamadanDays || 0 },
        nourania: { validated: nouraniaProgress?.filter(p => p.is_validated).length || 0, total: totalNouraniaLessons || 0 },
        prayer: { validated: prayerProgress?.filter(p => p.is_validated).length || 0, total: totalPrayerCategories || 0 },
        alphabet: { validated: alphabetProgress?.filter(p => p.is_validated).length || 0, total: totalAlphabetLetters || 0 },
        invocations: { memorized: invocationProgress?.filter(p => p.is_memorized).length || 0, total: totalInvocations || 0 },
      } as StudentProgress;
    },
  });

  const filteredStudents = students?.filter((s) =>
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // DOB helpers
  const handleDobInputChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    if (digits.length <= 2) formatted = digits;
    else if (digits.length <= 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    else formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
    setDobValue(formatted);
  };

  const parseDobToISO = (dob: string): string | null => {
    const match = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime()) || d.getDate() !== parseInt(day) || d.getMonth() !== parseInt(month) - 1) return null;
    return `${year}-${month}-${day}`;
  };

  const openDobDialog = (student: any) => {
    setDobDialogStudent({ id: student.user_id, full_name: student.full_name });
    if (student.date_of_birth) {
      const [y, m, d] = student.date_of_birth.split('-');
      setDobValue(`${d}/${m}/${y}`);
    } else {
      setDobValue('');
    }
  };

  const handleSaveDob = async () => {
    if (!dobDialogStudent) return;
    const iso = parseDobToISO(dobValue);
    if (!iso) {
      toast.error('Date invalide. Format : JJ/MM/AAAA');
      return;
    }
    setSavingDob(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ date_of_birth: iso })
        .eq('user_id', dobDialogStudent.id);
      if (error) throw error;
      toast.success('Date de naissance mise à jour ✓');
      queryClient.invalidateQueries({ queryKey: ['admin-students-details'] });
      setDobDialogStudent(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingDob(false);
    }
  };

  const progressBar = (value: number, total: number, label: string, icon: React.ReactNode) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{label}</span>
          </div>
          <Badge variant={percentage >= 100 ? 'default' : 'outline'}>{percentage}%</Badge>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{value}/{total}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse"><CardContent className="h-20 bg-muted/50" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Élèves</h2>
          <p className="text-sm text-muted-foreground">{students?.length || 0} élève(s)</p>
        </div>
      </div>

      <AdminStudentGroups />

      <div className="border-t pt-4 mt-2">
        <h3 className="text-base font-semibold text-foreground mb-3">📋 Liste des élèves</h3>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un élève..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filteredStudents?.map((student) => (
          <Card key={student.user_id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => setSelectedStudent({ id: student.user_id, email: student.email || '', full_name: student.full_name })}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{student.full_name || 'Élève'}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedStudent({ id: student.user_id, email: student.email || '', full_name: student.full_name })}>
                    <BookOpen className="h-4 w-4 mr-2" /> Voir la progression
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openDobDialog(student)}>
                    <CalendarIcon className="h-4 w-4 mr-2" /> 📅 Changer Date Naissance
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
        {filteredStudents?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">Aucun élève trouvé</div>
        )}
      </div>

      {/* Progress dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> {selectedStudent?.full_name || 'Élève'}
            </DialogTitle>
          </DialogHeader>
          {studentProgress && (
            <div className="space-y-6 mt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium">{selectedStudent?.email}</p>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Progression par module</h4>
                {progressBar(studentProgress.ramadan.completed, studentProgress.ramadan.total, 'Ramadan', <Moon className="h-4 w-4 text-gold" />)}
                {progressBar(studentProgress.nourania.validated, studentProgress.nourania.total, 'Nourania', <Sparkles className="h-4 w-4 text-primary" />)}
                {progressBar(studentProgress.alphabet.validated, studentProgress.alphabet.total, 'Alphabet', <BookOpen className="h-4 w-4 text-gold" />)}
                {progressBar(studentProgress.invocations.memorized, studentProgress.invocations.total, 'Invocations', <MessageSquare className="h-4 w-4 text-primary" />)}
                {progressBar(studentProgress.sourates.validated, studentProgress.sourates.total, 'Sourates', <BookMarked className="h-4 w-4 text-gold" />)}
                {progressBar(studentProgress.prayer.validated, studentProgress.prayer.total, 'Prière', <Hand className="h-4 w-4 text-primary" />)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DOB dialog */}
      <Dialog open={!!dobDialogStudent} onOpenChange={() => setDobDialogStudent(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>📅 Date de naissance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{dobDialogStudent?.full_name || 'Élève'}</p>
          <div className="space-y-3 mt-2">
            <Label>Date (JJ/MM/AAAA)</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="JJ/MM/AAAA"
                value={dobValue}
                onChange={(e) => handleDobInputChange(e.target.value)}
                className="pl-10"
                maxLength={10}
              />
            </div>
            <Button onClick={handleSaveDob} disabled={savingDob || !dobValue} className="w-full">
              {savingDob && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Need Loader2 import
import { Loader2 } from 'lucide-react';

export default AdminStudentDetails;
