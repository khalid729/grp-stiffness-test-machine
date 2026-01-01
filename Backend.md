# **Backend Development Specification**

GRP Pipe Ring Stiffness Test Machine

*Python \+ FastAPI \+ Snap7 \+ WebSocket*

# **1\. Project Overview**

This document describes the backend architecture for a web-based control system that interfaces with a Siemens S7-1214C PLC controlling a GRP pipe testing machine.

## **1.1 System Architecture**

| ┌─────────────────────────────────────────────────────┐ │                   WEB BROWSER                       │ │              (React / Vue Frontend)                 │ └──────────────────────┬──────────────────────────────┘                        │ HTTP \+ WebSocket                        ▼ ┌─────────────────────────────────────────────────────┐ │              PYTHON BACKEND SERVER                  │ │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │ │  │  FastAPI    │  │  WebSocket   │  │  SQLite    │ │ │  │  REST API   │  │  Real-time   │  │  Database  │ │ │  └─────────────┘  └──────────────┘  └────────────┘ │ │                       │                             │ │              ┌────────┴────────┐                    │ │              │     SNAP7       │                    │ │              │  PLC Connector  │                    │ │              └────────┬────────┘                    │ └──────────────────────┼──────────────────────────────┘                        │ TCP/IP (Port 102\)                        ▼ ┌─────────────────────────────────────────────────────┐ │              SIEMENS S7-1214C PLC                   │ │              IP: 192.168.0.100                      │ └─────────────────────────────────────────────────────┘ |
| :---- |

## **1.2 Technology Stack**

| Component | Technology | Version |
| ----- | ----- | ----- |
| Web Framework | FastAPI | 0.100+ |
| WebSocket | python-socketio | 5.x |
| PLC Communication | python-snap7 | 1.3+ |
| Database | SQLite \+ SQLAlchemy | 2.x |
| PDF Generation | ReportLab or WeasyPrint | Latest |
| Excel Export | openpyxl | 3.x |
| ASGI Server | Uvicorn | 0.20+ |

# **2\. PLC Communication (Snap7)**

## **2.1 Connection Parameters**

| Parameter | Value |
| ----- | ----- |
| PLC IP Address | 192.168.0.100 |
| Rack | 0 |
| Slot | 1 |
| Port | 102 (S7 Protocol) |

## **2.2 PLC Access Settings (IMPORTANT\!)**

In TIA Portal, you must configure the PLC to allow Snap7 access:

1. Open PLC Properties → Protection & Security  
2. Set Connection Mechanism: "Allow access with PUT/GET"  
3. Set Access Level: "Full access (no protection)"  
4. Download to PLC

## **2.3 Data Block Memory Map**

### **DB1 \- Test Parameters (Read/Write)**

| Offset | Variable | Type | Size | Access |
| ----- | ----- | ----- | ----- | ----- |
| 0 | Pipe\_Diameter | Real | 4 bytes | R/W |
| 4 | Pipe\_Length | Real | 4 bytes | R/W |
| 8 | Deflection\_Percent | Real | 4 bytes | R/W |
| 12 | Test\_Speed | Real | 4 bytes | R |
| 16 | Max\_Stroke | Real | 4 bytes | R/W |
| 20 | Max\_Force | Real | 4 bytes | R/W |

### **DB2 \- Test Results (Read Only)**

| Offset | Variable | Type | Size | Access |
| ----- | ----- | ----- | ----- | ----- |
| 0 | Actual\_Force | Real | 4 bytes | R |
| 4 | Actual\_Deflection | Real | 4 bytes | R |
| 8 | Target\_Deflection | Real | 4 bytes | R |
| 12 | Ring\_Stiffness | Real | 4 bytes | R |
| 16 | Force\_At\_Target | Real | 4 bytes | R |
| 20 | SN\_Class | Int | 2 bytes | R |
| 22 | Test\_Status | Int | 2 bytes | R |
| 24 | Test\_Passed | Bool | 1 byte | R |

### **DB3 \- Servo Control (Read/Write)**

| Offset | Variable | Type | Size | Access |
| ----- | ----- | ----- | ----- | ----- |
| 0.0 | Enable | Bool | Bit | R/W |
| 0.1 | Jog\_Forward | Bool | Bit | R/W |
| 0.2 | Jog\_Backward | Bool | Bit | R/W |
| 0.3 | Start\_Test | Bool | Bit | R/W |
| 0.4 | Stop | Bool | Bit | R/W |
| 0.5 | Home | Bool | Bit | R/W |
| 0.6 | Alarm\_Reset\_Cmd | Bool | Bit | R/W |
| 1.0 | Servo\_Ready | Bool | Bit | R |
| 1.1 | Servo\_Error | Bool | Bit | R |
| 1.2 | At\_Home | Bool | Bit | R |
| 1.3 | Lock\_Upper | Bool | Bit | R/W |
| 1.4 | Lock\_Lower | Bool | Bit | R/W |
| 2 | Jog\_Velocity | Real | 4 bytes | R/W |
| 6 | Actual\_Position | Real | 4 bytes | R |

# **3\. Snap7 Code Examples**

## **3.1 PLC Connection Class**

| \# plc\_connector.py import snap7 from snap7.util import get\_real, set\_real, get\_int, get\_bool, set\_bool import struct import threading import time class PLCConnector:     def \_\_init\_\_(self, ip='192.168.0.100', rack=0, slot=1):         self.ip \= ip         self.rack \= rack         self.slot \= slot         self.client \= snap7.client.Client()         self.connected \= False         self.lock \= threading.Lock()              def connect(self):         try:             self.client.connect(self.ip, self.rack, self.slot)             self.connected \= self.client.get\_connected()             return self.connected         except Exception as e:             print(f'Connection error: {e}')             self.connected \= False             return False          def disconnect(self):         self.client.disconnect()         self.connected \= False          def read\_real(self, db\_number, offset):         """Read a Real (float) value from DB"""         with self.lock:             data \= self.client.db\_read(db\_number, offset, 4\)             return get\_real(data, 0\)          def write\_real(self, db\_number, offset, value):         """Write a Real (float) value to DB"""         with self.lock:             data \= bytearray(4)             set\_real(data, 0, value)             self.client.db\_write(db\_number, offset, data)          def read\_bool(self, db\_number, byte\_offset, bit\_offset):         """Read a Bool value from DB"""         with self.lock:             data \= self.client.db\_read(db\_number, byte\_offset, 1\)             return get\_bool(data, 0, bit\_offset)          def write\_bool(self, db\_number, byte\_offset, bit\_offset, value):         """Write a Bool value to DB"""         with self.lock:             \# Read current byte first             data \= self.client.db\_read(db\_number, byte\_offset, 1\)             set\_bool(data, 0, bit\_offset, value)             self.client.db\_write(db\_number, byte\_offset, data)          def read\_int(self, db\_number, offset):         """Read an Int (16-bit) value from DB"""         with self.lock:             data \= self.client.db\_read(db\_number, offset, 2\)             return get\_int(data, 0\) |
| :---- |

## **3.2 Data Reading Functions**

| \# data\_service.py from plc\_connector import PLCConnector class DataService:     def \_\_init\_\_(self, plc: PLCConnector):         self.plc \= plc          def get\_live\_data(self):         """Read all real-time values for dashboard"""         return {             \# DB2 \- Results             'actual\_force': self.plc.read\_real(2, 0),             'actual\_deflection': self.plc.read\_real(2, 4),             'target\_deflection': self.plc.read\_real(2, 8),             'ring\_stiffness': self.plc.read\_real(2, 12),             'sn\_class': self.plc.read\_int(2, 20),             'test\_status': self.plc.read\_int(2, 22),             'test\_passed': self.plc.read\_bool(2, 24, 0),                          \# DB3 \- Servo Status             'servo\_ready': self.plc.read\_bool(3, 1, 0),             'servo\_error': self.plc.read\_bool(3, 1, 1),             'at\_home': self.plc.read\_bool(3, 1, 2),             'lock\_upper': self.plc.read\_bool(3, 1, 3),             'lock\_lower': self.plc.read\_bool(3, 1, 4),             'actual\_position': self.plc.read\_real(3, 6\)         }          def get\_parameters(self):         """Read test parameters from DB1"""         return {             'pipe\_diameter': self.plc.read\_real(1, 0),             'pipe\_length': self.plc.read\_real(1, 4),             'deflection\_percent': self.plc.read\_real(1, 8),             'test\_speed': self.plc.read\_real(1, 12\)         }          def set\_parameters(self, diameter, length, deflection\_pct):         """Write test parameters to DB1"""         self.plc.write\_real(1, 0, diameter)         self.plc.write\_real(1, 4, length)         self.plc.write\_real(1, 8, deflection\_pct) |
| :---- |

## **3.3 Command Functions**

| \# command\_service.py class CommandService:     def \_\_init\_\_(self, plc: PLCConnector):         self.plc \= plc          def jog\_forward(self, state: bool):         """Jog forward (down) \- DB3.DBX0.1"""         self.plc.write\_bool(3, 0, 1, state)          def jog\_backward(self, state: bool):         """Jog backward (up) \- DB3.DBX0.2"""         self.plc.write\_bool(3, 0, 2, state)          def set\_jog\_velocity(self, velocity: float):         """Set jog speed \- DB3.DBD2"""         self.plc.write\_real(3, 2, velocity)          def start\_test(self):         """Start automated test \- DB3.DBX0.3"""         self.plc.write\_bool(3, 0, 3, True)          def stop(self):         """Emergency stop \- DB3.DBX0.4"""         self.plc.write\_bool(3, 0, 4, True)         time.sleep(0.1)         self.plc.write\_bool(3, 0, 4, False)          def home(self):         """Go to home position \- DB3.DBX0.5"""         self.plc.write\_bool(3, 0, 5, True)          def enable\_servo(self, state: bool):         """Enable/disable servo \- DB3.DBX0.0"""         self.plc.write\_bool(3, 0, 0, state)          def reset\_alarm(self):         """Reset servo alarm \- DB3.DBX0.6"""         self.plc.write\_bool(3, 0, 6, True)         time.sleep(0.5)         self.plc.write\_bool(3, 0, 6, False)          def lock\_upper(self):         self.plc.write\_bool(3, 1, 3, True)          def lock\_lower(self):         self.plc.write\_bool(3, 1, 4, True)          def unlock\_all(self):         self.plc.write\_bool(3, 1, 3, False)         self.plc.write\_bool(3, 1, 4, False) |
| :---- |

# **4\. REST API Endpoints**

## **4.1 Status Endpoints**

| Method | Endpoint | Description |
| ----- | ----- | ----- |
| GET | /api/status | Get all live data (force, position, status) |
| GET | /api/status/connection | Check PLC connection status |
| GET | /api/parameters | Get current test parameters |
| POST | /api/parameters | Set test parameters |

## **4.2 Command Endpoints**

| Method | Endpoint | Description |
| ----- | ----- | ----- |
| POST | /api/command/start | Start automated test |
| POST | /api/command/stop | Emergency stop |
| POST | /api/command/home | Move to home position |
| POST | /api/servo/enable | Enable servo motor |
| POST | /api/servo/disable | Disable servo motor |
| POST | /api/servo/reset | Reset servo alarm |
| POST | /api/jog/speed | Set jog velocity (body: {velocity: float}) |
| POST | /api/clamp/upper/lock | Lock upper clamp |
| POST | /api/clamp/lower/lock | Lock lower clamp |
| POST | /api/clamp/unlock | Unlock all clamps |

## **4.3 Report Endpoints**

| Method | Endpoint | Description |
| ----- | ----- | ----- |
| GET | /api/tests | Get test history (with pagination) |
| GET | /api/tests/{id} | Get single test details |
| GET | /api/report/pdf/{id} | Download PDF report |
| GET | /api/report/excel | Export tests to Excel |

# **5\. WebSocket Events**

WebSocket is used for real-time data updates and jog control.

## **5.1 Server → Client Events**

| Event | Data |
| ----- | ----- |
| live\_data | {force, deflection, position, status, servo\_ready, ...} \- sent every 100ms |
| test\_complete | {test\_id, ring\_stiffness, sn\_class, passed} \- when test finishes |
| alarm | {code, message, timestamp} \- when alarm occurs |
| connection\_status | {connected: bool} \- PLC connection change |

## **5.2 Client → Server Events**

| Event | Data |
| ----- | ----- |
| jog\_forward | {state: bool} \- true on mousedown, false on mouseup |
| jog\_backward | {state: bool} \- true on mousedown, false on mouseup |
| subscribe | {} \- start receiving live\_data events |
| unsubscribe | {} \- stop receiving live\_data events |

## **5.3 WebSocket Server Code**

| \# websocket\_server.py import socketio import asyncio sio \= socketio.AsyncServer(async\_mode='asgi', cors\_allowed\_origins='\*') @sio.event async def connect(sid, environ):     print(f'Client connected: {sid}') @sio.event async def disconnect(sid):     print(f'Client disconnected: {sid}')     \# SAFETY: Stop jog on disconnect\!     command\_service.jog\_forward(False)     command\_service.jog\_backward(False) @sio.event async def jog\_forward(sid, data):     command\_service.jog\_forward(data.get('state', False)) @sio.event async def jog\_backward(sid, data):     command\_service.jog\_backward(data.get('state', False)) @sio.event async def subscribe(sid, data):     await sio.enter\_room(sid, 'live\_data') async def broadcast\_live\_data():     """Background task to send live data every 100ms"""     while True:         data \= data\_service.get\_live\_data()         await sio.emit('live\_data', data, room='live\_data')         await asyncio.sleep(0.1) |
| :---- |

# **6\. Database Schema**

## **6.1 Tests Table**

| Column | Type | Description |
| ----- | ----- | ----- |
| id | INTEGER PK | Auto-increment ID |
| sample\_id | VARCHAR(50) | Sample identifier |
| operator | VARCHAR(100) | Operator name |
| test\_date | DATETIME | Test timestamp |
| pipe\_diameter | REAL | Pipe diameter (mm) |
| pipe\_length | REAL | Sample length (mm) |
| deflection\_percent | REAL | Target deflection % |
| force\_at\_target | REAL | Force at 3% (kN) |
| ring\_stiffness | REAL | Calculated stiffness (kN/m²) |
| sn\_class | INTEGER | SN classification |
| passed | BOOLEAN | Test result |

## **6.2 Test Data Points Table**

| Column | Type | Description |
| ----- | ----- | ----- |
| id | INTEGER PK | Auto-increment ID |
| test\_id | INTEGER FK | Reference to tests.id |
| timestamp | REAL | Time offset (seconds) |
| force | REAL | Force value (kN) |
| deflection | REAL | Deflection value (mm) |

## **6.3 Alarms Table**

| Column | Type | Description |
| ----- | ----- | ----- |
| id | INTEGER PK | Auto-increment ID |
| alarm\_code | INTEGER | Alarm code |
| message | VARCHAR(255) | Alarm description |
| timestamp | DATETIME | When alarm occurred |
| acknowledged | BOOLEAN | Has been acknowledged |
| ack\_timestamp | DATETIME | When acknowledged |

# **7\. Main Application Structure**

## **7.1 Project Structure**

| grp\_test\_backend/ ├── main.py                 \# FastAPI app entry point ├── config.py               \# Configuration settings ├── requirements.txt        \# Python dependencies │ ├── plc/ │   ├── \_\_init\_\_.py │   ├── connector.py        \# Snap7 connection class │   ├── data\_service.py     \# Read functions │   └── command\_service.py  \# Write functions │ ├── api/ │   ├── \_\_init\_\_.py │   ├── routes/ │   │   ├── status.py       \# Status endpoints │   │   ├── commands.py     \# Command endpoints │   │   └── reports.py      \# Report endpoints │   └── websocket.py        \# WebSocket handlers │ ├── db/ │   ├── \_\_init\_\_.py │   ├── models.py           \# SQLAlchemy models │   └── database.py         \# Database connection │ ├── services/ │   ├── \_\_init\_\_.py │   ├── test\_service.py     \# Test logic │   ├── pdf\_generator.py    \# PDF report generation │   └── excel\_export.py     \# Excel export │ └── static/                  \# Frontend build files |
| :---- |

## **7.2 Main.py Example**

| \# main.py from fastapi import FastAPI from fastapi.middleware.cors import CORSMiddleware from fastapi.staticfiles import StaticFiles import socketio import asyncio from plc.connector import PLCConnector from plc.data\_service import DataService from plc.command\_service import CommandService from api.routes import status, commands, reports from api.websocket import sio, broadcast\_live\_data \# Initialize app \= FastAPI(title='GRP Test API') plc \= PLCConnector('192.168.0.100') data\_service \= DataService(plc) command\_service \= CommandService(plc) \# CORS app.add\_middleware(     CORSMiddleware,     allow\_origins=\['\*'\],     allow\_methods=\['\*'\],     allow\_headers=\['\*'\] ) \# Routes app.include\_router(status.router, prefix='/api') app.include\_router(commands.router, prefix='/api') app.include\_router(reports.router, prefix='/api') \# Socket.IO socket\_app \= socketio.ASGIApp(sio, app) @app.on\_event('startup') async def startup():     plc.connect()     asyncio.create\_task(broadcast\_live\_data()) @app.on\_event('shutdown') async def shutdown():     plc.disconnect() \# Serve frontend app.mount('/', StaticFiles(directory='static', html=True)) |
| :---- |

# **8\. Dependencies (requirements.txt)**

| \# Web Framework fastapi==0.109.0 uvicorn\[standard\]==0.27.0 \# WebSocket python-socketio==5.10.0 \# PLC Communication python-snap7==1.3 \# Database sqlalchemy==2.0.25 aiosqlite==0.19.0 \# Reports reportlab==4.0.8 openpyxl==3.1.2 \# Utilities python-dotenv==1.0.0 pydantic==2.5.3 |
| :---- |

# **9\. Running the Application**

## **9.1 Development**

| \# Install dependencies pip install \-r requirements.txt \# Run development server uvicorn main:socket\_app \--host 0.0.0.0 \--port 8000 \--reload |
| :---- |

## **9.2 Production**

| \# Run with Gunicorn \+ Uvicorn workers gunicorn main:socket\_app \-w 1 \-k uvicorn.workers.UvicornWorker \\     \--bind 0.0.0.0:8000 |
| :---- |

| ⚠️ IMPORTANT: Use only 1 worker (-w 1\) because Snap7 connection cannot be shared between processes. For high availability, use a separate PLC gateway service. |
| :---- |

Document Version: 1.0  
Created: January 2026  
For: Backend Developer