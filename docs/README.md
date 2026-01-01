# GRP Ring Stiffness Test Machine

## Documentation Index

A complete web-based control system for GRP (Glass Reinforced Plastic) pipe ring stiffness testing according to **ISO 9969** standard.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System design, components, and data flow |
| [API Reference](./API.md) | Complete REST API & WebSocket documentation |
| [PLC Integration](./PLC.md) | Siemens S7-1214C connection and data blocks |
| [Frontend Guide](./FRONTEND.md) | React components, hooks, and state management |
| [Deployment](./DEPLOYMENT.md) | Installation, configuration, and production setup |
| [Development](./DEVELOPMENT.md) | Developer guide, code style, and contributing |

---

## Project Overview

### What is Ring Stiffness Testing?

Ring stiffness testing measures the mechanical properties of GRP pipes by applying a controlled load and measuring deflection. The test determines the **SN (Stiffness Nominal)** class of the pipe according to ISO 9969.

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        WEB BROWSER                          │
│                    React + TypeScript                       │
│              Real-time Dashboard & Controls                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PYTHON BACKEND                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   FastAPI    │  │  Socket.IO   │  │   SQLite     │      │
│  │   REST API   │  │  Real-time   │  │   Database   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           │                                 │
│                    ┌──────┴──────┐                         │
│                    │    SNAP7    │                         │
│                    │ PLC Driver  │                         │
│                    └──────┬──────┘                         │
└───────────────────────────┼─────────────────────────────────┘
                            │ S7 Protocol (TCP 102)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  SIEMENS S7-1214C PLC                       │
│                    192.168.0.100                            │
│         Servo Motor + Load Cell + Position Sensor          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React + TypeScript | 18.x |
| **UI Components** | shadcn/ui + Tailwind CSS | Latest |
| **State Management** | React Query + Zustand | 5.x |
| **Backend** | Python + FastAPI | 3.10+ / 0.109+ |
| **Real-time** | Socket.IO | 5.x |
| **PLC Communication** | python-snap7 | 1.3+ |
| **Database** | SQLite + SQLAlchemy | 2.x |
| **Reports** | ReportLab (PDF) + openpyxl (Excel) | Latest |

---

## Directory Structure

```
stiffness_machine_test/
├── docs/                    # Documentation (you are here)
│   ├── README.md           # This file
│   ├── ARCHITECTURE.md     # System architecture
│   ├── API.md              # API reference
│   ├── PLC.md              # PLC integration guide
│   ├── FRONTEND.md         # Frontend documentation
│   ├── DEPLOYMENT.md       # Deployment guide
│   └── DEVELOPMENT.md      # Developer guide
│
├── backend/                 # Python Backend
│   ├── main.py             # Application entry point
│   ├── config.py           # Configuration settings
│   ├── requirements.txt    # Python dependencies
│   ├── plc/                # PLC communication layer
│   ├── api/                # REST API routes
│   ├── db/                 # Database models
│   └── services/           # Business logic
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── api/           # API client & WebSocket
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
└── Backend.md              # Original specification
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Siemens S7-1214C PLC (or simulation)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure PLC IP (edit .env file)
echo "PLC_IP=192.168.0.100" > .env

# Run server
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL (edit .env file)
echo "VITE_API_URL=http://localhost:8000" > .env

# Run development server
npm run dev
```

### 3. Access Application

Open browser: `http://localhost:5173`

---

## Features

### Dashboard
- Real-time force, deflection, and position display
- Live force-deflection chart
- Machine status indicators
- Quick action buttons (Home, Start, Stop)

### Test Setup
- Configure pipe diameter and length
- Set deflection percentage and speed
- Automatic calculations
- Save parameters to PLC

### Manual Control
- Jog up/down with variable speed
- Clamp lock/unlock controls
- Servo enable/disable
- Alarm reset

### Reports
- Test history with pagination
- PDF report generation
- Excel export
- Pass/Fail statistics

### Alarms
- Active alarm display
- Acknowledge functionality
- Alarm history log

### Settings
- PLC connection status
- Reconnection controls
- Safety limits configuration

---

## Standards Compliance

This system is designed for testing according to:

- **ISO 9969**: Thermoplastics pipes — Determination of ring stiffness
- **SN Classes**: 2500, 5000, 10000 (kN/m²)

---

## License

Proprietary - Al Muhaideb Industrial

---

## Support

For technical support: support@almuhaideb.com
