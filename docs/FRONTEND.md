# Frontend Guide

Complete documentation for the React frontend application.

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| React Router | 6.x | Routing |
| React Query | 5.x | Server state management |
| Socket.IO Client | 4.x | WebSocket communication |
| shadcn/ui | Latest | UI components |
| Tailwind CSS | 3.x | Styling |
| Recharts | 2.x | Charts |
| Sonner | Latest | Toast notifications |

---

## Project Structure

```
frontend/src/
├── api/
│   ├── client.ts           # REST API client
│   └── socket.ts           # WebSocket client
│
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   └── dashboard/
│       ├── StatusCard.tsx
│       ├── ForceChart.tsx
│       └── Indicators.tsx
│
├── hooks/
│   ├── useLiveData.ts       # Real-time data hook
│   └── useApi.ts            # React Query hooks
│
├── pages/
│   ├── Dashboard.tsx        # Main dashboard
│   ├── TestSetup.tsx        # Test configuration
│   ├── ManualControl.tsx    # Manual controls
│   ├── Reports.tsx          # Test history
│   ├── Alarms.tsx           # Alarm management
│   └── Settings.tsx         # System settings
│
├── types/
│   └── api.ts               # TypeScript interfaces
│
├── lib/
│   └── utils.ts             # Utility functions
│
├── App.tsx                   # Main app component
└── main.tsx                  # Entry point
```

---

## API Clients

### REST API Client

Located in `src/api/client.ts`:

```typescript
import { api } from '@/api/client';

// Get test parameters
const params = await api.getParameters();

// Set parameters
await api.setParameters({
  pipe_diameter: 200,
  pipe_length: 300,
  deflection_percent: 3.0
});

// Commands
await api.startTest();
await api.stopTest();
await api.goHome();

// Servo control
await api.enableServo();
await api.disableServo();
await api.resetAlarm();

// Clamp control
await api.lockUpper();
await api.lockLower();
await api.unlockAll();

// Reports
const tests = await api.getTests(page, pageSize);
const pdfUrl = api.getPdfReportUrl(testId);
const excelUrl = api.getExcelExportUrl(startDate, endDate);
```

### WebSocket Client

Located in `src/api/socket.ts`:

```typescript
import { socketClient } from '@/api/socket';

// Connect
socketClient.connect();

// Subscribe to events
const unsubscribe = socketClient.on<LiveData>('live_data', (data) => {
  console.log(data.actual_force);
});

// Jog control (low latency)
socketClient.jogForward(true);   // Start
socketClient.jogForward(false);  // Stop
socketClient.setJogSpeed(50);

// Disconnect
socketClient.disconnect();
```

---

## React Hooks

### useLiveData

Real-time data from PLC via WebSocket:

```typescript
import { useLiveData } from '@/hooks/useLiveData';

function Dashboard() {
  const { liveData, isConnected } = useLiveData();

  return (
    <div>
      <p>Force: {liveData.actual_force} kN</p>
      <p>Deflection: {liveData.actual_deflection} mm</p>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### useTestStatus

Convenient test status helper:

```typescript
import { useTestStatus } from '@/hooks/useLiveData';

function TestIndicator() {
  const { status, statusText, isTesting, isIdle, isComplete } = useTestStatus();

  return <span className={isTesting ? 'text-green-500' : ''}>{statusText}</span>;
}
```

### useJogControl

Jog control via WebSocket:

```typescript
import { useJogControl } from '@/hooks/useLiveData';

function JogButtons() {
  const { jogForward, jogBackward, setJogSpeed } = useJogControl();

  return (
    <>
      <button
        onMouseDown={() => jogForward(true)}
        onMouseUp={() => jogForward(false)}
      >
        Jog Down
      </button>
      <button
        onMouseDown={() => jogBackward(true)}
        onMouseUp={() => jogBackward(false)}
      >
        Jog Up
      </button>
    </>
  );
}
```

### useParameters

Get/set test parameters:

```typescript
import { useParameters, useSetParameters } from '@/hooks/useApi';

function TestSetup() {
  const { data: params, isLoading } = useParameters();
  const setParams = useSetParameters();

  const handleSave = () => {
    setParams.mutate({
      pipe_diameter: 200,
      deflection_percent: 3.0
    });
  };
}
```

### useCommands

Test control commands:

```typescript
import { useCommands } from '@/hooks/useApi';

function Controls() {
  const { startTest, stopTest, goHome } = useCommands();

  return (
    <>
      <button onClick={() => startTest.mutate()}>Start</button>
      <button onClick={() => stopTest.mutate()}>Stop</button>
      <button onClick={() => goHome.mutate()}>Home</button>
    </>
  );
}
```

### useServoControl

Servo motor control:

```typescript
import { useServoControl } from '@/hooks/useApi';

function ServoPanel() {
  const { enableServo, disableServo, resetAlarm } = useServoControl();

  return (
    <>
      <button onClick={() => enableServo.mutate()}>Enable</button>
      <button onClick={() => disableServo.mutate()}>Disable</button>
      <button onClick={() => resetAlarm.mutate()}>Reset Alarm</button>
    </>
  );
}
```

### useClampControl

Clamp control:

```typescript
import { useClampControl } from '@/hooks/useApi';

function ClampPanel() {
  const { lockUpper, lockLower, unlockAll } = useClampControl();

  return (
    <>
      <button onClick={() => lockUpper.mutate()}>Lock Upper</button>
      <button onClick={() => lockLower.mutate()}>Lock Lower</button>
      <button onClick={() => unlockAll.mutate()}>Unlock All</button>
    </>
  );
}
```

### useTests

Test history with pagination:

```typescript
import { useTests, useDeleteTest } from '@/hooks/useApi';

function Reports() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTests(page, 20);
  const deleteTest = useDeleteTest();

  return (
    <table>
      {data?.tests.map((test) => (
        <tr key={test.id}>
          <td>{test.sample_id}</td>
          <td>{test.ring_stiffness}</td>
          <td>
            <button onClick={() => deleteTest.mutate(test.id)}>Delete</button>
          </td>
        </tr>
      ))}
    </table>
  );
}
```

### useAlarms

Alarm management:

```typescript
import { useAlarms, useAcknowledgeAlarm } from '@/hooks/useApi';

function Alarms() {
  const { data } = useAlarms(true); // active only
  const ack = useAcknowledgeAlarm();

  return (
    <ul>
      {data?.alarms.map((alarm) => (
        <li key={alarm.id}>
          {alarm.message}
          <button onClick={() => ack.mutate({ id: alarm.id })}>Ack</button>
        </li>
      ))}
    </ul>
  );
}
```

### useConnection

PLC connection status:

```typescript
import { useConnection } from '@/hooks/useApi';

function Settings() {
  const { status, reconnect } = useConnection();

  return (
    <div>
      <p>Status: {status.data?.connected ? 'Connected' : 'Disconnected'}</p>
      <p>IP: {status.data?.ip}</p>
      <button onClick={() => reconnect.mutate()}>Reconnect</button>
    </div>
  );
}
```

---

## TypeScript Interfaces

### LiveData

```typescript
interface LiveData {
  actual_force: number;        // Current force (kN)
  actual_deflection: number;   // Current deflection (mm)
  target_deflection: number;   // Target deflection (mm)
  ring_stiffness: number;      // Calculated stiffness (kN/m2)
  force_at_target: number;     // Force at target deflection
  sn_class: number;            // SN classification
  test_status: number;         // -1 to 5
  test_passed: boolean;
  servo_ready: boolean;
  servo_error: boolean;
  at_home: boolean;
  lock_upper: boolean;
  lock_lower: boolean;
  actual_position: number;
  connected: boolean;
}
```

### TestParameters

```typescript
interface TestParameters {
  pipe_diameter: number;      // mm
  pipe_length: number;        // mm
  deflection_percent: number; // %
  test_speed: number;         // mm/min
  max_stroke: number;         // mm
  max_force: number;          // kN
  connected: boolean;
}
```

### TestRecord

```typescript
interface TestRecord {
  id: number;
  sample_id: string | null;
  operator: string | null;
  test_date: string;          // ISO 8601
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
```

### Alarm

```typescript
interface Alarm {
  id: number;
  alarm_code: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  acknowledged: boolean;
  ack_timestamp: string | null;
  ack_by: string | null;
}
```

---

## Pages

### Dashboard

Main dashboard with real-time data display:

- Force/deflection gauges
- Live force-deflection chart
- Status indicators
- Quick action buttons

### TestSetup

Test configuration page:

- Pipe diameter input
- Pipe length input
- Deflection percentage
- Test speed
- Safety limits
- Save to PLC button

### ManualControl

Manual control panel:

- Jog up/down buttons (hold to move)
- Jog speed slider
- Servo enable/disable
- Clamp lock/unlock
- Alarm reset
- Emergency stop

### Reports

Test history and export:

- Paginated test list
- Filter by sample ID, operator, pass/fail
- PDF report download
- Excel bulk export
- Delete test records

### Alarms

Alarm management:

- Active alarms list
- Alarm history
- Acknowledge individual/all
- Severity indicators

### Settings

System configuration:

- PLC connection status
- Reconnect button
- System information

---

## Environment Variables

Create `.env` file in `frontend/`:

```env
# API endpoint
VITE_API_URL=http://localhost:8000

# Optional: WebSocket path
VITE_WS_PATH=/socket.io
```

---

## Building for Production

```bash
# Build
npm run build

# Preview production build
npm run preview

# Output directory: dist/
```

---

## UI Components (shadcn/ui)

The project uses shadcn/ui components. Add new components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add table
```

---

## State Management

The application uses a hybrid approach:

1. **React Query** - Server state (API data)
   - Automatic caching
   - Background refetching
   - Optimistic updates

2. **WebSocket State** - Real-time PLC data
   - Custom `useLiveData` hook
   - Direct state updates

3. **Local State** - UI state
   - `useState` for form inputs
   - Component-level state

---

## Error Handling

Toast notifications via Sonner:

```typescript
import { toast } from 'sonner';

// Success
toast.success('Test started');

// Error
toast.error('Failed to connect');

// Warning
toast.warning('Test stopped');

// Info
toast.info('Homing in progress...');
```

---

## Routing

React Router v6 configuration in `App.tsx`:

```typescript
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/test-setup" element={<TestSetup />} />
  <Route path="/manual" element={<ManualControl />} />
  <Route path="/reports" element={<Reports />} />
  <Route path="/alarms" element={<Alarms />} />
  <Route path="/settings" element={<Settings />} />
</Routes>
```

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```
