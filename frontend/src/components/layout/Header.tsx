import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Wifi, WifiOff, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  isConnected?: boolean;
  onEmergencyStop?: () => void;
}

export const Header = ({ isConnected = true, onEmergencyStop }: HeaderProps) => {
  const { t } = useTranslation();
  const { currentLanguage, toggleLanguage, isRTL } = useLanguage();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left Section - Page Title (will be filled by pages) */}
      <div className="flex-1" />

      {/* Right Section - Controls */}
      <div className={cn('flex items-center gap-4', isRTL && 'flex-row-reverse')}>
        {/* Connection Status */}
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-2 px-3 py-1.5',
            isConnected
              ? 'border-success text-success bg-success/10'
              : 'border-destructive text-destructive bg-destructive/10'
          )}
        >
          {isConnected ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {isConnected ? t('header.connected') : t('header.disconnected')}
          </span>
        </Badge>

        {/* Language Toggle */}
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', currentLanguage === 'en' && 'font-semibold')}>EN</span>
          <Switch
            checked={currentLanguage === 'ar'}
            onCheckedChange={toggleLanguage}
          />
          <span className={cn('text-sm font-arabic', currentLanguage === 'ar' && 'font-semibold')}>عربي</span>
        </div>

        {/* Emergency Stop Button */}
        <Button
          variant="destructive"
          size="lg"
          onClick={onEmergencyStop}
          className="emergency-glow bg-emergency hover:bg-emergency/90 text-white font-bold px-6 py-2 rounded-lg shadow-lg"
        >
          <Power className="w-5 h-5 mr-2" />
          {t('header.emergencyStop')}
        </Button>
      </div>
    </header>
  );
};
