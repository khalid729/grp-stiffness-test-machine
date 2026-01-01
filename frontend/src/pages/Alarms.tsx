import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Bell,
  BellOff,
  History,
  Loader2
} from 'lucide-react';
import { useAlarms, useAcknowledgeAlarm, useAcknowledgeAllAlarms } from '@/hooks/useApi';
import { socketClient } from '@/api/socket';
import { toast } from 'sonner';
import type { Alarm } from '@/types/api';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'warning':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'info':
      return 'bg-info/20 text-info border-info/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-warning" />;
    case 'info':
      return <Bell className="w-5 h-5 text-info" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
};

const Alarms = () => {
  const { t } = useTranslation();
  const { data: alarmsData, isLoading, refetch } = useAlarms(false, 1);
  const acknowledgeAlarm = useAcknowledgeAlarm();
  const acknowledgeAllAlarms = useAcknowledgeAllAlarms();

  // Listen for new alarms via WebSocket
  useEffect(() => {
    const unsubscribe = socketClient.on<Alarm>('alarm', (alarm) => {
      toast.error(`${alarm.alarm_code}: ${alarm.message}`, {
        duration: 10000,
      });
      refetch();
    });
    return unsubscribe;
  }, [refetch]);

  const handleAcknowledge = (alarmId: number) => {
    acknowledgeAlarm.mutate({ id: alarmId });
  };

  const handleAcknowledgeAll = () => {
    acknowledgeAllAlarms.mutate();
  };

  const activeAlarms = alarmsData?.alarms.filter(a => !a.acknowledged) || [];
  const acknowledgedAlarms = alarmsData?.alarms.filter(a => a.acknowledged) || [];
  const unacknowledgedCount = activeAlarms.length;

  return (
    <div className="h-full overflow-y-auto flex flex-col space-y-4 p-1 min-h-0">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl lg:text-2xl font-bold">{t('alarms.title')}</h1>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unacknowledgedCount} Active
            </Badge>
          )}
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAcknowledgeAll}
            size="sm"
            className="gap-1.5"
            disabled={unacknowledgedCount === 0 || acknowledgeAllAlarms.isPending}
          >
            {acknowledgeAllAlarms.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {t('alarms.acknowledge')} All
          </Button>
          <Button
            variant="ghost"
            onClick={() => refetch()}
            size="sm"
            className="gap-1.5"
          >
            <BellOff className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alarms */}
      <Card className="industrial-card flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t('alarms.activeAlarms')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mb-3 text-success" />
              <p className="text-lg font-medium">{t('alarms.noActiveAlarms')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${getSeverityColor(alarm.severity)}`}
                >
                  <div className="flex items-center gap-4">
                    {getSeverityIcon(alarm.severity)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{alarm.alarm_code}</span>
                        <span className="font-medium">{alarm.message}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alarm.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledge(alarm.id)}
                    className="gap-1.5"
                    disabled={acknowledgeAlarm.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('alarms.acknowledge')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alarm History */}
      <Card className="industrial-card flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <History className="w-5 h-5 text-muted-foreground" />
            {t('alarms.alarmHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {acknowledgedAlarms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>{t('alarms.alarm')}</TableHead>
                  <TableHead>{t('alarms.time')}</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acknowledgedAlarms.map((alarm) => (
                  <TableRow key={alarm.id}>
                    <TableCell className="font-mono font-bold">{alarm.alarm_code}</TableCell>
                    <TableCell>{alarm.message}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(alarm.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(alarm.severity)}>
                        {alarm.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No alarm history</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Alarms;
