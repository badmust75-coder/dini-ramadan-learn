import { ReactNode } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import usePresenceHeartbeat from '@/hooks/usePresenceHeartbeat';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import StarMascot from '@/components/mascot/StarMascot';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBottomNav?: boolean;
  showBack?: boolean;
}

const AppLayout = ({ 
  children, 
  title, 
  showBottomNav = true,
  showBack = false 
}: AppLayoutProps) => {
  usePresenceHeartbeat();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title={title} showBack={showBack} />
      <EmailVerificationBanner />
      <main className={`flex-1 ${showBottomNav ? 'pb-20' : ''}`}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
      <StarMascot />
    </div>
  );
};

export default AppLayout;
