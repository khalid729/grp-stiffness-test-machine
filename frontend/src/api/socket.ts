import { io, Socket } from 'socket.io-client';
import type { LiveData } from '@/types/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      // Subscribe to live data
      this.socket?.emit('subscribe', {});
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('live_data', (data: LiveData) => {
      this.emit('live_data', data);
    });

    this.socket.on('test_complete', (data: unknown) => {
      this.emit('test_complete', data);
    });

    this.socket.on('alarm', (data: unknown) => {
      this.emit('alarm', data);
    });

    this.socket.on('connection_status', (data: unknown) => {
      this.emit('connection_status', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('unsubscribe', {});
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private emit(event: string, data: unknown): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  on<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (data: unknown) => void);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as (data: unknown) => void);
    };
  }

  // Jog commands via WebSocket for real-time control
  jogForward(state: boolean): void {
    this.socket?.emit('jog_forward', { state });
  }

  jogBackward(state: boolean): void {
    this.socket?.emit('jog_backward', { state });
  }

  setJogSpeed(velocity: number): void {
    this.socket?.emit('set_jog_speed', { velocity });
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketClient = new SocketClient();
export default socketClient;
