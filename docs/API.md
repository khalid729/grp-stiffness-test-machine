# API Reference

Complete REST API and WebSocket documentation for the GRP Ring Stiffness Test Machine.

---

## Base URL

```
Development: http://localhost:8000
Production: https://your-domain.com
```

---

## REST API Endpoints

### Health & Status

#### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "plc_connected": true,
  "plc_ip": "192.168.0.100"
}
```

---

#### GET /api/status
Get all live data from PLC.

**Response:**
```json
{
  "actual_force": 25.5,
  "actual_deflection": 3.2,
  "target_deflection": 4.5,
  "ring_stiffness": 5230.0,
  "force_at_target": 45.2,
  "sn_class": 5000,
  "test_status": 0,
  "test_passed": false,
  "servo_ready": true,
  "servo_error": false,
  "at_home": true,
  "lock_upper": false,
  "lock_lower": false,
  "actual_position": 0.0,
  "connected": true
}
```

**Test Status Codes:**
| Code | Status |
|------|--------|
| -1 | Disconnected |
| 0 | Idle |
| 1 | Starting |
| 2 | Testing |
| 3 | At Target |
| 4 | Returning |
| 5 | Complete |

---

#### GET /api/status/connection
Get PLC connection status.

**Response:**
```json
{
  "connected": true,
  "ip": "192.168.0.100",
  "message": "Connected"
}
```

---

#### POST /api/status/reconnect
Reconnect to PLC.

**Response:**
```json
{
  "success": true,
  "connected": true,
  "message": "Reconnected successfully"
}
```

---

### Test Parameters

#### GET /api/parameters
Get current test parameters from PLC.

**Response:**
```json
{
  "pipe_diameter": 200.0,
  "pipe_length": 300.0,
  "deflection_percent": 3.0,
  "test_speed": 10.0,
  "max_stroke": 100.0,
  "max_force": 100.0,
  "connected": true
}
```

---

#### POST /api/parameters
Set test parameters to PLC.

**Request Body:**
```json
{
  "pipe_diameter": 200.0,
  "pipe_length": 300.0,
  "deflection_percent": 3.0,
  "test_speed": 10.0,
  "max_stroke": 100.0,
  "max_force": 100.0
}
```

All fields are optional - only provided values will be updated.

**Response:**
```json
{
  "success": true,
  "message": "Parameters updated successfully"
}
```

---

### Test Control Commands

#### POST /api/command/start
Start automated test.

**Response:**
```json
{
  "success": true,
  "message": "Test started"
}
```

---

#### POST /api/command/stop
Emergency stop - stops all movement immediately.

**Response:**
```json
{
  "success": true,
  "message": "Emergency stop executed"
}
```

---

#### POST /api/command/home
Move to home position.

**Response:**
```json
{
  "success": true,
  "message": "Homing started"
}
```

---

### Servo Control

#### POST /api/servo/enable
Enable servo motor.

**Response:**
```json
{
  "success": true,
  "message": "Servo enabled"
}
```

---

#### POST /api/servo/disable
Disable servo motor.

**Response:**
```json
{
  "success": true,
  "message": "Servo disabled"
}
```

---

#### POST /api/servo/reset
Reset servo alarm.

**Response:**
```json
{
  "success": true,
  "message": "Alarm reset"
}
```

---

### Jog Control

#### POST /api/jog/speed
Set jog velocity.

**Request Body:**
```json
{
  "velocity": 50.0
}
```

| Parameter | Type | Range | Unit |
|-----------|------|-------|------|
| velocity | float | 1-100 | mm/min |

**Response:**
```json
{
  "success": true,
  "message": "Jog speed set to 50.0 mm/min"
}
```

---

#### POST /api/jog/forward/start
Start jog forward (down).

---

#### POST /api/jog/forward/stop
Stop jog forward.

---

#### POST /api/jog/backward/start
Start jog backward (up).

---

#### POST /api/jog/backward/stop
Stop jog backward.

All jog endpoints return:
```json
{
  "success": true,
  "message": "Jog [direction] [started/stopped]"
}
```

---

### Clamp Control

#### POST /api/clamp/upper/lock
Lock upper clamp.

---

#### POST /api/clamp/lower/lock
Lock lower clamp.

---

#### POST /api/clamp/unlock
Unlock all clamps.

All clamp endpoints return:
```json
{
  "success": true,
  "message": "[Clamp action] successfully"
}
```

---

### Test History

#### GET /api/tests
Get test history with pagination and filters.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number (1-indexed) |
| page_size | int | 20 | Items per page (max 100) |
| sample_id | string | - | Filter by sample ID (contains) |
| operator | string | - | Filter by operator (contains) |
| passed | bool | - | Filter by pass/fail status |

**Response:**
```json
{
  "tests": [
    {
      "id": 1,
      "sample_id": "SAMPLE-1234",
      "operator": "Ahmed",
      "test_date": "2025-01-15T10:30:00Z",
      "pipe_diameter": 200.0,
      "pipe_length": 300.0,
      "deflection_percent": 3.0,
      "force_at_target": 45.2,
      "max_force": 48.5,
      "ring_stiffness": 5230.0,
      "sn_class": 5000,
      "passed": true,
      "test_speed": 10.0,
      "duration": 45.5
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

---

#### GET /api/tests/{test_id}
Get single test with data points.

**Response:**
```json
{
  "id": 1,
  "sample_id": "SAMPLE-1234",
  "operator": "Ahmed",
  "test_date": "2025-01-15T10:30:00Z",
  "pipe_diameter": 200.0,
  "pipe_length": 300.0,
  "ring_stiffness": 5230.0,
  "passed": true,
  "data_points": [
    {
      "id": 1,
      "timestamp": 0.0,
      "force": 0.0,
      "deflection": 0.0,
      "position": 0.0
    },
    {
      "id": 2,
      "timestamp": 0.1,
      "force": 5.2,
      "deflection": 0.3,
      "position": 0.3
    }
  ]
}
```

---

#### DELETE /api/tests/{test_id}
Delete a test record.

**Response:**
```json
{
  "success": true,
  "message": "Test 1 deleted"
}
```

---

### Reports

#### GET /api/report/pdf/{test_id}
Download PDF report for a specific test.

**Response:** PDF file download

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename=test_report_1_20250115.pdf
```

---

#### GET /api/report/excel
Export tests to Excel file.

**Query Parameters:**
| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| start_date | string | ISO 8601 | Filter start date |
| end_date | string | ISO 8601 | Filter end date |

**Example:**
```
GET /api/report/excel?start_date=2025-01-01&end_date=2025-01-31
```

**Response:** Excel file download

**Headers:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=test_export_20250115_103000.xlsx
```

---

### Alarms

#### GET /api/alarms
Get alarm history.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| active_only | bool | false | Show only unacknowledged alarms |
| page | int | 1 | Page number |
| page_size | int | 50 | Items per page (max 100) |

**Response:**
```json
{
  "alarms": [
    {
      "id": 1,
      "alarm_code": "E001",
      "message": "Servo Fault",
      "severity": "critical",
      "timestamp": "2025-01-15T10:30:00Z",
      "acknowledged": false,
      "ack_timestamp": null,
      "ack_by": null
    }
  ],
  "page": 1,
  "page_size": 50
}
```

**Severity Levels:**
- `critical` - Requires immediate attention
- `warning` - Potential issue
- `info` - Informational message

---

#### POST /api/alarms/{alarm_id}/acknowledge
Acknowledge a single alarm.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| ack_by | string | Operator name (optional) |

**Response:**
```json
{
  "success": true,
  "message": "Alarm 1 acknowledged"
}
```

---

#### POST /api/alarms/acknowledge-all
Acknowledge all active alarms.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| ack_by | string | Operator name (optional) |

**Response:**
```json
{
  "success": true,
  "message": "5 alarms acknowledged"
}
```

---

### Demo Data (Development Only)

#### POST /api/demo/generate-tests
Generate demo test data.

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| count | int | 5 |

---

#### POST /api/demo/generate-alarms
Generate demo alarms.

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| count | int | 5 |

---

#### DELETE /api/demo/clear-all
Clear all demo data (tests, data points, alarms).

---

## WebSocket API

### Connection

Connect using Socket.IO:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000', {
  path: '/socket.io',
  transports: ['websocket', 'polling']
});
```

---

### Client Events (Emit)

#### subscribe
Subscribe to live data updates.

```javascript
socket.emit('subscribe', {});
```

---

#### unsubscribe
Unsubscribe from live data.

```javascript
socket.emit('unsubscribe', {});
```

---

#### jog_forward
Control jog forward movement.

```javascript
// Start jog
socket.emit('jog_forward', { state: true });

// Stop jog
socket.emit('jog_forward', { state: false });
```

---

#### jog_backward
Control jog backward movement.

```javascript
// Start jog
socket.emit('jog_backward', { state: true });

// Stop jog
socket.emit('jog_backward', { state: false });
```

---

#### set_jog_speed
Set jog velocity.

```javascript
socket.emit('set_jog_speed', { velocity: 50 });
```

---

### Server Events (Listen)

#### live_data
Real-time data broadcast (100ms interval).

```javascript
socket.on('live_data', (data) => {
  console.log(data);
  // {
  //   actual_force: 25.5,
  //   actual_deflection: 3.2,
  //   target_deflection: 4.5,
  //   ring_stiffness: 5230.0,
  //   force_at_target: 45.2,
  //   sn_class: 5000,
  //   test_status: 2,
  //   test_passed: false,
  //   servo_ready: true,
  //   servo_error: false,
  //   at_home: false,
  //   lock_upper: true,
  //   lock_lower: true,
  //   actual_position: 3.2,
  //   connected: true
  // }
});
```

---

#### connection_status
PLC connection status changes.

```javascript
socket.on('connection_status', (data) => {
  console.log(data.connected); // true or false
});
```

---

#### test_complete
Emitted when a test finishes.

```javascript
socket.on('test_complete', (data) => {
  console.log(data);
  // {
  //   test_id: 123,
  //   passed: true,
  //   ring_stiffness: 5230.0,
  //   sn_class: 5000
  // }
});
```

---

#### alarm
Emitted when an alarm occurs.

```javascript
socket.on('alarm', (data) => {
  console.log(data);
  // {
  //   alarm_code: "E001",
  //   message: "Servo Fault",
  //   severity: "critical",
  //   timestamp: "2025-01-15T10:30:00Z"
  // }
});
```

---

#### jog_response
Response to jog commands.

```javascript
socket.on('jog_response', (data) => {
  console.log(data);
  // {
  //   direction: "forward",
  //   state: true,
  //   success: true
  // }
});
```

---

#### jog_speed_response
Response to jog speed change.

```javascript
socket.on('jog_speed_response', (data) => {
  console.log(data);
  // {
  //   velocity: 50,
  //   success: true
  // }
});
```

---

### Safety Features

1. **Auto-stop on disconnect**: When a client disconnects, all jog movements are automatically stopped.

2. **Connection monitoring**: The server maintains a heartbeat and will stop all movements if communication is lost.

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |
| 503 | Service Unavailable - PLC not connected |

### Error Response Format

```json
{
  "detail": "Error message describing the problem"
}
```

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| REST API | No limit (local network) |
| WebSocket live_data | 10 Hz (100ms) |
| Jog commands | Immediate processing |

---

## CORS Configuration

The API allows all origins by default for development. In production, configure allowed origins in `config.py`:

```python
CORS_ORIGINS = ["https://your-domain.com"]
```
