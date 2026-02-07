import { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NewMessageNotificationProps {
  onOpenMessages: () => void;
}

interface NotificationMessage {
  id: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

const NewMessageNotification = ({ onOpenMessages }: NewMessageNotificationProps) => {
  const { user, isAdmin } = useAuth();
  const [pendingNotification, setPendingNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-message-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            message: string;
            created_at: string;
            sender_type: string;
            user_id: string;
          };

          // For admin: show notification for user messages
          // For user: show notification for admin messages in their conversation
          if (isAdmin && newMessage.sender_type === 'user') {
            // Get sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', newMessage.user_id)
              .single();

            setPendingNotification({
              id: newMessage.id,
              message: newMessage.message,
              created_at: newMessage.created_at,
              sender_name: profile?.full_name || profile?.email || 'Élève',
            });
          } else if (!isAdmin && newMessage.sender_type === 'admin' && newMessage.user_id === user.id) {
            setPendingNotification({
              id: newMessage.id,
              message: newMessage.message,
              created_at: newMessage.created_at,
              sender_name: 'Administrateur',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const handleOpenMessage = () => {
    setPendingNotification(null);
    onOpenMessages();
  };

  const handleDismiss = () => {
    setPendingNotification(null);
  };

  if (!pendingNotification) return null;

  return (
    <Dialog open={!!pendingNotification} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md h-[70vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2 text-orange-500">
            <Mail className="h-6 w-6 animate-bounce" />
            Nouveau message !
          </DialogTitle>
          <DialogDescription className="sr-only">
            Un nouveau message est arrivé
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
            <Mail className="h-12 w-12 text-orange-500" />
          </div>

          <div className="text-center space-y-2">
            <p className="font-semibold text-lg">{pendingNotification.sender_name}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(pendingNotification.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 max-w-full">
            <p className="text-sm line-clamp-4">{pendingNotification.message}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Plus tard
          </Button>
          <Button
            onClick={handleOpenMessage}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            <Mail className="h-4 w-4 mr-2" />
            Ouvrir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageNotification;
