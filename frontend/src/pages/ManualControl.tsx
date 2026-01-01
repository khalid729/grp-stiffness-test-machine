import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Power,
  PowerOff,
  RotateCcw,
  Gauge,
  Move,
  Target
} from 'lucide-react';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { MachineIndicator } from '@/components/dashboard/MachineIndicator';
import { useLiveData, useJogControl } from '@/hooks/useLiveData';
import { useServoControl, useClampControl } from '@/hooks/useApi';

const ManualControl = () => {
  const { t } = useTranslation();
  const { liveData, isConnected } = useLiveData();
  const { jogForward, jogBackward, setJogSpeed } = useJogControl();
  const { enableServo, disableServo, resetAlarm } = useServoControl();
  const { lockUpper, lockLower, unlockAll } = useClampControl();

  const [jogSpeed, setJogSpeedLocal] = useState(50);
  const [isJogging, setIsJogging] = useState<'up' | 'down' | null>(null);

  // Handle jog speed change
  const handleJogSpeedChange = useCallback((value: number[]) => {
    const speed = value[0];
    setJogSpeedLocal(speed);
    setJogSpeed(speed);
  }, [setJogSpeed]);

  // Jog Up (backward)
  const handleJogUp = useCallback((pressed: boolean) => {
    setIsJogging(pressed ? 'up' : null);
    jogBackward(pressed);
  }, [jogBackward]);

  // Jog Down (forward)
  const handleJogDown = useCallback((pressed: boolean) => {
    setIsJogging(pressed ? 'down' : null);
    jogForward(pressed);
  }, [jogForward]);

  // Clamp controls
  const handleLockUpper = () => {
    lockUpper.mutate();
  };

  const handleLockLower = () => {
    lockLower.mutate();
  };

  const handleUnlockAll = () => {
    unlockAll.mutate();
  };

  // Servo controls
  const handleServoEnable = () => {
    enableServo.mutate();
  };

  const handleServoDisable = () => {
    disableServo.mutate();
  };

  const handleResetAlarm = () => {
    resetAlarm.mutate();
  };

  return (
    <div className="h-full overflow-y-auto flex flex-col space-y-4 p-1 min-h-0">
      {/* Page Title */}
      <div className="flex-shrink-0 flex items-center gap-3">
        <h1 className="text-xl lg:text-2xl font-bold">{t('manual.title')}</h1>
        {!isConnected && (
          <span className="text-xs text-destructive animate-pulse">PLC Disconnected</span>
        )}
      </div>

      {/* Live Values Row */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <StatusCard
          title={t('dashboard.force')}
          value={liveData.actual_force.toFixed(2)}
          unit="kN"
          icon={<Gauge className="w-5 h-5" />}
          variant="info"
        />
        <StatusCard
          title={t('dashboard.deflection')}
          value={liveData.actual_deflection.toFixed(2)}
          unit="mm"
          icon={<Move className="w-5 h-5" />}
          variant="warning"
        />
        <StatusCard
          title={t('dashboard.position')}
          value={liveData.actual_position.toFixed(2)}
          unit="mm"
          icon={<Target className="w-5 h-5" />}
        />
      </div>

      {/* Control Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Jog Control */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base lg:text-lg">{t('manual.jogControl')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Jog Up Button */}
            <Button
              variant="outline"
              className={`w-full h-20 text-lg gap-2 transition-all ${
                isJogging === 'up'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-primary/10'
              }`}
              onMouseDown={() => handleJogUp(true)}
              onMouseUp={() => handleJogUp(false)}
              onMouseLeave={() => handleJogUp(false)}
              onTouchStart={() => handleJogUp(true)}
              onTouchEnd={() => handleJogUp(false)}
              disabled={!isConnected || !liveData.servo_ready}
            >
              <ChevronUp className="w-8 h-8" />
              {t('manual.jogUp')}
            </Button>

            {/* Speed Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('manual.speed')}</span>
                <span className="font-medium">{jogSpeed} mm/min</span>
              </div>
              <Slider
                value={[jogSpeed]}
                onValueChange={handleJogSpeedChange}
                min={1}
                max={100}
                step={1}
                className="w-full"
                disabled={!isConnected}
              />
            </div>

            {/* Jog Down Button */}
            <Button
              variant="outline"
              className={`w-full h-20 text-lg gap-2 transition-all ${
                isJogging === 'down'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-primary/10'
              }`}
              onMouseDown={() => handleJogDown(true)}
              onMouseUp={() => handleJogDown(false)}
              onMouseLeave={() => handleJogDown(false)}
              onTouchStart={() => handleJogDown(true)}
              onTouchEnd={() => handleJogDown(false)}
              disabled={!isConnected || !liveData.servo_ready}
            >
              <ChevronDown className="w-8 h-8" />
              {t('manual.jogDown')}
            </Button>
          </CardContent>
        </Card>

        {/* Clamp Control */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base lg:text-lg">{t('manual.clampControl')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleLockUpper}
              className="w-full h-14 text-base gap-2 bg-success hover:bg-success/90 text-success-foreground"
              disabled={!isConnected || lockUpper.isPending}
            >
              <Lock className="w-5 h-5" />
              {t('manual.lockUpper')}
            </Button>

            <Button
              onClick={handleLockLower}
              className="w-full h-14 text-base gap-2 bg-success hover:bg-success/90 text-success-foreground"
              disabled={!isConnected || lockLower.isPending}
            >
              <Lock className="w-5 h-5" />
              {t('manual.lockLower')}
            </Button>

            <Button
              variant="destructive"
              onClick={handleUnlockAll}
              className="w-full h-14 text-base gap-2"
              disabled={!isConnected || unlockAll.isPending}
            >
              <Unlock className="w-5 h-5" />
              {t('manual.unlockAll')}
            </Button>

            {/* Clamp Status */}
            <div className="pt-3 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                <MachineIndicator
                  label={t('dashboard.upperLock')}
                  isActive={liveData.lock_upper}
                />
                <MachineIndicator
                  label={t('dashboard.lowerLock')}
                  isActive={liveData.lock_lower}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Servo Control */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base lg:text-lg">{t('manual.servoControl')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleServoEnable}
              className="w-full h-14 text-base gap-2 bg-success hover:bg-success/90 text-success-foreground"
              disabled={!isConnected || enableServo.isPending}
            >
              <Power className="w-5 h-5" />
              {t('manual.enable')}
            </Button>

            <Button
              variant="outline"
              onClick={handleServoDisable}
              className="w-full h-14 text-base gap-2"
              disabled={!isConnected || disableServo.isPending}
            >
              <PowerOff className="w-5 h-5" />
              {t('manual.disable')}
            </Button>

            <Button
              variant="secondary"
              onClick={handleResetAlarm}
              className="w-full h-14 text-base gap-2"
              disabled={!isConnected || resetAlarm.isPending}
            >
              <RotateCcw className="w-5 h-5" />
              {t('manual.resetAlarm')}
            </Button>

            {/* Servo Status */}
            <div className="pt-3 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                <MachineIndicator
                  label={t('dashboard.servoReady')}
                  isActive={liveData.servo_ready}
                />
                <MachineIndicator
                  label={t('dashboard.servoError')}
                  isActive={liveData.servo_error}
                  isError={liveData.servo_error}
                />
              </div>
              <div className="mt-2">
                <MachineIndicator
                  label={t('dashboard.atHome')}
                  isActive={liveData.at_home}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualControl;
