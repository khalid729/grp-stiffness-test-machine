import { cn } from '@/lib/utils';

interface MachineIndicatorProps {
  label: string;
  isActive: boolean;
  isError?: boolean;
  className?: string;
}

export const MachineIndicator = ({
  label,
  isActive,
  isError = false,
  className,
}: MachineIndicatorProps) => {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg bg-muted/50', className)}>
      <div
        className={cn(
          'w-4 h-4 rounded-full transition-all duration-200',
          isError
            ? 'bg-indicator-error animate-blink'
            : isActive
            ? 'bg-indicator-on shadow-[0_0_8px_hsl(var(--indicator-on)/0.5)]'
            : 'bg-indicator-off'
        )}
      />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};
