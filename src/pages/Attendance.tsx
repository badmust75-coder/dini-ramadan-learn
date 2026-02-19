import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late';

const STATUS_DISPLAY: Record<AttendanceStatus, { color: string; label: string }> = {
  present: { color: 'bg-green-500', label: 'Présent' },
  absent: { color: 'bg-red-500', label: 'Absent' },
  late: { color: 'bg-yellow-400', label: 'En retard' },
};

const Attendance = () => {
  const { user } = useAuth();

  // Personal attendance
  const { data: myRecords = [] } = useQuery({
    queryKey: ['my-attendance', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // All records for class overview
  const { data: allRecords = [] } = useQuery({
    queryKey: ['all-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch student names
  const { data: students = [] } = useQuery({
    queryKey: ['attendance-students-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_approved', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Personal stats
  const myStats = useMemo(() => {
    const present = myRecords.filter(r => r.status === 'present').length;
    const absent = myRecords.filter(r => r.status === 'absent').length;
    const late = myRecords.filter(r => r.status === 'late').length;
    return { present, absent, late, total: myRecords.length };
  }, [myRecords]);

  // Class overview data
  const dates = useMemo(() => {
    const dateSet = new Set(allRecords.map(r => r.date));
    return Array.from(dateSet).sort();
  }, [allRecords]);

  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    allRecords.forEach(r => map.set(`${r.user_id}-${r.date}`, r.status as AttendanceStatus));
    return map;
  }, [allRecords]);

  return (
    <AppLayout title="Ma Présence">
      <div className="p-4 space-y-6">
        {/* Personal Summary */}
        <div className="text-center py-4 animate-fade-in">
          <span className="text-4xl">📋</span>
          <h2 className="text-xl font-bold text-foreground mt-2">Ma Présence</h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{myStats.present}</p>
              <p className="text-xs text-muted-foreground">Présent</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{myStats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{myStats.late}</p>
              <p className="text-xs text-muted-foreground">En retard</p>
            </CardContent>
          </Card>
        </div>

        {myStats.total > 0 && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-foreground font-medium">
                🎉 Tu as été présent <span className="text-green-600 font-bold">{myStats.present}</span> fois sur <span className="font-bold">{myStats.total}</span> séances !
              </p>
            </CardContent>
          </Card>
        )}

        {/* Personal History */}
        {myRecords.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-foreground mb-3">📅 Mon historique</h3>
              {myRecords.slice(0, 10).map(record => {
                const status = record.status as AttendanceStatus;
                const display = STATUS_DISPLAY[status];
                return (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-foreground">
                      {format(parseISO(record.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-5 h-5 rounded-full', display.color)} />
                      <span className="text-xs text-muted-foreground">{display.label}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Class Overview */}
        {dates.length > 0 && students.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-3">👥 Vue de la classe</h3>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                {Object.entries(STATUS_DISPLAY).map(([key, val]) => (
                  <span key={key} className="flex items-center gap-1">
                    <span className={cn('w-3 h-3 rounded-full inline-block', val.color)} />
                    {val.label}
                  </span>
                ))}
              </div>

              <ScrollArea className="w-full">
                <div className="min-w-max">
                  {/* Header */}
                  <div className="flex border-b border-border">
                    <div className="w-32 shrink-0 px-2 py-2 font-semibold text-foreground text-xs sticky left-0 bg-card z-10">
                      Élève
                    </div>
                    {dates.slice(-7).map(date => (
                      <div key={date} className="w-12 shrink-0 text-center py-2 text-[10px] text-muted-foreground border-l border-border">
                        {format(parseISO(date), 'dd/MM', { locale: fr })}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {students.map((student, idx) => (
                    <div
                      key={student.user_id}
                      className={cn(
                        'flex border-b border-border last:border-0',
                        student.user_id === user?.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                      )}
                    >
                      <div className="w-32 shrink-0 px-2 py-2 text-xs text-foreground truncate sticky left-0 bg-inherit z-10 flex items-center gap-1">
                        {student.user_id === user?.id && <span className="text-yellow-500">⭐</span>}
                        {(student.full_name || 'Sans nom').split(' ')[0]}
                      </div>
                      {dates.slice(-7).map(date => {
                        const status = recordMap.get(`${student.user_id}-${date}`);
                        const display = status ? STATUS_DISPLAY[status] : null;
                        return (
                          <div key={date} className="w-12 shrink-0 flex items-center justify-center border-l border-border py-2">
                            {display ? (
                              <div className={cn('w-5 h-5 rounded-full', display.color)} />
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-muted-foreground/20" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Attendance;
