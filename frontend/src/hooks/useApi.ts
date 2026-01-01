import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import type { TestParameters, TestsResponse, AlarmsResponse } from '@/types/api';

// ========== Parameters ==========

export function useParameters() {
  return useQuery({
    queryKey: ['parameters'],
    queryFn: () => api.getParameters(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useSetParameters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Partial<TestParameters>) => api.setParameters(params),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Parameters updated');
        queryClient.invalidateQueries({ queryKey: ['parameters'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update parameters: ${error.message}`);
    },
  });
}

// ========== Commands ==========

export function useCommands() {
  const startTest = useMutation({
    mutationFn: () => api.startTest(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Test started');
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to start test: ${error.message}`);
    },
  });

  const stopTest = useMutation({
    mutationFn: () => api.stopTest(),
    onSuccess: (data) => {
      if (data.success) {
        toast.warning('Test stopped');
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to stop: ${error.message}`);
    },
  });

  const goHome = useMutation({
    mutationFn: () => api.goHome(),
    onSuccess: (data) => {
      if (data.success) {
        toast.info('Moving to home position...');
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to home: ${error.message}`);
    },
  });

  return { startTest, stopTest, goHome };
}

// ========== Servo ==========

export function useServoControl() {
  const enableServo = useMutation({
    mutationFn: () => api.enableServo(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Servo enabled');
      } else {
        toast.error(data.message);
      }
    },
  });

  const disableServo = useMutation({
    mutationFn: () => api.disableServo(),
    onSuccess: (data) => {
      if (data.success) {
        toast.warning('Servo disabled');
      } else {
        toast.error(data.message);
      }
    },
  });

  const resetAlarm = useMutation({
    mutationFn: () => api.resetAlarm(),
    onSuccess: (data) => {
      if (data.success) {
        toast.info('Alarm reset');
      } else {
        toast.error(data.message);
      }
    },
  });

  return { enableServo, disableServo, resetAlarm };
}

// ========== Clamps ==========

export function useClampControl() {
  const lockUpper = useMutation({
    mutationFn: () => api.lockUpper(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Upper clamp locked');
      } else {
        toast.error(data.message);
      }
    },
  });

  const lockLower = useMutation({
    mutationFn: () => api.lockLower(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Lower clamp locked');
      } else {
        toast.error(data.message);
      }
    },
  });

  const unlockAll = useMutation({
    mutationFn: () => api.unlockAll(),
    onSuccess: (data) => {
      if (data.success) {
        toast.warning('All clamps unlocked');
      } else {
        toast.error(data.message);
      }
    },
  });

  return { lockUpper, lockLower, unlockAll };
}

// ========== Tests ==========

export function useTests(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['tests', page, pageSize],
    queryFn: () => api.getTests(page, pageSize),
  });
}

export function useTest(id: number) {
  return useQuery({
    queryKey: ['test', id],
    queryFn: () => api.getTest(id),
    enabled: id > 0,
  });
}

export function useDeleteTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteTest(id),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Test deleted');
        queryClient.invalidateQueries({ queryKey: ['tests'] });
      } else {
        toast.error(data.message);
      }
    },
  });
}

// ========== Alarms ==========

export function useAlarms(activeOnly = false, page = 1) {
  return useQuery({
    queryKey: ['alarms', activeOnly, page],
    queryFn: () => api.getAlarms(activeOnly, page),
    refetchInterval: 5000,
  });
}

export function useAcknowledgeAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ackBy }: { id: number; ackBy?: string }) =>
      api.acknowledgeAlarm(id, ackBy),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Alarm acknowledged');
        queryClient.invalidateQueries({ queryKey: ['alarms'] });
      } else {
        toast.error(data.message);
      }
    },
  });
}

export function useAcknowledgeAllAlarms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ackBy?: string) => api.acknowledgeAllAlarms(ackBy),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('All alarms acknowledged');
        queryClient.invalidateQueries({ queryKey: ['alarms'] });
      } else {
        toast.error(data.message);
      }
    },
  });
}

// ========== Connection ==========

export function useConnection() {
  const status = useQuery({
    queryKey: ['connection'],
    queryFn: () => api.getConnectionStatus(),
    refetchInterval: 3000,
  });

  const reconnect = useMutation({
    mutationFn: () => api.reconnect(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Reconnected to PLC');
      } else {
        toast.error(data.message);
      }
    },
  });

  return { status, reconnect };
}
