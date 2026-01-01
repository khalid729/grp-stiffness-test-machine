import { useTranslation } from 'react-i18next';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { MachineIndicator } from '@/components/dashboard/MachineIndicator';
import { TestStatusBadge } from '@/components/dashboard/TestStatusBadge';
import { ForceDeflectionChart } from '@/components/dashboard/ForceDeflectionChart';
import { Button } from '@/components/ui/button';
import { Gauge, Move, Target, Activity, Home, Play, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import { useCommands } from '@/hooks/useApi';
import { socketClient } from '@/api/socket';

const Dashboard = () => {
  const { t } = useTranslation();
  const { liveData, isConnected } = useLiveData();
  const { startTest, stopTest, goHome } = useCommands();

  // Chart data - accumulate from live data
  const [chartData, setChartData] = useState<{ deflection: number; force: number }[]>([]);

  // Update chart data when testing
  useEffect(() => {
    if (liveData.test_status === 2) { // Testing
      setChartData(prev => {
        // Avoid duplicates
        const lastPoint = prev[prev.length - 1];
        if (lastPoint &&
            Math.abs(lastPoint.deflection - liveData.actual_deflection) < 0.01) {
          return prev;
        }
        return [...prev, {
          deflection: liveData.actual_deflection,
          force: liveData.actual_force,
        }];
      });
    } else if (liveData.test_status === 0) { // Idle - reset chart
      // Keep chart data until new test starts
    } else if (liveData.test_status === 1) { // Starting - clear for new test
      setChartData([]);
    }
  }, [liveData.actual_deflection, liveData.actual_force, liveData.test_status]);

  // Listen for test complete event
  useEffect(() => {
    const unsubscribe = socketClient.on('test_complete', (data) => {
      console.log('Test complete:', data);
    });
    return unsubscribe;
  }, []);

  const handleHome = () => {
    goHome.mutate();
  };

  const handleStartTest = () => {
    setChartData([]); // Clear previous chart
    startTest.mutate();
  };

  const handleStop = () => {
    stopTest.mutate();
  };

  // Map test status to the expected format
  const testStatus = liveData.test_status as 0 | 1 | 2 | 3 | 4 | 5 | -1;

  return (
    <div className="h-full overflow-y-auto flex flex-col space-y-4 p-1 min-h-0">
      {/* Page Title + Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl lg:text-2xl font-bold">{t('nav.dashboard')}</h1>
          <TestStatusBadge status={testStatus} />
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
            disabled={!isConnected || !liveData.servo_ready || liveData.servo_error || liveData.test_status === 2 || startTest.isPending}
            size="sm"
            className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
          >
            <Play className="w-4 h-4" />
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

      {/* Status Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
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
        <StatusCard
          title={t('dashboard.status')}
          value={t(`status.${['idle', 'starting', 'testing', 'atTarget', 'returning', 'complete'][liveData.test_status] || 'error'}`)}
          icon={<Activity className="w-5 h-5" />}
          variant={liveData.test_status === 2 ? 'warning' : liveData.test_status === 5 ? 'success' : 'default'}
        />
      </div>

      {/* Chart Section */}
      <div className="industrial-card p-4 min-h-[300px] flex-shrink-0">
        <ForceDeflectionChart
          data={chartData}
          targetDeflection={liveData.target_deflection}
        />
      </div>

      {/* Machine Indicators */}
      <div className="industrial-card p-4 flex-shrink-0">
        <h3 className="text-sm lg:text-base font-semibold mb-3">{t('dashboard.machineIndicators')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MachineIndicator
            label="Servo Ready"
            isActive={liveData.servo_ready}
          />
          <MachineIndicator
            label="Servo Error"
            isActive={liveData.servo_error}
            isError={liveData.servo_error}
          />
          <MachineIndicator
            label="Upper Lock"
            isActive={liveData.lock_upper}
          />
          <MachineIndicator
            label="Lower Lock"
            isActive={liveData.lock_lower}
          />
          <MachineIndicator
            label="At Home"
            isActive={liveData.at_home}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
