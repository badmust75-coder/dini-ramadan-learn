import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminRamadanStudentDetail from './AdminRamadanStudentDetail';

type ModuleType = 'ramadan' | 'nourania' | 'alphabet' | 'invocations' | 'sourates' | 'prayer';

interface AdminModuleProgressProps {
  module: ModuleType;
  onBack: () => void;
}

const moduleConfig: Record<ModuleType, { title: string; titleArabic: string }> = {
  ramadan: { title: 'Ramadan', titleArabic: 'رمضان' },
  nourania: { title: 'Nourania', titleArabic: 'النورانية' },
  alphabet: { title: 'Alphabet', titleArabic: 'الحروف' },
  invocations: { title: 'Invocations', titleArabic: 'الأذكار' },
  sourates: { title: 'Sourates', titleArabic: 'السور' },
  prayer: { title: 'Prière', titleArabic: 'الصلاة' },
};

const AdminModuleProgress = ({ module, onBack }: AdminModuleProgressProps) => {
  const { data: students, isLoading, isError } = useQuery({
    queryKey: ['admin-module-progress', module],
    retry: 2,
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Get progress data based on module type
      const progressData = await Promise.all(
        profiles.map(async (profile) => {
          let validated = 0;
          let total = 0;

          switch (module) {
            case 'ramadan': {
              const [progressRes, totalRes] = await Promise.all([
                supabase
                  .from('user_ramadan_progress')
                  .select('video_watched, quiz_completed, pdf_read')
                  .eq('user_id', profile.user_id),
                supabase
                  .from('ramadan_days')
                  .select('*', { count: 'exact', head: true }),
              ]);
              validated = progressRes.data?.filter(p => p.quiz_completed).length || 0;
              total = totalRes.count || 0;
              break;
            }
            case 'nourania': {
              const [progressRes, totalRes] = await Promise.all([
                supabase
                  .from('user_nourania_progress')
                  .select('is_validated')
                  .eq('user_id', profile.user_id),
                supabase
                  .from('nourania_lessons')
                  .select('*', { count: 'exact', head: true }),
              ]);
              validated = progressRes.data?.filter(p => p.is_validated).length || 0;
              total = totalRes.count || 0;
              break;
            }
            case 'alphabet': {
              const [progressRes, totalRes] = await Promise.all([
                supabase
                  .from('user_alphabet_progress')
                  .select('is_validated')
                  .eq('user_id', profile.user_id),
                supabase
                  .from('alphabet_letters')
                  .select('*', { count: 'exact', head: true }),
              ]);
              validated = progressRes.data?.filter(p => p.is_validated).length || 0;
              total = totalRes.count || 0;
              break;
            }
            case 'invocations': {
              const [progressRes, totalRes] = await Promise.all([
                supabase
                  .from('user_invocation_progress')
                  .select('is_memorized')
                  .eq('user_id', profile.user_id),
                supabase
                  .from('invocations')
                  .select('*', { count: 'exact', head: true }),
              ]);
              validated = progressRes.data?.filter(p => p.is_memorized).length || 0;
              total = totalRes.count || 0;
              break;
            }
            case 'sourates': {
              const [progressRes, totalRes] = await Promise.all([
                supabase
                  .from('user_sourate_progress')
                  .select('is_validated')
                  .eq('user_id', profile.user_id),
                supabase
                  .from('sourates')
                  .select('*', { count: 'exact', head: true }),
              ]);
              validated = progressRes.data?.filter(p => p.is_validated).length || 0;
              total = totalRes.count || 0;
              break;
            }
            case 'prayer': {
              const [progressRes, totalRes] = await Promise.all([
                supabase
                  .from('user_prayer_progress')
                  .select('is_validated')
                  .eq('user_id', profile.user_id),
                supabase
                  .from('prayer_categories')
                  .select('*', { count: 'exact', head: true }),
              ]);
              validated = progressRes.data?.filter(p => p.is_validated).length || 0;
              total = totalRes.count || 0;
              break;
            }
          }

          const percentage = total > 0 ? Math.round((validated / total) * 100) : 0;

          return {
            ...profile,
            validated,
            total,
            percentage,
          };
        })
      );

      return progressData;
    },
  });

  const config = moduleConfig[module];

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const selectedStudentData = students?.find(s => s.user_id === selectedStudent);

  // Show Ramadan detail view when a student is selected and module is ramadan
  if (selectedStudent && module === 'ramadan') {
    const studentData = students?.find(s => s.user_id === selectedStudent);
    return (
      <AdminRamadanStudentDetail
        studentId={selectedStudent}
        studentName={studentData?.full_name || 'Élève'}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-20 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{config.title}</h2>
          <p className="text-sm text-muted-foreground font-arabic">{config.titleArabic}</p>
        </div>
      </div>

      <div className="space-y-3">
        {students?.map((student) => (
          <Card key={student.user_id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedStudent(student.user_id)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {student.full_name || 'Élève'}
                  </p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
                <Badge variant={student.percentage >= 100 ? 'default' : 'outline'}>
                  {student.percentage}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progression</span>
                  <span>{student.validated}/{student.total}</span>
                </div>
                <Progress value={student.percentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}

        {(!students || students.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun élève inscrit
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModuleProgress;
