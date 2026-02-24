import { useState } from 'react';
import { Home, LogOut, Mail, Trophy, CalendarCheck } from 'lucide-react';
import UserSettingsDialog from '@/components/settings/UserSettingsDialog';
import AccountSwitcher from '@/components/auth/AccountSwitcher';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import MessagingDialog from '@/components/messaging/MessagingDialog';
import AdminMessagingDialog from '@/components/messaging/AdminMessagingDialog';
import NewMessageNotification from '@/components/messaging/NewMessageNotification';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import AdminNotificationCenter from '@/components/admin/AdminNotificationCenter';

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
  const { signOut, isAdmin } = useAuth();
  const [showMessaging, setShowMessaging] = useState(false);
  const { unreadCount, hasNewMessage, clearNewMessageFlag } = useUnreadMessages();

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
          <div className="w-10" />
          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <AccountSwitcher />
            <Button variant="ghost" size="icon" onClick={() => navigate('/classement')} className="text-primary-foreground hover:bg-primary-foreground/10">
              <Trophy className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/attendance')} className="text-primary-foreground hover:bg-primary-foreground/10">
              <CalendarCheck className="h-5 w-5" />
            </Button>
            {/* Envelope (Messaging) */}
            <Button variant="ghost" size="icon" onClick={handleOpenMessaging} className="text-primary-foreground hover:bg-primary-foreground/10 relative">
              <Mail className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-orange-500 border-2 border-primary ${hasNewMessage ? 'animate-pulse' : ''}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            {!isHome && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/10">
                <Home className="h-5 w-5" />
              </Button>
            )}
            {isAdmin && <AdminNotificationCenter />}
            <UserSettingsDialog />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <LogOut className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
                  <AlertDialogDescription>Êtes-vous sûr de vouloir quitter l'application ?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Quitter</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Show different messaging dialog based on role */}
      {isAdmin ? (
        <AdminMessagingDialog open={showMessaging} onOpenChange={setShowMessaging} onMessagesRead={clearNewMessageFlag} />
      ) : (
        <MessagingDialog open={showMessaging} onOpenChange={setShowMessaging} onMessagesRead={clearNewMessageFlag} />
      )}

      <NewMessageNotification onOpenMessages={handleOpenMessaging} />
    </>
  );
};

export default Header;
