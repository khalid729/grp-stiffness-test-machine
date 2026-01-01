# System Architecture

## Overview

The GRP Ring Stiffness Test Machine uses a three-tier architecture:

1. **Frontend Layer** - React web application
2. **Backend Layer** - Python FastAPI server
3. **Hardware Layer** - Siemens PLC + actuators/sensors

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         React Application                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │Dashboard │  │TestSetup │  │ Manual   │  │ Reports  │          │ │
│  │  │          │  │          │  │ Control  │  │          │          │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │ │
│  │       │              │              │              │               │ │
│  │       └──────────────┴──────────────┴──────────────┘               │ │
│  │                              │                                      │ │
│  │  ┌───────────────────────────┴───────────────────────────┐        │ │
│  │  │                    Custom Hooks                        │        │ │
│  │  │  useLiveData() │ useApi() │ useCommands() │ useJog()  │        │ │
│  │  └───────────────────────────┬───────────────────────────┘        │ │
│  │                              │                                      │ │
│  │  ┌───────────────────────────┴───────────────────────────┐        │ │
│  │  │              API Client + Socket.IO Client             │        │ │
│  │  └───────────────────────────┬───────────────────────────┘        │ │
│  └──────────────────────────────┼────────────────────────────────────┘ │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                    HTTP REST     │     WebSocket
                    ─────────────►│◄─────────────
                                  │
┌─────────────────────────────────┼───────────────────────────────────────┐
│                              BACKEND                                     │
│  ┌──────────────────────────────┴──────────────────────────────────────┐│
│  │                         FastAPI Application                          ││
│  │  ┌─────────────────────────────────────────────────────────────────┐││
│  │  │                         API Routes                               │││
│  │  │  /api/status │ /api/commands │ /api/tests │ /api/report        │││
│  │  └─────────────────────────────────────────────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────────────────┐││
│  │  │                       Socket.IO Server                           │││
│  │  │  live_data (100ms) │ jog_forward │ jog_backward │ alarms        │││
│  │  └─────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                    │                                     │
│  ┌─────────────────┐  ┌───────────┴───────────┐  ┌──────────────────┐  │
│  │    Services     │  │     PLC Layer         │  │    Database      │  │
│  │  ┌───────────┐  │  │  ┌─────────────────┐  │  │  ┌────────────┐  │  │
│  │  │ PDFGen    │  │  │  │  PLCConnector   │  │  │  │  SQLite    │  │  │
│  │  │ ExcelExp  │  │  │  │  DataService    │  │  │  │  ────────  │  │  │
│  │  │ TestSvc   │  │  │  │  CommandService │  │  │  │  tests     │  │  │
│  │  └───────────┘  │  │  └────────┬────────┘  │  │  │  datapoints│  │  │
│  └─────────────────┘  └───────────┼───────────┘  │  │  alarms    │  │  │
│                                   │              │  └────────────┘  │  │
└───────────────────────────────────┼──────────────┴──────────────────────┘
                                    │
                         SNAP7 (TCP Port 102)
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                              HARDWARE                                    │
│  ┌────────────────────────────────┴────────────────────────────────────┐│
│  │                      SIEMENS S7-1214C PLC                           ││
│  │                        192.168.0.100                                ││
│  │  ┌─────────────────────────────────────────────────────────────┐   ││
│  │  │                      Data Blocks                             │   ││
│  │  │  DB1: Parameters │ DB2: Results │ DB3: Servo Control        │   ││
│  │  └─────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                    │                                     │
│  ┌──────────────┐  ┌──────────────┴──────────────┐  ┌────────────────┐ │
│  │  Load Cell   │  │       Servo Motor           │  │ Position Sensor│ │
│  │  (Force kN)  │  │   (Linear Actuator)         │  │   (Encoder)    │ │
│  └──────────────┘  └─────────────────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Real-time Data Flow (WebSocket)

```
PLC ──► DataService ──► WebSocket Server ──► Browser
        (100ms poll)     (broadcast)         (update UI)

Timeline:
[0ms]    DataService.get_live_data() reads from PLC
[50ms]   Data processing
[100ms]  Socket.IO emits 'live_data' to all subscribers
[105ms]  React updates state via useLiveData() hook
[110ms]  UI re-renders with new values
```

### 2. Command Flow (REST API)

```
User Click ──► React Hook ──► API Client ──► FastAPI ──► CommandService ──► PLC
                                                │
                                         Response ◄────────────────────────┘

Example: Start Test
1. User clicks "Start" button
2. useCommands().startTest.mutate() called
3. POST /api/command/start sent
4. CommandService.start_test() writes to DB3.DBX0.3
5. PLC begins test sequence
6. Response returned to frontend
```

### 3. Jog Control Flow (WebSocket - Low Latency)

```
MouseDown ──► Socket.IO emit ──► Server ──► CommandService ──► PLC
                                              (immediate)

MouseUp ──► Socket.IO emit ──► Server ──► CommandService ──► PLC
                                           (stop jog)

Note: Jog uses WebSocket for lower latency than REST
Safety: On disconnect, server automatically stops all jog
```

---

## Backend Components

### Directory Structure

```
backend/
├── main.py                 # Application entry point
├── config.py               # Settings from environment
├── requirements.txt        # Dependencies
│
├── plc/                    # PLC Communication Layer
│   ├── __init__.py
│   ├── connector.py        # Snap7 connection management
│   ├── data_service.py     # Read operations (DB1, DB2, DB3)
│   └── command_service.py  # Write operations (commands)
│
├── api/                    # API Layer
│   ├── __init__.py
│   ├── websocket.py        # Socket.IO handlers
│   └── routes/
│       ├── status.py       # GET /api/status, /api/parameters
│       ├── commands.py     # POST /api/command/*, /api/servo/*
│       ├── reports.py      # GET /api/tests, /api/report/*
│       └── demo.py         # Demo data generation
│
├── db/                     # Database Layer
│   ├── __init__.py
│   ├── database.py         # SQLAlchemy setup
│   └── models.py           # Test, TestDataPoint, Alarm
│
└── services/               # Business Logic Layer
    ├── __init__.py
    ├── test_service.py     # Test execution & recording
    ├── pdf_generator.py    # PDF report generation
    └── excel_export.py     # Excel export
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `PLCConnector` | Manage Snap7 connection, read/write primitives |
| `DataService` | Read live data and parameters from PLC |
| `CommandService` | Send commands to PLC (jog, start, stop, etc.) |
| `TestService` | Orchestrate test execution, record data |
| `PDFGenerator` | Generate ISO-compliant test reports |
| `ExcelExporter` | Export test data to spreadsheets |

---

## Frontend Components

### Directory Structure

```
frontend/src/
├── api/
│   ├── client.ts           # REST API client (fetch wrapper)
│   └── socket.ts           # Socket.IO client wrapper
│
├── hooks/
│   ├── useLiveData.ts      # Live data from WebSocket
│   └── useApi.ts           # React Query mutations/queries
│
├── types/
│   └── api.ts              # TypeScript interfaces
│
├── pages/
│   ├── Dashboard.tsx       # Main dashboard
│   ├── TestSetup.tsx       # Test configuration
│   ├── ManualControl.tsx   # Manual jog/clamp/servo
│   ├── Reports.tsx         # Test history & export
│   ├── Alarms.tsx          # Alarm management
│   └── Settings.tsx        # System settings
│
└── components/
    ├── ui/                 # shadcn/ui components
    ├── layout/             # Header, Sidebar, MainLayout
    └── dashboard/          # StatusCard, Chart, Indicators
```

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  React Query Cache                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │  parameters  │  │    tests     │  │   alarms     │  │ │
│  │  │  (5s stale)  │  │  (on-demand) │  │  (5s stale)  │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               WebSocket State (useLiveData)             │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ liveData: { force, deflection, position, ... }  │   │ │
│  │  │ isConnected: boolean                            │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Local Component State                 │ │
│  │  Form inputs, UI toggles, chart data accumulation      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Network Security

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION NETWORK                        │
│                                                              │
│  ┌─────────────┐         ┌─────────────┐                   │
│  │   Browser   │◄───────►│   Backend   │                   │
│  │  (HTTPS)    │  :443   │  (Gunicorn) │                   │
│  └─────────────┘         └──────┬──────┘                   │
│                                 │                           │
│         ════════════════════════╪════════════════           │
│              FIREWALL (only port 102 to PLC)                │
│         ════════════════════════╪════════════════           │
│                                 │                           │
│                          ┌──────┴──────┐                   │
│                          │     PLC     │                   │
│                          │ 192.168.0.x │                   │
│                          └─────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Safety Features

1. **Jog Safety**: Auto-stop on WebSocket disconnect
2. **Command Validation**: Range checking on all parameters
3. **PLC Interlocks**: Hardware safety limits in PLC program
4. **Watchdog**: PLC monitors communication heartbeat

---

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Live data update rate | 100ms | 10 Hz to browser |
| REST API latency | < 50ms | Local network |
| WebSocket jog latency | < 20ms | Critical for safety |
| Max concurrent clients | 10 | Single PLC connection |
| Database size | ~1MB/1000 tests | Including data points |

---

## Scalability Notes

### Current Limitations

- Single PLC connection (Snap7 not thread-safe)
- SQLite database (not suitable for high concurrency)
- Single backend instance required

### Future Improvements

For multi-machine deployments:
1. Use PostgreSQL instead of SQLite
2. Implement PLC connection pooling
3. Use Redis for real-time data distribution
4. Deploy separate backend per PLC
