import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, X, User, ArrowLeft, ShieldOff } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';

interface RegistrationUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  created_at: string;
  is_approved: boolean;
}

const AdminRegistrationValidations = ({ onBack }: { onBack: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: '', name: '' });

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['admin-all-registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, gender, age, created_at, is_approved')
        .order('is_approved', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as RegistrationUser[];
    },
  });

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Inscription approuvée ✅',
        description: "L'élève peut maintenant accéder à l'application.",
      });

      queryClient.invalidateQueries({ queryKey: ['admin-all-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-registrations-count'] });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: "Impossible d'approuver l'inscription.",
        variant: 'destructive',
      });
    }
    setProcessingId(null);
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    toast({
      title: 'Inscription refusée',
      description: "L'élève ne pourra pas accéder à l'application.",
    });
    setProcessingId(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({
        title: 'Utilisateur supprimé ✅',
        description: "L'utilisateur a été définitivement supprimé.",
      });

      queryClient.invalidateQueries({ queryKey: ['admin-all-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-registrations-count'] });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer l'utilisateur.",
        variant: 'destructive',
      });
    }
    setProcessingId(null);
    setDeleteConfirm({ open: false, userId: '', name: '' });
  };

  const pendingUsers = allUsers?.filter(u => !u.is_approved) || [];
  const approvedUsers = allUsers?.filter(u => u.is_approved) || [];

  const renderUserCard = (user: RegistrationUser) => {
    const isApproved = user.is_approved;

    return (
      <Card
        key={user.user_id}
        className={
          isApproved
            ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10 opacity-70'
            : 'border-orange-200 dark:border-orange-800'
        }
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isApproved
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-orange-100 dark:bg-orange-900/30'
              }`}>
                <User className={`h-5 w-5 ${
                  isApproved
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`} />
              </div>
              <div className="min-w-0">
                <p className={`font-medium truncate ${
                  isApproved
                    ? 'text-red-500 dark:text-red-400 line-through'
                    : 'text-foreground'
                }`}>
                  {user.full_name || 'Sans nom'}
                </p>
                <p className={`text-sm truncate ${
                  isApproved
                    ? 'text-red-400/70 dark:text-red-500/70 line-through'
                    : 'text-muted-foreground'
                }`}>{user.email}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {user.gender && (
                    <Badge variant="outline" className="text-xs">
                      {user.gender === 'garcon' ? '👦 Garçon' : '👧 Fille'}
                    </Badge>
                  )}
                  {user.age && (
                    <Badge variant="outline" className="text-xs">
                      {user.age} ans
                    </Badge>
                  )}
                  {isApproved && (
                    <Badge className="bg-green-600 text-white text-xs">
                      ✅ Validé
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(user.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            {!isApproved ? (
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => handleReject(user.user_id)}
                  disabled={processingId === user.user_id}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(user.user_id)}
                  disabled={processingId === user.user_id}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteConfirm({ open: true, userId: user.user_id, name: user.full_name || 'cet utilisateur' })}
                  disabled={processingId === user.user_id}
                >
                  <ShieldOff className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <h2 className="text-xl font-bold text-foreground">Validation d'inscription</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-20 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.length > 0 && (
              <>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  En attente ({pendingUsers.length})
                </p>
                {pendingUsers.map(renderUserCard)}
              </>
            )}

            {pendingUsers.length === 0 && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                <CardContent className="p-6 text-center">
                  <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    Aucune inscription en attente
                  </p>
                </CardContent>
              </Card>
            )}

            {approvedUsers.length > 0 && (
              <>
                <p className="text-sm font-semibold text-muted-foreground mt-4">
                  Historique des validations ({approvedUsers.length})
                </p>
                {approvedUsers.map(renderUserCard)}
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}
        onConfirm={() => handleDeleteUser(deleteConfirm.userId)}
        title="Supprimer définitivement"
        description={`Supprimer définitivement ${deleteConfirm.name} ? Il devra se réinscrire pour accéder à nouveau à l'application.`}
      />
    </>
  );
};

export default AdminRegistrationValidations;
