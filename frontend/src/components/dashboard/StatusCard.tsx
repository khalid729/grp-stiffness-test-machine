import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatusCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-success/50 bg-success/5',
  warning: 'border-warning/50 bg-warning/5',
  danger: 'border-destructive/50 bg-destructive/5',
  info: 'border-info/50 bg-info/5',
};

export const StatusCard = ({
  title,
  value,
  unit,
  icon,
  variant = 'default',
  className,
}: StatusCardProps) => {
  return (
    <div
      className={cn(
        'industrial-card p-4 border-2',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="flex items-baseline">
        <span className="value-display">{value}</span>
        {unit && <span className="value-unit">{unit}</span>}
      </div>
    </div>
  );
};
