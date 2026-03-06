import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, User, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminStudentGroups from './AdminStudentGroups';

interface StudentProgress {
  sourates: { validated: number; total: number };
  ramadan: { completed: number; total: number };
  nourania: { validated: number; total: number };
  prayer: { validated: number; total: number };
  alphabet: { validated: number; total: number };
  invocations: { memorized: number; total: number };
}

const AdminStudents = () => {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; email: string; full_name: string | null } | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, created_at');

      if (error) throw error;
      return profiles || [];
    },
  });

  const { data: studentProgress } = useQuery({
    queryKey: ['student-progress', selectedStudent?.id],
    enabled: !!selectedStudent,
    queryFn: async () => {
      if (!selectedStudent) return null;

      const [
        { data: sourateProgress },
        { data: ramadanProgress },
        { data: nouraniaProgress },
        { data: prayerProgress },
        { data: alphabetProgress },
        { data: invocationProgress },
        { count: totalSourates },
        { count: totalRamadanDays },
        { count: totalNouraniaLessons },
        { count: totalPrayerCategories },
        { count: totalAlphabetLetters },
        { count: totalInvocations },
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
        sourates: {
          validated: sourateProgress?.filter(p => p.is_validated).length || 0,
          total: totalSourates || 0,
        },
        ramadan: {
          completed: ramadanProgress?.filter(p => p.video_watched && p.quiz_completed && p.pdf_read).length || 0,
          total: totalRamadanDays || 0,
        },
        nourania: {
          validated: nouraniaProgress?.filter(p => p.is_validated).length || 0,
          total: totalNouraniaLessons || 0,
        },
        prayer: {
          validated: prayerProgress?.filter(p => p.is_validated).length || 0,
          total: totalPrayerCategories || 0,
        },
        alphabet: {
          validated: alphabetProgress?.filter(p => p.is_validated).length || 0,
          total: totalAlphabetLetters || 0,
        },
        invocations: {
          memorized: invocationProgress?.filter(p => p.is_memorized).length || 0,
          total: totalInvocations || 0,
        },
      } as StudentProgress;
    },
  });

  const filteredStudents = students?.filter((s) =>
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-20 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  const progressBar = (value: number, total: number) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <Progress value={percentage} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground w-12">{value}/{total}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Groups section */}
      <AdminStudentGroups />

      {/* Separator */}
      <div className="border-t pt-4">
        <h3 className="text-base font-semibold text-foreground mb-3">📋 Liste des élèves</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un élève..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filteredStudents?.map((student) => (
          <Card
            key={student.user_id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedStudent({
              id: student.user_id,
              email: student.email || '',
              full_name: student.full_name,
            })}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {student.full_name || 'Élève sans nom'}
                  </p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}

        {filteredStudents?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun élève trouvé
          </div>
        )}
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedStudent?.full_name || 'Élève sans nom'}
            </DialogTitle>
          </DialogHeader>

          {studentProgress && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium">{selectedStudent?.email}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Progression par module</h4>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Sourates</span>
                      <Badge variant="outline">
                        {Math.round((studentProgress.sourates.validated / Math.max(studentProgress.sourates.total, 1)) * 100)}%
                      </Badge>
                    </div>
                    {progressBar(studentProgress.sourates.validated, studentProgress.sourates.total)}
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Ramadan</span>
                      <Badge variant="outline">
                        {Math.round((studentProgress.ramadan.completed / Math.max(studentProgress.ramadan.total, 1)) * 100)}%
                      </Badge>
                    </div>
                    {progressBar(studentProgress.ramadan.completed, studentProgress.ramadan.total)}
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Nourania</span>
                      <Badge variant="outline">
                        {Math.round((studentProgress.nourania.validated / Math.max(studentProgress.nourania.total, 1)) * 100)}%
                      </Badge>
                    </div>
                    {progressBar(studentProgress.nourania.validated, studentProgress.nourania.total)}
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Prière</span>
                      <Badge variant="outline">
                        {Math.round((studentProgress.prayer.validated / Math.max(studentProgress.prayer.total, 1)) * 100)}%
                      </Badge>
                    </div>
                    {progressBar(studentProgress.prayer.validated, studentProgress.prayer.total)}
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Alphabet</span>
                      <Badge variant="outline">
                        {Math.round((studentProgress.alphabet.validated / Math.max(studentProgress.alphabet.total, 1)) * 100)}%
                      </Badge>
                    </div>
                    {progressBar(studentProgress.alphabet.validated, studentProgress.alphabet.total)}
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Invocations</span>
                      <Badge variant="outline">
                        {Math.round((studentProgress.invocations.memorized / Math.max(studentProgress.invocations.total, 1)) * 100)}%
                      </Badge>
                    </div>
                    {progressBar(studentProgress.invocations.memorized, studentProgress.invocations.total)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudents;
