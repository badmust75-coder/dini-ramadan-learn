import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, Video, Image, File, Loader2, Unlock, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import { Checkbox } from '@/components/ui/checkbox';

const SOURATES_DATA = [
  { number: 114, name_french: 'An-Nas' },
  { number: 113, name_french: 'Al-Falaq' },
  { number: 112, name_french: 'Al-Ikhlas' },
  { number: 111, name_french: 'Al-Masad' },
  { number: 110, name_french: 'An-Nasr' },
  { number: 109, name_french: 'Al-Kafirun' },
  { number: 108, name_french: 'Al-Kawthar' },
  { number: 107, name_french: "Al-Ma'un" },
  { number: 106, name_french: 'Quraysh' },
  { number: 105, name_french: 'Al-Fil' },
  { number: 104, name_french: 'Al-Humaza' },
  { number: 103, name_french: "Al-Asr" },
  { number: 102, name_french: 'At-Takathur' },
  { number: 101, name_french: "Al-Qari'a" },
  { number: 100, name_french: 'Al-Adiyat' },
];

const AdminSourateContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingSourateId, setUploadingSourateId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [unlockUserId, setUnlockUserId] = useState('');
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  const { data: sourates = [] } = useQuery({
    queryKey: ['admin-sourates-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourates')
        .select('*')
        .order('number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [], refetch: refetchContents } = useQuery({
    queryKey: ['admin-sourate-contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourate_content')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-for-unlock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: unlocks = [], refetch: refetchUnlocks } = useQuery({
    queryKey: ['admin-sourate-unlocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourate_admin_unlocks')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const getContentType = (file: File): string => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'document';
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const handleUpload = useCallback(async (sourateId: number, files: FileList) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsUploading(true);
    setUploadingSourateId(sourateId);

    try {
      const existingCount = contents.filter(c => c.sourate_id === sourateId).length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `sourate-${sourateId}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('sourate-content')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          toast.error(`Erreur upload: ${uploadError.message}`);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('sourate-content')
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('sourate_content')
          .insert({
            sourate_id: sourateId,
            content_type: getContentType(file),
            file_url: urlData.publicUrl,
            file_name: file.name,
            display_order: existingCount + i,
            uploaded_by: user.id,
          });

        if (insertError) {
          toast.error(`Erreur enregistrement: ${insertError.message}`);
          throw insertError;
        }
      }

      await refetchContents();
      toast.success(`${files.length} fichier(s) téléversé(s) avec succès ✅`);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadingSourateId(null);
    }
  }, [user, contents, refetchContents]);

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;

      try {
        const url = new URL(content.file_url);
        const bucketPath = url.pathname.split('/object/public/sourate-content/');
        if (bucketPath[1]) {
          await supabase.storage.from('sourate-content').remove([decodeURIComponent(bucketPath[1])]);
        }
      } catch (e) {
        console.warn('Could not delete storage file:', e);
      }

      const { error } = await supabase
        .from('sourate_content')
        .delete()
        .eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sourate-contents'] });
      toast.success('Contenu supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const toggleUnlock = async (userId: string, sourateId: number) => {
    const existing = unlocks.find(u => u.user_id === userId && u.sourate_id === sourateId);
    if (existing) {
      await supabase.from('sourate_admin_unlocks').delete().eq('id', existing.id);
    } else {
      await supabase.from('sourate_admin_unlocks').insert({
        user_id: userId,
        sourate_id: sourateId,
        unlocked_by: user?.id,
      });
    }
    refetchUnlocks();
    toast.success(existing ? 'Sourate verrouillée' : 'Sourate déverrouillée');
  };

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Gestion du contenu Sourates</h3>
      <p className="text-sm text-muted-foreground">
        Téléversez des vidéos, PDF ou images pour chaque sourate. Débloquez des sourates pour vos élèves.
      </p>

      {/* Student unlock section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-bold flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            Débloquer des sourates pour un élève
          </h4>
          <select
            className="w-full p-2 border rounded-lg bg-background text-foreground"
            value={selectedStudent || ''}
            onChange={(e) => setSelectedStudent(e.target.value || null)}
          >
            <option value="">Sélectionner un élève...</option>
            {profiles.map(p => (
              <option key={p.user_id} value={p.user_id}>
                {p.full_name || p.email || 'Élève'}
              </option>
            ))}
          </select>

          {selectedStudent && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {sourates.map(s => {
                const isUnlocked = unlocks.some(u => u.user_id === selectedStudent && u.sourate_id === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{s.number}. {s.name_french}</span>
                    <Button
                      variant={isUnlocked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleUnlock(selectedStudent, s.id)}
                    >
                      {isUnlocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                      {isUnlocked ? 'Débloqué' : 'Débloquer'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content upload per sourate */}
      <div className="space-y-3">
        {sourates.map((sourate) => {
          const sourateContents = contents.filter(c => c.sourate_id === sourate.id);
          const isThisUploading = isUploading && uploadingSourateId === sourate.id;

          return (
            <Card key={sourate.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{sourate.number}. {sourate.name_french}</p>
                    <p className="text-sm text-muted-foreground font-arabic">{sourate.name_arabic}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="video/*,application/pdf,image/*,.doc,.docx"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleUpload(sourate.id, e.target.files);
                        }
                        e.target.value = '';
                      }}
                      disabled={isThisUploading}
                    />
                    <Button size="sm" disabled={isThisUploading} className="gap-2 pointer-events-none">
                      {isThisUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isThisUploading ? 'Envoi...' : 'Ajouter'}
                    </Button>
                  </div>
                </div>

                {sourateContents.length > 0 && (
                  <div className="space-y-2">
                    {sourateContents.map((content) => (
                      <div key={content.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getContentIcon(content.content_type)}
                          <span className="text-sm truncate">{content.file_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{content.content_type}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteContentId(content.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {sourateContents.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun contenu</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ConfirmDeleteDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
        onConfirm={() => {
          if (deleteContentId) deleteMutation.mutate(deleteContentId);
          setDeleteContentId(null);
        }}
        description="Ce contenu sera supprimé définitivement."
      />
    </div>
  );
};

export default AdminSourateContent;
