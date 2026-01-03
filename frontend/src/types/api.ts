// Live data from PLC
export interface LiveData {
  actual_force: number;
  actual_deflection: number;
  target_deflection: number;
  ring_stiffness: number;
  force_at_target: number;
  sn_class: number;
  test_status: number; // -1: disconnected, 0: idle, 1: starting, 2: testing, 3: atTarget, 4: returning, 5: complete
  test_passed: boolean;
  servo_ready: boolean;
  servo_error: boolean;
  at_home: boolean;
  upper_limit: boolean;
  lower_limit: boolean;
  e_stop: boolean;
  start_button: boolean;
  load_cell_raw: number;
  actual_position: number;
  remote_mode: boolean;
  connected: boolean;
}

// Test parameters
export interface TestParameters {
  pipe_diameter: number;
  pipe_length: number;
  deflection_percent: number;
  test_speed: number;
  max_stroke: number;
  max_force: number;
  connected: boolean;
}

// Test record
export interface TestRecord {
  id: number;
  sample_id: string | null;
  operator: string | null;
  test_date: string;
  pipe_diameter: number;
  pipe_length: number;
  deflection_percent: number;
  force_at_target: number | null;
  max_force: number | null;
  ring_stiffness: number | null;
  sn_class: number | null;
  passed: boolean;
  test_speed: number | null;
  duration: number | null;
  notes: string | null;
  data_points?: TestDataPoint[];
}

// Test data point
export interface TestDataPoint {
  id: number;
  test_id: number;
  timestamp: number;
  force: number;
  deflection: number;
  position: number | null;
}

// Alarm
export interface Alarm {
  id: number;
  alarm_code: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  acknowledged: boolean;
  ack_timestamp: string | null;
  ack_by: string | null;
}

// API responses
export interface TestsResponse {
  tests: TestRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AlarmsResponse {
  alarms: Alarm[];
  page: number;
  page_size: number;
}

export interface CommandResponse {
  success: boolean;
  message: string;
}

export interface ConnectionStatus {
  connected: boolean;
  ip: string;
  message: string;
}

// Mode response
export interface ModeResponse {
  remote_mode: boolean;
  mode: 'local' | 'remote';
}
