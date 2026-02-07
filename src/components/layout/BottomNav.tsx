import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, BookOpen, Hand, BookMarked, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  color: string;
}

const navItems: NavItem[] = [
  { icon: Moon, label: 'Ramadan', path: '/ramadan', color: 'text-gold' },
  { icon: Hand, label: 'Prière', path: '/priere', color: 'text-royal-light' },
  { icon: BookMarked, label: 'Sourates', path: '/sourates', color: 'text-gold' },
  { icon: Sparkles, label: 'Nourania', path: '/nourania', color: 'text-royal-light' },
  { icon: BookOpen, label: 'Alphabet', path: '/alphabet', color: 'text-gold' },
];

const BottomNav = React.forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 bottom-nav safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300',
                isActive
                  ? 'scale-110'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-primary shadow-royal'
                    : 'hover:bg-muted'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-gold' : 'text-foreground'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
