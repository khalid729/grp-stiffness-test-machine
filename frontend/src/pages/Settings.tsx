import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Gauge,
  ShieldAlert,
  Info,
  Save,
  Loader2
} from 'lucide-react';
import { useConnection, useParameters, useSetParameters } from '@/hooks/useApi';
import { useLiveData } from '@/hooks/useLiveData';

const Settings = () => {
  const { t } = useTranslation();
  const { liveData, isConnected } = useLiveData();
  const { status: connectionStatus, reconnect } = useConnection();
  const { data: parameters, isLoading: isLoadingParams } = useParameters();
  const setParameters = useSetParameters();

  // Connection settings (display only - configured in backend .env)
  const [plcAddress, setPlcAddress] = useState('192.168.0.100');
  const [port, setPort] = useState('102');

  // Limits settings
  const [maxForce, setMaxForce] = useState('200');
  const [maxStroke, setMaxStroke] = useState('500');
  const [minSpeed, setMinSpeed] = useState('1');
  const [maxSpeed, setMaxSpeed] = useState('100');

  // Sync with PLC parameters
  useEffect(() => {
    if (parameters && parameters.connected) {
      if (parameters.max_force > 0) setMaxForce(parameters.max_force.toString());
      if (parameters.max_stroke > 0) setMaxStroke(parameters.max_stroke.toString());
    }
  }, [parameters]);

  // Update PLC address from connection status
  useEffect(() => {
    if (connectionStatus.data?.ip) {
      setPlcAddress(connectionStatus.data.ip);
    }
  }, [connectionStatus.data]);

  const handleReconnect = () => {
    reconnect.mutate();
  };

  const handleSaveLimits = () => {
    setParameters.mutate({
      max_force: parseFloat(maxForce),
      max_stroke: parseFloat(maxStroke),
    });
  };

  return (
    <div className="h-full overflow-y-auto flex flex-col space-y-4 p-1 min-h-0">
      {/* Page Title */}
      <div className="flex-shrink-0">
        <h1 className="text-xl lg:text-2xl font-bold">{t('settings.title')}</h1>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Connection Settings */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : (
                <WifiOff className="w-5 h-5 text-destructive" />
              )}
              {t('settings.connection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm text-muted-foreground">{t('settings.connectionStatus')}</span>
              <Badge
                variant={isConnected ? 'default' : 'destructive'}
                className={isConnected ? 'bg-success text-success-foreground' : ''}
              >
                {isConnected ? t('header.connected') : t('header.disconnected')}
              </Badge>
            </div>

            {/* PLC Address */}
            <div className="space-y-1.5">
              <Label htmlFor="plcAddress">{t('settings.plcAddress')}</Label>
              <Input
                id="plcAddress"
                type="text"
                value={plcAddress}
                onChange={(e) => setPlcAddress(e.target.value)}
                placeholder="192.168.0.100"
                className="industrial-input font-mono"
                disabled // Configured in backend
              />
              <p className="text-xs text-muted-foreground">Configured in backend .env file</p>
            </div>

            {/* Port */}
            <div className="space-y-1.5">
              <Label htmlFor="port">{t('settings.port')}</Label>
              <Input
                id="port"
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="102"
                className="industrial-input font-mono"
                disabled // Configured in backend
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleReconnect}
                className="flex-1 gap-2"
                disabled={reconnect.isPending}
              >
                {reconnect.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {t('settings.reconnect')}
              </Button>
            </div>

            {/* Live Status */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Servo Ready:</span>
                <span className={liveData.servo_ready ? 'text-success' : 'text-muted-foreground'}>
                  {liveData.servo_ready ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">At Home:</span>
                <span className={liveData.at_home ? 'text-success' : 'text-muted-foreground'}>
                  {liveData.at_home ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Servo Error:</span>
                <span className={liveData.servo_error ? 'text-destructive' : 'text-success'}>
                  {liveData.servo_error ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Values (Read-only from PLC) */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <Gauge className="w-5 h-5 text-primary" />
              Current Values
              {isLoadingParams && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Force</div>
                <div className="text-xl font-bold">{liveData.actual_force.toFixed(2)} kN</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Deflection</div>
                <div className="text-xl font-bold">{liveData.actual_deflection.toFixed(2)} mm</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Position</div>
                <div className="text-xl font-bold">{liveData.actual_position.toFixed(2)} mm</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Target Deflection</div>
                <div className="text-xl font-bold">{liveData.target_deflection.toFixed(2)} mm</div>
              </div>
            </div>

            {parameters && parameters.connected && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pipe Diameter:</span>
                    <span className="font-medium">{parameters.pipe_diameter} mm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pipe Length:</span>
                    <span className="font-medium">{parameters.pipe_length} mm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deflection %:</span>
                    <span className="font-medium">{parameters.deflection_percent}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Test Speed:</span>
                    <span className="font-medium">{parameters.test_speed} mm/min</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Limits Settings */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <ShieldAlert className="w-5 h-5 text-warning" />
              {t('settings.limits')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Max Force */}
            <div className="space-y-1.5">
              <Label htmlFor="maxForce">{t('settings.maxForce')} (kN)</Label>
              <Input
                id="maxForce"
                type="number"
                value={maxForce}
                onChange={(e) => setMaxForce(e.target.value)}
                className="industrial-input"
              />
            </div>

            {/* Max Stroke */}
            <div className="space-y-1.5">
              <Label htmlFor="maxStroke">{t('settings.maxStroke')} (mm)</Label>
              <Input
                id="maxStroke"
                type="number"
                value={maxStroke}
                onChange={(e) => setMaxStroke(e.target.value)}
                className="industrial-input"
              />
            </div>

            <Separator />

            {/* Speed Limits */}
            <div className="space-y-3">
              <Label>{t('settings.speedLimits')} (mm/min)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="minSpeed" className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    id="minSpeed"
                    type="number"
                    value={minSpeed}
                    onChange={(e) => setMinSpeed(e.target.value)}
                    className="industrial-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxSpeed" className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    id="maxSpeed"
                    type="number"
                    value={maxSpeed}
                    onChange={(e) => setMaxSpeed(e.target.value)}
                    className="industrial-input"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveLimits}
              className="w-full gap-2"
              disabled={!isConnected || setParameters.isPending}
            >
              {setParameters.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t('common.save')}
            </Button>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <Info className="w-5 h-5 text-info" />
              {t('settings.about')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Version */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-sm text-muted-foreground">{t('settings.version')}</span>
                <span className="font-mono font-medium">1.0.0</span>
              </div>

              {/* Application Name */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-sm text-muted-foreground">Application</span>
                <span className="font-medium">GRP Ring Stiffness Tester</span>
              </div>

              {/* Standard */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-sm text-muted-foreground">Standard</span>
                <span className="font-medium">ISO 9969</span>
              </div>

              {/* Backend Status */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-sm text-muted-foreground">Backend</span>
                <Badge variant="outline" className={isConnected ? 'text-success border-success' : 'text-destructive border-destructive'}>
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>
              </div>

              {/* Support */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">{t('settings.support')}</div>
                <div className="font-medium text-primary">support@almuhaideb.com</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
