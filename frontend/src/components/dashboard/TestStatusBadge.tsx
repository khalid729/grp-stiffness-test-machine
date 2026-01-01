import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type TestStatus = 0 | 1 | 2 | 3 | 4 | 5 | -1;

interface TestStatusBadgeProps {
  status: TestStatus;
  className?: string;
}

const statusConfig: Record<TestStatus, { key: string; colorClass: string }> = {
  0: { key: 'idle', colorClass: 'bg-status-idle text-white' },
  1: { key: 'starting', colorClass: 'bg-status-starting text-white' },
  2: { key: 'testing', colorClass: 'bg-status-testing text-black' },
  3: { key: 'atTarget', colorClass: 'bg-status-target text-white' },
  4: { key: 'returning', colorClass: 'bg-status-returning text-white' },
  5: { key: 'complete', colorClass: 'bg-status-complete text-white' },
  '-1': { key: 'error', colorClass: 'bg-status-error text-white animate-blink' },
};

export const TestStatusBadge = ({ status, className }: TestStatusBadgeProps) => {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center px-4 py-2 rounded-full font-semibold text-sm uppercase tracking-wide',
        config.colorClass,
        className
      )}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full mr-2',
          status === -1 ? 'bg-white' : 'bg-white/80'
        )}
      />
      {t(`status.${config.key}`)}
    </div>
  );
};
