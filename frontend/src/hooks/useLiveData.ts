import { useState, useEffect, useCallback } from 'react';
import { socketClient } from '@/api/socket';
import type { LiveData } from '@/types/api';

const defaultLiveData: LiveData = {
  actual_force: 0,
  actual_deflection: 0,
  target_deflection: 0,
  ring_stiffness: 0,
  force_at_target: 0,
  sn_class: 0,
  test_status: -1,
  test_passed: false,
  servo_ready: false,
  servo_error: false,
  at_home: false,
  upper_limit: false,
  lower_limit: false,
  e_stop: false,
  start_button: false,
  load_cell_raw: 0,
  actual_position: 0,
  remote_mode: false,
  connected: false,
};

export function useLiveData() {
  const [liveData, setLiveData] = useState<LiveData>(defaultLiveData);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    socketClient.connect();
    setIsConnected(socketClient.isConnected);

    // Subscribe to live data
    const unsubscribeLiveData = socketClient.on<LiveData>('live_data', (data) => {
      setLiveData(data);
      setIsConnected(data.connected);
    });

    const unsubscribeConnection = socketClient.on<{ connected: boolean }>(
      'connection_status',
      (data) => {
        setIsConnected(data.connected);
      }
    );

    // Cleanup
    return () => {
      unsubscribeLiveData();
      unsubscribeConnection();
    };
  }, []);

  return { liveData, isConnected };
}

export function useTestStatus() {
  const { liveData, isConnected } = useLiveData();

  const statusMap: Record<number, string> = {
    [-1]: 'disconnected',
    0: 'idle',
    1: 'starting',
    2: 'testing',
    3: 'atTarget',
    4: 'returning',
    5: 'complete',
  };

  return {
    status: liveData.test_status,
    statusText: statusMap[liveData.test_status] || 'error',
    isConnected,
    isTesting: liveData.test_status === 2,
    isIdle: liveData.test_status === 0,
    isComplete: liveData.test_status === 5,
  };
}

export function useJogControl() {
  const jogForward = useCallback((state: boolean) => {
    socketClient.jogForward(state);
  }, []);

  const jogBackward = useCallback((state: boolean) => {
    socketClient.jogBackward(state);
  }, []);

  const setJogSpeed = useCallback((velocity: number) => {
    socketClient.setJogSpeed(velocity);
  }, []);

  return { jogForward, jogBackward, setJogSpeed };
}
