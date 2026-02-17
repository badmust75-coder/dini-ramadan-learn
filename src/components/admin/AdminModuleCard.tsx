import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
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
  actionButton,
}: AdminModuleCardProps) => {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-300 hover:shadow-elevated',
        isActive && 'ring-2 ring-primary',
        cardBgColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('p-3 rounded-xl shrink-0', bgColor)}>
              <Icon className={cn('h-6 w-6', color)} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">{title}</p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-lg font-semibold text-primary">{value}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
            {actionButton && (
              <div onClick={(e) => e.stopPropagation()}>
                {actionButton}
              </div>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminModuleCard;
