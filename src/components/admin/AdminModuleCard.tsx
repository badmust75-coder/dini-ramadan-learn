import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface AdminModuleCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  subtitle?: string;
  color: string;
  bgColor: string;
  cardBgColor?: string;
  onClick: () => void;
  isActive?: boolean;
  actionButton?: React.ReactNode;
  noteBadge?: number;
}

const AdminModuleCard = ({
  title,
  icon: Icon,
  value,
  subtitle,
  color,
  bgColor,
  cardBgColor,
  onClick,
  isActive = false,
}: AdminModuleCardProps) => {
  const noteCount = (arguments[0] as AdminModuleCardProps).noteBadge;
  return (
    <div
      className={cn(
        'cursor-pointer rounded-xl border p-3 transition-all duration-200 hover:shadow-md',
        isActive && 'ring-2 ring-primary',
        cardBgColor
      )}
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center gap-1.5">
        <div className={cn('p-2 rounded-lg', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <p className="font-bold text-xs text-foreground leading-tight line-clamp-2">{title}</p>
        <p className="text-sm font-semibold text-primary leading-none">{value}</p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default AdminModuleCard;