import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Trash2, GripVertical, FileText, Video, Music, Loader2, Pencil, Check, X } from 'lucide-react';
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

interface Activity {
  id: string;
  day_id: number;
  type: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  order_index: number;
  created_at: string;
}

interface AdminRamadanActivitiesProps {
  dayId: number;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'document': return <FileText className="h-4 w-4" />;
    case 'video': return <Video className="h-4 w-4" />;
    case 'audio': return <Music className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getTypeBadge = (type: string, fileType: string | null) => {
  if (type === 'document') {
    if (fileType === 'pdf') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px]">PDF</Badge>;
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">Image</Badge>;
  }
  if (type === 'video') return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px]">Vidéo</Badge>;
  if (type === 'audio') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]">Audio</Badge>;
  return null;
};

const SortableActivityItem = ({
  activity,
  onRename,
  onDelete,
}: {
  activity: Activity;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(activity.file_name);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editName.trim()) {
      onRename(activity.id, editName.trim());
    }
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted" type="button">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="text-muted-foreground">{getTypeIcon(activity.type)}</span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              onBlur={handleSave}
            />
          </div>
        ) : (
          <p className="text-xs truncate font-medium">{activity.file_name}</p>
        )}
      </div>
      {getTypeBadge(activity.type, activity.file_type)}
      {activity.type === 'document' && activity.file_type !== 'pdf' && (
        <img src={activity.file_url} className="h-8 w-8 rounded object-cover flex-shrink-0" alt="" />
      )}
      {activity.type === 'video' && (
        <video src={activity.file_url} className="h-8 w-12 rounded object-cover bg-black flex-shrink-0" />
      )}
      {activity.type === 'audio' && (
        <audio src={activity.file_url} className="h-6 w-24 flex-shrink-0" controls />
      )}
      {!editing && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditName(activity.file_name); setEditing(true); }}>
          <Pencil className="h-3 w-3" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(activity.id)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

const AdminRamadanActivities = ({ dayId }: AdminRamadanActivitiesProps) => {
  const queryClient = useQueryClient();
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; all?: boolean } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: activities = [] } = useQuery({
    queryKey: ['ramadan-day-activities', dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_day_activities')
        .select('*')
        .eq('day_id', dayId)
        .order('order_index');
      if (error) throw error;
      return data as Activity[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      setUploading(true);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `day-${dayId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('ramadan-activities')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ramadan-activities')
        .getPublicUrl(fileName);

      let fileType = ext;
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) fileType = 'image';
      if (ext === 'pdf') fileType = 'pdf';

      const { error: insertError } = await supabase
        .from('ramadan_day_activities')
        .insert({
          day_id: dayId,
          type,
          file_url: publicUrl,
          file_name: file.name,
          file_type: fileType,
          order_index: activities.length,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-day-activities', dayId] });
      toast.success('Activité ajoutée');
      setUploading(false);
    },
    onError: (err) => {
      console.error(err);
      toast.error('Erreur lors du téléversement');
      setUploading(false);
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('ramadan_day_activities')
        .update({ file_name: name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-day-activities', dayId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const activity = activities.find(a => a.id === id);
      if (activity) {
        const path = activity.file_url.split('/ramadan-activities/')[1];
        if (path) await supabase.storage.from('ramadan-activities').remove([path]);
      }
      const { error } = await supabase.from('ramadan_day_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-day-activities', dayId] });
      toast.success('Activité supprimée');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      for (const a of activities) {
        const path = a.file_url.split('/ramadan-activities/')[1];
        if (path) await supabase.storage.from('ramadan-activities').remove([path]);
      }
      const { error } = await supabase.from('ramadan_day_activities').delete().eq('day_id', dayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-day-activities', dayId] });
      toast.success('Toutes les activités supprimées');
    },
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activities.findIndex(a => a.id === active.id);
    const newIndex = activities.findIndex(a => a.id === over.id);
    const reordered = arrayMove(activities, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['ramadan-day-activities', dayId], reordered);

    // Save new order
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('ramadan_day_activities')
        .update({ order_index: i })
        .eq('id', reordered[i].id);
    }
    queryClient.invalidateQueries({ queryKey: ['ramadan-day-activities', dayId] });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate({ file, type });
    e.target.value = '';
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          📋 Activité du jour ({activities.length} élément{activities.length !== 1 ? 's' : ''})
        </Label>
        {activities.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget({ id: '', all: true })}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Tout suppr.
          </Button>
        )}
      </div>

      {activities.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">↕️ Glissez-déposez pour réorganiser l'ordre</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
              {activities.map(activity => (
                <SortableActivityItem
                  key={activity.id}
                  activity={activity}
                  onRename={(id, name) => renameMutation.mutate({ id, name })}
                  onDelete={(id) => setDeleteTarget({ id })}
                />
              ))}
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune activité pour ce jour</p>
      )}

      {/* Upload buttons */}
      <div className="flex flex-wrap gap-2">
        <input ref={docInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => handleFileUpload(e, 'document')} className="hidden" />
        <input ref={videoInputRef} type="file" accept=".mp4,.mov,.webm" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" />
        <input ref={audioInputRef} type="file" accept=".mp3,.wav,.ogg,.webm,.m4a" onChange={(e) => handleFileUpload(e, 'audio')} className="hidden" />

        <Button variant="outline" size="sm" onClick={() => docInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
          Document
        </Button>
        <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} disabled={uploading}>
          <Video className="h-3 w-3 mr-1" />
          Vidéo
        </Button>
        <Button variant="outline" size="sm" onClick={() => audioInputRef.current?.click()} disabled={uploading}>
          <Music className="h-3 w-3 mr-1" />
          Audio
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.all) {
            deleteAllMutation.mutate();
          } else if (deleteTarget?.id) {
            deleteMutation.mutate(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        title={deleteTarget?.all ? 'Supprimer toutes les activités ?' : 'Supprimer cette activité ?'}
        description={deleteTarget?.all ? 'Toutes les activités de ce jour seront supprimées.' : 'Cette activité sera supprimée définitivement.'}
      />
    </div>
  );
};

export default AdminRamadanActivities;
