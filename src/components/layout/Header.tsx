import { useState } from 'react';
import { Home, LogOut, Mail, Shield, Trophy, CalendarCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import MessagingDialog from '@/components/messaging/MessagingDialog';
import NewMessageNotification from '@/components/messaging/NewMessageNotification';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

const Header = ({
  title = 'Dini Bismillah',
  showBack = false
}: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isAdmin, user } = useAuth();
  const [showMessaging, setShowMessaging] = useState(false);
  const { unreadCount, hasNewMessage, clearNewMessageFlag } = useUnreadMessages();

  // Admin: count recently completed homework (last 24h)
  const { data: pendingHomeworkCount = 0 } = useQuery({
    queryKey: ['admin-pending-homework-count'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('homework_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', since);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleOpenMessaging = () => {
    clearNewMessageFlag();
    setShowMessaging(true);
  };

  const isHome = location.pathname === '/';

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary via-primary to-royal-dark shadow-royal safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Envelope Icon with Badge */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleOpenMessaging} 
            className="text-primary-foreground hover:bg-primary-foreground/10 relative"
          >
            <Mail className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge 
                className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-orange-500 border-2 border-primary ${
                  hasNewMessage ? 'animate-pulse' : ''
                }`}
                style={{
                  animation: hasNewMessage ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          {/* Center: Title with logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="font-arabic text-sm text-primary">﷽</span>
            </div>
            <h1 className="text-lg font-bold text-primary-foreground">
              {title}
            </h1>
          </div>

          {/* Right: Classement, Présence, Home, Admin (if admin), Logout */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/classement')} 
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Trophy className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/attendance')} 
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <CalendarCheck className="h-5 w-5" />
            </Button>
            {!isHome && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/')} 
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            {/* Admin icon - only visible for admins */}
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/admin')} 
                className="text-primary-foreground hover:bg-primary-foreground/10 relative"
              >
                <Shield className="h-5 w-5" />
                {pendingHomeworkCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 border-2 border-primary animate-pulse">
                    {pendingHomeworkCount > 9 ? '9+' : pendingHomeworkCount}
                  </Badge>
                )}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <LogOut className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir quitter l'application ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                    Quitter
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <MessagingDialog 
        open={showMessaging} 
        onOpenChange={setShowMessaging}
        onMessagesRead={clearNewMessageFlag}
      />
      
      <NewMessageNotification onOpenMessages={handleOpenMessaging} />
    </>
  );
};

export default Header;
