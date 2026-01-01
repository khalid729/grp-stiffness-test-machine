import type {
  LiveData,
  TestParameters,
  TestRecord,
  TestsResponse,
  AlarmsResponse,
  CommandResponse,
  ConnectionStatus,
} from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // ========== Status ==========

  async getStatus(): Promise<LiveData> {
    return this.request<LiveData>('/api/status');
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.request<ConnectionStatus>('/api/status/connection');
  }

  async reconnect(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/status/reconnect', { method: 'POST' });
  }

  async getParameters(): Promise<TestParameters> {
    return this.request<TestParameters>('/api/parameters');
  }

  async setParameters(params: Partial<TestParameters>): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/parameters', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ========== Commands ==========

  async startTest(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/command/start', { method: 'POST' });
  }

  async stopTest(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/command/stop', { method: 'POST' });
  }

  async goHome(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/command/home', { method: 'POST' });
  }

  // ========== Servo ==========

  async enableServo(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/servo/enable', { method: 'POST' });
  }

  async disableServo(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/servo/disable', { method: 'POST' });
  }

  async resetAlarm(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/servo/reset', { method: 'POST' });
  }

  // ========== Jog ==========

  async setJogSpeed(velocity: number): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/jog/speed', {
      method: 'POST',
      body: JSON.stringify({ velocity }),
    });
  }

  async jogForwardStart(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/jog/forward/start', { method: 'POST' });
  }

  async jogForwardStop(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/jog/forward/stop', { method: 'POST' });
  }

  async jogBackwardStart(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/jog/backward/start', { method: 'POST' });
  }

  async jogBackwardStop(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/jog/backward/stop', { method: 'POST' });
  }

  // ========== Clamps ==========

  async lockUpper(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/clamp/upper/lock', { method: 'POST' });
  }

  async lockLower(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/clamp/lower/lock', { method: 'POST' });
  }

  async unlockAll(): Promise<CommandResponse> {
    return this.request<CommandResponse>('/api/clamp/unlock', { method: 'POST' });
  }

  // ========== Tests ==========

  async getTests(page = 1, pageSize = 20): Promise<TestsResponse> {
    return this.request<TestsResponse>(`/api/tests?page=${page}&page_size=${pageSize}`);
  }

  async getTest(id: number): Promise<TestRecord> {
    return this.request<TestRecord>(`/api/tests/${id}`);
  }

  async deleteTest(id: number): Promise<CommandResponse> {
    return this.request<CommandResponse>(`/api/tests/${id}`, { method: 'DELETE' });
  }

  // ========== Reports ==========

  getPdfReportUrl(testId: number): string {
    return `${this.baseUrl}/api/report/pdf/${testId}`;
  }

  getExcelExportUrl(startDate?: string, endDate?: string): string {
    let url = `${this.baseUrl}/api/report/excel`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return url;
  }

  // ========== Alarms ==========

  async getAlarms(activeOnly = false, page = 1): Promise<AlarmsResponse> {
    return this.request<AlarmsResponse>(
      `/api/alarms?active_only=${activeOnly}&page=${page}`
    );
  }

  async acknowledgeAlarm(id: number, ackBy?: string): Promise<CommandResponse> {
    const params = ackBy ? `?ack_by=${encodeURIComponent(ackBy)}` : '';
    return this.request<CommandResponse>(`/api/alarms/${id}/acknowledge${params}`, {
      method: 'POST',
    });
  }

  async acknowledgeAllAlarms(ackBy?: string): Promise<CommandResponse> {
    const params = ackBy ? `?ack_by=${encodeURIComponent(ackBy)}` : '';
    return this.request<CommandResponse>(`/api/alarms/acknowledge-all${params}`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
export default api;
