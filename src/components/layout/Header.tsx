import { useState } from 'react';
import { Home, Mail, CalendarCheck, Shield, Check, BarChart3, Trophy } from 'lucide-react';
import UserSettingsDialog from '@/components/settings/UserSettingsDialog';
import AccountSwitcher from '@/components/auth/AccountSwitcher';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MessagingDialog from '@/components/messaging/MessagingDialog';
import AdminMessagingDialog from '@/components/messaging/AdminMessagingDialog';
import NewMessageNotification from '@/components/messaging/NewMessageNotification';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAdminPendingCounts } from '@/hooks/useAdminPendingCounts';
import { useMonitoringErrorCount } from '@/hooks/useMonitoringErrorCount';
import AdminCommandModal from '@/components/admin/AdminCommandModal';

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
  const { isAdmin } = useAuth();
  const [showMessaging, setShowMessaging] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { unreadCount, hasNewMessage, clearNewMessageFlag } = useUnreadMessages();
  const pendingCounts = useAdminPendingCounts();
  const monitoringErrors = useMonitoringErrorCount();

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
            <UserSettingsDialog />
            <AccountSwitcher />
            <Button variant="ghost" size="icon" onClick={handleOpenMessaging} className="text-primary-foreground hover:bg-primary-foreground/10 relative">
              <Mail className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-orange-500 border-2 border-primary ${hasNewMessage ? 'animate-pulse' : ''}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/classement')} className="text-primary-foreground hover:bg-primary-foreground/10">
              <Trophy className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/attendance')} className="text-primary-foreground hover:bg-primary-foreground/10">
              <CalendarCheck className="h-5 w-5" />
            </Button>
            {/* Admin: monitoring icon */}
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/monitoring')} className="text-primary-foreground hover:bg-primary-foreground/10 relative">
                <BarChart3 className="h-5 w-5" />
                {monitoringErrors > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 border-2 border-primary animate-pulse">
                    {monitoringErrors > 9 ? '9+' : monitoringErrors}
                  </Badge>
                )}
              </Button>
            )}
            {/* Admin: shield icon with dynamic badge, navigates directly to /admin */}
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => setShowAdminModal(true)} className="text-primary-foreground hover:bg-primary-foreground/10 relative">
                <Shield className="h-5 w-5" />
                {pendingCounts.total > 0 ? (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 border-2 border-primary animate-pulse">
                    {pendingCounts.total > 9 ? '9+' : pendingCounts.total}
                  </Badge>
                ) : (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
              </Button>
            )}
            {!isHome && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/10">
                <Home className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {isAdmin ? (
        <AdminMessagingDialog open={showMessaging} onOpenChange={setShowMessaging} onMessagesRead={clearNewMessageFlag} />
      ) : (
        <MessagingDialog open={showMessaging} onOpenChange={setShowMessaging} onMessagesRead={clearNewMessageFlag} />
      )}

      {isAdmin && (
        <AdminCommandModal
          open={showAdminModal}
          onOpenChange={setShowAdminModal}
          pendingRegistrations={pendingCounts.registrations}
          pendingSourates={pendingCounts.sourates}
          pendingNourania={pendingCounts.nourania}
          pendingInvocations={pendingCounts.invocations}
          pendingMessages={pendingCounts.messages}
          pendingHomework={pendingCounts.homework}
          total={pendingCounts.total}
        />
      )}

      <NewMessageNotification onOpenMessages={handleOpenMessaging} />
    </>
  );
};

export default Header;
