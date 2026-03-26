import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Eye, EyeOff, FileText, Image, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminNotesListProps {
  moduleKey: string;
  showDelete?: boolean;
}

const AdminNotesList = ({ moduleKey, showDelete = true }: AdminNotesListProps) => {
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ['admin-notes', moduleKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_notes')
        .select('*')
        .eq('module_key', moduleKey)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await (supabase as any).from('admin_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast.success('Note supprimée');
    },
  });

  const getAttachmentIcon = (type: string | null) => {
    if (!type) return <File className="h-4 w-4" />;
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) return <div className="text-sm text-muted-foreground animate-pulse">Chargement des notes...</div>;
  if (!notes || notes.length === 0) return null;

  return (
    <div className="space-y-2">
      {notes.map((note: any) => (
        <div key={note.id} className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {note.content && (
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              )}
              {note.attachment_url && (
                <div className="mt-2">
                  {note.attachment_type?.startsWith('image/') ? (
                    <img src={note.attachment_url} alt={note.attachment_name} className="rounded-lg max-h-48 object-cover" />
                  ) : note.attachment_type?.startsWith('video/') ? (
                    <video src={note.attachment_url} controls className="rounded-lg max-h-48 w-full" />
                  ) : (
                    <a href={note.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      {getAttachmentIcon(note.attachment_type)}
                      {note.attachment_name || 'Fichier joint'}
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {note.is_public ? (
                <Eye className="h-3.5 w-3.5 text-green-500" title="Visible par les élèves" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" title="Admin uniquement" />
              )}
              {showDelete && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(note.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(note.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AdminNotesList;
