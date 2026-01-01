import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Play, Square, Calculator, Settings2, Loader2 } from 'lucide-react';
import { useLiveData } from '@/hooks/useLiveData';
import { useCommands, useParameters, useSetParameters } from '@/hooks/useApi';

// SN Classes for GRP pipes
const SN_CLASSES = ['SN 2500', 'SN 5000', 'SN 10000'];

const TestSetup = () => {
  const { t } = useTranslation();
  const { liveData, isConnected } = useLiveData();
  const { startTest, stopTest, goHome } = useCommands();
  const { data: parameters, isLoading: isLoadingParams } = useParameters();
  const setParameters = useSetParameters();

  // Input parameters
  const [pipeDiameter, setPipeDiameter] = useState<string>('200');
  const [sampleLength, setSampleLength] = useState<string>('300');
  const [deflectionPercent, setDeflectionPercent] = useState<string>('3');
  const [testSpeed, setTestSpeed] = useState<string>('10');
  const [operatorName, setOperatorName] = useState<string>('');
  const [sampleId, setSampleId] = useState<string>('');
  const [expectedSN, setExpectedSN] = useState<string>('SN 5000');

  // Sync with PLC parameters when loaded
  useEffect(() => {
    if (parameters && parameters.connected) {
      if (parameters.pipe_diameter > 0) setPipeDiameter(parameters.pipe_diameter.toString());
      if (parameters.pipe_length > 0) setSampleLength(parameters.pipe_length.toString());
      if (parameters.deflection_percent > 0) setDeflectionPercent(parameters.deflection_percent.toString());
      if (parameters.test_speed > 0) setTestSpeed(parameters.test_speed.toString());
    }
  }, [parameters]);

  // Calculated values
  const calculatedValues = useMemo(() => {
    const diameter = parseFloat(pipeDiameter) || 0;
    const deflection = parseFloat(deflectionPercent) || 0;

    // Target deflection in mm = (diameter * deflection%) / 100
    const targetDeflectionMm = (diameter * deflection) / 100;

    // Speed in mm/s = speed mm/min / 60
    const speedMmS = (parseFloat(testSpeed) || 0) / 60;

    // Estimated test time in seconds
    const estimatedTime = targetDeflectionMm > 0 && speedMmS > 0
      ? targetDeflectionMm / speedMmS
      : 0;

    return {
      targetDeflectionMm: targetDeflectionMm.toFixed(2),
      speedMmS: speedMmS.toFixed(2),
      estimatedTime: estimatedTime.toFixed(1),
    };
  }, [pipeDiameter, deflectionPercent, testSpeed]);

  const handleHome = () => {
    goHome.mutate();
  };

  const handleStartTest = () => {
    // First, send parameters to PLC
    setParameters.mutate({
      pipe_diameter: parseFloat(pipeDiameter),
      pipe_length: parseFloat(sampleLength),
      deflection_percent: parseFloat(deflectionPercent),
      test_speed: parseFloat(testSpeed),
    }, {
      onSuccess: () => {
        // Then start the test
        startTest.mutate();
      }
    });
  };

  const handleStop = () => {
    stopTest.mutate();
  };

  const handleSaveParameters = () => {
    setParameters.mutate({
      pipe_diameter: parseFloat(pipeDiameter),
      pipe_length: parseFloat(sampleLength),
      deflection_percent: parseFloat(deflectionPercent),
      test_speed: parseFloat(testSpeed),
    });
  };

  const isTesting = liveData.test_status === 2;
  const canStart = isConnected && liveData.servo_ready && !liveData.servo_error && !isTesting;

  return (
    <div className="h-full overflow-y-auto flex flex-col space-y-4 p-1 min-h-0">
      {/* Page Title + Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl lg:text-2xl font-bold">{t('testSetup.title')}</h1>
          {!isConnected && (
            <span className="text-xs text-destructive animate-pulse">PLC Disconnected</span>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleHome}
            size="sm"
            className="gap-1.5"
            disabled={!isConnected || goHome.isPending}
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
          <Button
            onClick={handleStartTest}
            disabled={!canStart || startTest.isPending || setParameters.isPending}
            size="sm"
            className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
          >
            {(startTest.isPending || setParameters.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start
          </Button>
          <Button
            variant="destructive"
            onClick={handleStop}
            size="sm"
            className="gap-1.5"
            disabled={stopTest.isPending}
          >
            <Square className="w-4 h-4" />
            Stop
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Input Parameters Card */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <Settings2 className="w-5 h-5 text-primary" />
              {t('testSetup.inputParameters')}
              {isLoadingParams && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pipe Diameter */}
            <div className="space-y-1.5">
              <Label htmlFor="pipeDiameter">{t('testSetup.pipeDiameter')} (mm)</Label>
              <Input
                id="pipeDiameter"
                type="number"
                value={pipeDiameter}
                onChange={(e) => setPipeDiameter(e.target.value)}
                placeholder="200"
                className="industrial-input"
                disabled={isTesting}
              />
            </div>

            {/* Sample Length */}
            <div className="space-y-1.5">
              <Label htmlFor="sampleLength">{t('testSetup.sampleLength')} (mm)</Label>
              <Input
                id="sampleLength"
                type="number"
                value={sampleLength}
                onChange={(e) => setSampleLength(e.target.value)}
                placeholder="300"
                className="industrial-input"
                disabled={isTesting}
              />
            </div>

            {/* Deflection Percent */}
            <div className="space-y-1.5">
              <Label htmlFor="deflectionPercent">{t('testSetup.deflectionPercent')}</Label>
              <Input
                id="deflectionPercent"
                type="number"
                value={deflectionPercent}
                onChange={(e) => setDeflectionPercent(e.target.value)}
                placeholder="3"
                min="0"
                max="30"
                step="0.5"
                className="industrial-input"
                disabled={isTesting}
              />
            </div>

            {/* Test Speed */}
            <div className="space-y-1.5">
              <Label htmlFor="testSpeed">{t('testSetup.testSpeed')} (mm/min)</Label>
              <Input
                id="testSpeed"
                type="number"
                value={testSpeed}
                onChange={(e) => setTestSpeed(e.target.value)}
                placeholder="10"
                className="industrial-input"
                disabled={isTesting}
              />
            </div>

            {/* Expected SN Class */}
            <div className="space-y-1.5">
              <Label>{t('testSetup.expectedSN')}</Label>
              <Select value={expectedSN} onValueChange={setExpectedSN} disabled={isTesting}>
                <SelectTrigger className="industrial-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SN_CLASSES.map((sn) => (
                    <SelectItem key={sn} value={sn}>
                      {sn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator Name */}
            <div className="space-y-1.5">
              <Label htmlFor="operatorName">{t('testSetup.operatorName')}</Label>
              <Input
                id="operatorName"
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Enter operator name"
                className="industrial-input"
              />
            </div>

            {/* Sample ID */}
            <div className="space-y-1.5">
              <Label htmlFor="sampleId">{t('testSetup.sampleId')}</Label>
              <Input
                id="sampleId"
                type="text"
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
                placeholder="Enter sample ID"
                className="industrial-input"
              />
            </div>

            {/* Save Parameters Button */}
            <Button
              variant="outline"
              onClick={handleSaveParameters}
              disabled={!isConnected || setParameters.isPending || isTesting}
              className="w-full"
            >
              {setParameters.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save to PLC
            </Button>
          </CardContent>
        </Card>

        {/* Calculated Values Card */}
        <Card className="industrial-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <Calculator className="w-5 h-5 text-warning" />
              {t('testSetup.calculatedValues')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Target Deflection */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="text-sm text-muted-foreground mb-1">
                {t('testSetup.targetDeflection')}
              </div>
              <div className="text-3xl font-bold text-foreground">
                {calculatedValues.targetDeflectionMm}
                <span className="text-lg font-normal text-muted-foreground ml-2">mm</span>
              </div>
            </div>

            {/* Speed in mm/s */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="text-sm text-muted-foreground mb-1">
                {t('testSetup.testSpeed')}
              </div>
              <div className="text-3xl font-bold text-foreground">
                {calculatedValues.speedMmS}
                <span className="text-lg font-normal text-muted-foreground ml-2">mm/s</span>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="text-sm text-muted-foreground mb-1">
                Estimated Test Time
              </div>
              <div className="text-3xl font-bold text-foreground">
                {calculatedValues.estimatedTime}
                <span className="text-lg font-normal text-muted-foreground ml-2">seconds</span>
              </div>
            </div>

            {/* Test Summary */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-sm font-medium text-primary mb-2">Test Summary</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Pipe: {pipeDiameter || '0'} mm x {sampleLength || '0'} mm</li>
                <li>Target: {deflectionPercent || '0'}% ({calculatedValues.targetDeflectionMm} mm)</li>
                <li>Expected: {expectedSN}</li>
                {operatorName && <li>Operator: {operatorName}</li>}
                {sampleId && <li>Sample: {sampleId}</li>}
              </ul>
            </div>

            {/* Live Values from PLC */}
            {isConnected && (
              <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                <div className="text-sm font-medium text-info mb-2">Live Values</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Force: {liveData.actual_force.toFixed(2)} kN</li>
                  <li>Deflection: {liveData.actual_deflection.toFixed(2)} mm</li>
                  <li>Position: {liveData.actual_position.toFixed(2)} mm</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestSetup;
