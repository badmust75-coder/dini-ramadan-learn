import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Trash2, Users, Search, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const GROUP_COLORS = [
  { value: 'bg-blue-500', label: 'Bleu', preview: 'bg-blue-500' },
  { value: 'bg-emerald-500', label: 'Vert', preview: 'bg-emerald-500' },
  { value: 'bg-amber-500', label: 'Orange', preview: 'bg-amber-500' },
  { value: 'bg-rose-500', label: 'Rose', preview: 'bg-rose-500' },
  { value: 'bg-purple-500', label: 'Violet', preview: 'bg-purple-500' },
  { value: 'bg-cyan-500', label: 'Cyan', preview: 'bg-cyan-500' },
  { value: 'bg-indigo-500', label: 'Indigo', preview: 'bg-indigo-500' },
  { value: 'bg-pink-500', label: 'Pink', preview: 'bg-pink-500' },
];

interface StudentGroup {
  id: string;
  name: string;
  color: string;
  display_order: number;
  memberCount: number;
  members: { user_id: string; full_name: string | null; email: string | null }[];
}

type AgeFilter = 'tous' | 'petits' | 'jeunes' | 'adultes';
type GenderFilter = 'tous' | 'fille' | 'garcon';

const getAgeGroup = (dateOfBirth: string | null): string => {
  if (!dateOfBirth) return 'inconnu';
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 10) return 'petits';
  if (age < 16) return 'jeunes';
  return 'adultes';
};

// Group card component with native HTML5 drag & drop
const DraggableGroupCard = ({
  group,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver,
}: {
  group: StudentGroup;
  onEdit: (group: StudentGroup) => void;
  onDelete: (groupId: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
}) => {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, group.id)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, group.id)}
      className={`transition-all cursor-grab active:cursor-grabbing ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 cursor-grab" />
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${group.color}`} />
            <span className="text-sm font-bold leading-tight break-words">{group.name}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(group)}>
                <Pencil className="h-4 w-4 mr-2" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(group.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-2">
          <Badge variant="secondary" className="text-xs">
            {group.memberCount} élève{group.memberCount > 1 ? 's' : ''}
          </Badge>
        </div>
        {group.members.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {group.members.slice(0, 3).map(m => (
              <span key={m.user_id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {m.full_name || m.email?.split('@')[0] || '?'}
              </span>
            ))}
            {group.members.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{group.members.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminStudentGroups = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('bg-blue-500');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('tous');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('tous');

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Fetch groups with members
  const { data: groups = [] } = useQuery({
    queryKey: ['student-groups'],
    queryFn: async () => {
      const { data: groupsData, error } = await (supabase as any)
        .from('student_groups')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;

      const { data: members } = await (supabase as any)
        .from('student_group_members')
        .select('group_id, user_id');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_approved', true)
        .order('full_name', { ascending: true });

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (groupsData || []).map((g: any) => {
        const groupMembers = (members || [])
          .filter((m: any) => m.group_id === g.id)
          .map((m: any) => {
            const p = profileMap.get(m.user_id);
            return { user_id: m.user_id, full_name: p?.full_name || null, email: p?.email || null };
          });
        return { ...g, memberCount: groupMembers.length, members: groupMembers } as StudentGroup;
      });
    },
  });

  // Fetch all students for selection
  const { data: allStudents = [] } = useQuery({
    queryKey: ['all-students-for-groups'],
    queryFn: async () => {
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, email, gender, date_of_birth')
        .eq('is_approved', true)
        .order('full_name');
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));
      return (profiles || []).filter((p: any) => !adminIds.has(p.user_id));
    },
    enabled: dialogOpen,
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      if (editingGroup) {
        const { error } = await (supabase as any)
          .from('student_groups')
          .update({ name: groupName, color: groupColor, updated_at: new Date().toISOString() })
          .eq('id', editingGroup.id);
        if (error) throw error;

        await (supabase as any).from('student_group_members').delete().eq('group_id', editingGroup.id);
        if (selectedStudents.size > 0) {
          const inserts = Array.from(selectedStudents).map(uid => ({ group_id: editingGroup.id, user_id: uid }));
          const { error: e2 } = await (supabase as any).from('student_group_members').insert(inserts);
          if (e2) throw e2;
        }
      } else {
        const maxOrder = groups.length > 0 ? Math.max(...groups.map(g => g.display_order)) + 1 : 0;
        const { data: newGroup, error } = await (supabase as any)
          .from('student_groups')
          .insert({ name: groupName, color: groupColor, display_order: maxOrder })
          .select()
          .single();
        if (error) throw error;

        if (selectedStudents.size > 0) {
          const inserts = Array.from(selectedStudents).map(uid => ({ group_id: newGroup.id, user_id: uid }));
          const { error: e2 } = await (supabase as any).from('student_group_members').insert(inserts);
          if (e2) throw e2;
        }
      }
    },
    onSuccess: async () => {
      closeDialog();
      toast.success(editingGroup ? 'Groupe modifié' : 'Groupe créé');
      await queryClient.invalidateQueries({ queryKey: ['student-groups'] });
    },
    onError: () => toast.error('Erreur'),
  });

  const handleDeleteGroup = async (groupId: string) => {
    queryClient.setQueryData(['student-groups'], (old: StudentGroup[] | undefined) =>
      (old || []).filter(g => g.id !== groupId)
    );
    const { error } = await (supabase as any).from('student_groups').delete().eq('id', groupId);
    if (!error) {
      toast.success('Groupe supprimé');
    } else {
      queryClient.invalidateQueries({ queryKey: ['student-groups'] });
      toast.error('Erreur');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId || !groups || groups.length === 0) return;
    const oldIndex = groups.findIndex(g => g.id === sourceId);
    const newIndex = groups.findIndex(g => g.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newGroups = [...groups];
    const [moved] = newGroups.splice(oldIndex, 1);
    newGroups.splice(newIndex, 0, moved);

    const updated = newGroups.map((g, i) => ({ ...g, position: i }));
    queryClient.setQueryData(['student-groups'], updated);
    setDraggedId(null);

    await Promise.all(
      updated.map((g, i) =>
        (supabase as any)
          .from('student_groups')
          .update({ position: i })
          .eq('id', g.id)
      )
    );
    toast.success('Ordre mis à jour');
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingGroup(null);
    setGroupName('');
    setGroupColor('bg-blue-500');
    setSelectedStudents(new Set());
    setStudentSearch('');
    setAgeFilter('tous');
    setGenderFilter('tous');
  };

  const openEdit = (group: StudentGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupColor(group.color);
    setSelectedStudents(new Set(group.members.map(m => m.user_id)));
    setDialogOpen(true);
  };

  const filteredStudents = allStudents.filter((s: any) => {
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      if (!s.full_name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q)) return false;
    }
    if (ageFilter !== 'tous') {
      if (getAgeGroup(s.date_of_birth) !== ageFilter) return false;
    }
    if (genderFilter !== 'tous') {
      if (s.gender !== genderFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4" /> Groupes
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau groupe
        </Button>
      </div>

      {(!groups || groups.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun groupe créé</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(groups || []).map((group) => (
            <DraggableGroupCard
              key={group.id}
              group={group}
              onEdit={openEdit}
              onDelete={handleDeleteGroup}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              isDragging={draggedId === group.id}
              isDragOver={dragOverId === group.id && draggedId !== group.id}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? '✏️ Modifier le groupe' : '➕ Nouveau groupe'}</DialogTitle>
            <DialogDescription>
              {editingGroup ? 'Modifiez le nom, la couleur et les élèves' : 'Créez un groupe et sélectionnez les élèves'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nom du groupe</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Groupe A" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setGroupColor(c.value)}
                    className={`w-8 h-8 rounded-full ${c.preview} transition-all ${
                      groupColor === c.value ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Élèves ({selectedStudents.size})</Label>
                <Button
                  variant="ghost" size="sm" className="text-xs h-7"
                  onClick={() => {
                    if (selectedStudents.size === filteredStudents.length && filteredStudents.length > 0) setSelectedStudents(new Set());
                    else setSelectedStudents(new Set(filteredStudents.map((s: any) => s.user_id)));
                  }}
                >
                  {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? 'Désélectionner' : 'Tout sélectionner'}
                </Button>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Label className="text-xs text-muted-foreground w-full">Catégorie</Label>
                  {([
                    { v: 'tous', l: 'Tous' },
                    { v: 'petits', l: 'Petits' },
                    { v: 'jeunes', l: 'Jeunes' },
                    { v: 'adultes', l: 'Adultes' },
                  ] as const).map(f => (
                    <Button
                      key={f.v}
                      type="button"
                      size="sm"
                      variant={ageFilter === f.v ? 'default' : 'outline'}
                      className="text-xs h-7 px-2"
                      onClick={() => setAgeFilter(f.v)}
                    >
                      {f.l}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Label className="text-xs text-muted-foreground w-full">Genre</Label>
                  {([
                    { v: 'tous', l: 'Tous' },
                    { v: 'fille', l: '👧 Filles' },
                    { v: 'garcon', l: '👦 Garçons' },
                  ] as const).map(f => (
                    <Button
                      key={f.v}
                      type="button"
                      size="sm"
                      variant={genderFilter === f.v ? 'default' : 'outline'}
                      className="text-xs h-7 px-2"
                      onClick={() => setGenderFilter(f.v)}
                    >
                      {f.l}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Aucun élève</p>
                ) : filteredStudents.map((s: any) => (
                  <div
                    key={s.user_id}
                    onClick={() => {
                      const next = new Set(selectedStudents);
                      next.has(s.user_id) ? next.delete(s.user_id) : next.add(s.user_id);
                      setSelectedStudents(next);
                    }}
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox checked={selectedStudents.has(s.user_id)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.full_name || 'Élève'}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                    {s.gender && (
                      <span className="text-xs shrink-0">{s.gender === 'fille' ? '👧' : '👦'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => createOrUpdateMutation.mutate()}
              disabled={!groupName.trim() || createOrUpdateMutation.isPending}
              className="w-full"
            >
              {editingGroup ? 'Enregistrer' : 'Créer le groupe'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudentGroups;
