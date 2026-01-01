# PLC Integration Guide

Complete documentation for Siemens S7-1214C PLC communication using Snap7.

---

## Overview

The system uses **Snap7** library to communicate with a Siemens S7-1200 series PLC via TCP/IP (port 102).

### Connection Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| IP Address | 192.168.0.100 | PLC IP address |
| Rack | 0 | PLC rack number |
| Slot | 1 | PLC slot number |
| Port | 102 | S7 communication port |

---

## Data Block Memory Map

The PLC uses three Data Blocks for communication:

### DB1 - Test Parameters (Read/Write)

| Offset | Type | Name | Unit | Description |
|--------|------|------|------|-------------|
| 0 | Real | pipe_diameter | mm | Pipe outer diameter |
| 4 | Real | pipe_length | mm | Pipe length (typically 300mm) |
| 8 | Real | deflection_percent | % | Target deflection percentage (3% per ISO 9969) |
| 12 | Real | test_speed | mm/min | Actuator movement speed |
| 16 | Real | max_stroke | mm | Maximum stroke limit |
| 20 | Real | max_force | kN | Maximum force limit |

**Memory Layout:**
```
DB1
├── DBD0   : pipe_diameter (Real, 4 bytes)
├── DBD4   : pipe_length (Real, 4 bytes)
├── DBD8   : deflection_percent (Real, 4 bytes)
├── DBD12  : test_speed (Real, 4 bytes)
├── DBD16  : max_stroke (Real, 4 bytes)
└── DBD20  : max_force (Real, 4 bytes)
```

---

### DB2 - Test Results (Read Only)

| Offset | Type | Name | Unit | Description |
|--------|------|------|------|-------------|
| 0 | Real | actual_force | kN | Current force reading |
| 4 | Real | actual_deflection | mm | Current deflection |
| 8 | Real | target_deflection | mm | Calculated target deflection |
| 12 | Real | ring_stiffness | kN/m² | Calculated ring stiffness |
| 16 | Real | force_at_target | kN | Force at target deflection |
| 20 | Int | sn_class | - | SN classification (2500/5000/10000) |
| 22 | Int | test_status | - | Current test status code |
| 24 | Bool | test_passed | - | Pass/fail result |

**Test Status Codes:**
| Code | Status | Description |
|------|--------|-------------|
| 0 | Idle | Ready for test |
| 1 | Starting | Test initialization |
| 2 | Testing | Compression in progress |
| 3 | At Target | Target deflection reached |
| 4 | Returning | Returning to home position |
| 5 | Complete | Test finished |

**Memory Layout:**
```
DB2
├── DBD0   : actual_force (Real, 4 bytes)
├── DBD4   : actual_deflection (Real, 4 bytes)
├── DBD8   : target_deflection (Real, 4 bytes)
├── DBD12  : ring_stiffness (Real, 4 bytes)
├── DBD16  : force_at_target (Real, 4 bytes)
├── DBW20  : sn_class (Int, 2 bytes)
├── DBW22  : test_status (Int, 2 bytes)
└── DBX24.0: test_passed (Bool, 1 bit)
```

---

### DB3 - Servo Control (Read/Write)

#### Control Bits (Byte 0)

| Bit | Address | Name | Type | Description |
|-----|---------|------|------|-------------|
| 0 | DBX0.0 | enable | Latch | Servo motor enable |
| 1 | DBX0.1 | jog_forward | Hold | Jog down (hold while moving) |
| 2 | DBX0.2 | jog_backward | Hold | Jog up (hold while moving) |
| 3 | DBX0.3 | start_test | Latch | Start automated test |
| 4 | DBX0.4 | stop | Pulse | Emergency stop (pulse) |
| 5 | DBX0.5 | home | Latch | Go to home position |
| 6 | DBX0.6 | alarm_reset | Pulse | Reset servo alarm (pulse) |

#### Status Bits (Byte 1)

| Bit | Address | Name | Description |
|-----|---------|------|-------------|
| 0 | DBX1.0 | servo_ready | Servo motor ready |
| 1 | DBX1.1 | servo_error | Servo fault active |
| 2 | DBX1.2 | at_home | At home position |
| 3 | DBX1.3 | lock_upper | Upper clamp locked |
| 4 | DBX1.4 | lock_lower | Lower clamp locked |

#### Analog Values

| Offset | Type | Name | Unit | Description |
|--------|------|------|------|-------------|
| 2 | Real | jog_velocity | mm/min | Jog speed setpoint (1-100) |
| 6 | Real | actual_position | mm | Current actuator position |

**Memory Layout:**
```
DB3
├── DBX0.0 : enable (Bool)
├── DBX0.1 : jog_forward (Bool)
├── DBX0.2 : jog_backward (Bool)
├── DBX0.3 : start_test (Bool)
├── DBX0.4 : stop (Bool)
├── DBX0.5 : home (Bool)
├── DBX0.6 : alarm_reset (Bool)
├── DBX1.0 : servo_ready (Bool)
├── DBX1.1 : servo_error (Bool)
├── DBX1.2 : at_home (Bool)
├── DBX1.3 : lock_upper (Bool)
├── DBX1.4 : lock_lower (Bool)
├── DBD2   : jog_velocity (Real, 4 bytes)
└── DBD6   : actual_position (Real, 4 bytes)
```

---

## Python Implementation

### PLCConnector Class

Located in `backend/plc/connector.py`:

```python
from snap7.client import Client
from snap7.util import get_real, set_real, get_bool, set_bool

class PLCConnector:
    def __init__(self, ip: str, rack: int = 0, slot: int = 1):
        self.client = Client()
        self.ip = ip
        self.rack = rack
        self.slot = slot

    def connect(self) -> bool:
        """Connect to PLC"""
        self.client.connect(self.ip, self.rack, self.slot)
        return self.client.get_connected()

    def read_real(self, db: int, offset: int) -> float:
        """Read Real (float) value from DB"""
        data = self.client.db_read(db, offset, 4)
        return get_real(data, 0)

    def write_real(self, db: int, offset: int, value: float) -> bool:
        """Write Real value to DB"""
        data = bytearray(4)
        set_real(data, 0, value)
        self.client.db_write(db, offset, data)
        return True

    def read_bool(self, db: int, byte: int, bit: int) -> bool:
        """Read Bool value from DB"""
        data = self.client.db_read(db, byte, 1)
        return get_bool(data, 0, bit)

    def write_bool(self, db: int, byte: int, bit: int, value: bool) -> bool:
        """Write Bool value to DB"""
        data = self.client.db_read(db, byte, 1)
        set_bool(data, 0, bit, value)
        self.client.db_write(db, byte, data)
        return True
```

### DataService Class

Located in `backend/plc/data_service.py`:

```python
class DataService:
    """Read data from PLC"""

    def get_live_data(self) -> dict:
        """Read all real-time values - called every 100ms"""
        return {
            "actual_force": self.plc.read_real(2, 0),
            "actual_deflection": self.plc.read_real(2, 4),
            "servo_ready": self.plc.read_bool(3, 1, 0),
            "connected": True,
            # ... more fields
        }

    def get_parameters(self) -> dict:
        """Read test parameters from DB1"""
        return {
            "pipe_diameter": self.plc.read_real(1, 0),
            "pipe_length": self.plc.read_real(1, 4),
            # ... more fields
        }
```

### CommandService Class

Located in `backend/plc/command_service.py`:

```python
class CommandService:
    """Send commands to PLC"""

    def start_test(self) -> bool:
        """Start automated test - DB3.DBX0.3"""
        return self.plc.write_bool(3, 0, 3, True)

    def stop(self) -> bool:
        """Emergency stop - DB3.DBX0.4 (pulse)"""
        self.plc.write_bool(3, 0, 4, True)
        time.sleep(0.1)
        return self.plc.write_bool(3, 0, 4, False)

    def jog_forward(self, state: bool) -> bool:
        """Jog forward - DB3.DBX0.1"""
        return self.plc.write_bool(3, 0, 1, state)
```

---

## TIA Portal Configuration

### Enabling PUT/GET Communication

In TIA Portal, configure the PLC to allow Snap7 access:

1. Open PLC properties
2. Go to **Protection & Security** > **Connection mechanisms**
3. Enable **Permit access with PUT/GET communication from remote partner**

### Optimized Block Access

Disable optimized block access for Data Blocks:

1. Right-click on the Data Block
2. Select **Properties**
3. Under **Attributes**, uncheck **Optimized block access**
4. Recompile and download

---

## Network Configuration

### IP Address Setup

```
┌────────────────────────────────────────┐
│              NETWORK                    │
│                                         │
│  Backend Server: 192.168.0.10          │
│         │                               │
│         │ TCP Port 102                  │
│         ▼                               │
│  PLC: 192.168.0.100                    │
│                                         │
└────────────────────────────────────────┘
```

### Firewall Rules

Ensure port 102 is open between the server and PLC:

```bash
# Linux (iptables)
sudo iptables -A OUTPUT -p tcp --dport 102 -j ACCEPT
sudo iptables -A INPUT -p tcp --sport 102 -j ACCEPT
```

---

## Safety Considerations

### Software Interlocks

The backend implements these safety measures:

1. **Jog Auto-Stop**: When WebSocket disconnects, all jog movements stop
2. **Velocity Limits**: Jog velocity clamped to 1-100 mm/min
3. **Shutdown Safety**: All movements stopped on server shutdown

### PLC Interlocks (Recommended)

The PLC should implement:

1. **Position Limits**: Prevent movement beyond stroke limits
2. **Force Limits**: Stop if force exceeds max_force
3. **Watchdog**: Monitor communication with backend
4. **E-Stop Chain**: Hardware emergency stop circuit

---

## Troubleshooting

### Connection Issues

| Problem | Solution |
|---------|----------|
| Connection refused | Check PLC IP, ensure port 102 open |
| Timeout | Verify network connectivity, ping PLC |
| Read error | Check DB exists, verify offsets |
| Write error | Ensure PUT/GET enabled, check block access |

### Debug Logging

Enable verbose logging in `backend/config.py`:

```python
LOGGING_LEVEL = "DEBUG"
```

Check logs for Snap7 communication:

```bash
tail -f backend/grp_test.log | grep -i plc
```

### Common Error Codes

| Snap7 Error | Meaning | Solution |
|-------------|---------|----------|
| 0x00100000 | TCP Connection error | Check network |
| 0x00200000 | Read/Write error | Verify DB offsets |
| 0x00300000 | Address error | Check DB number |

---

## Ring Stiffness Calculation

The PLC calculates ring stiffness according to ISO 9969:

```
Ring Stiffness (S) = F / (L × y)

Where:
  F = Force at 3% deflection (kN)
  L = Pipe length (m)
  y = Deflection (m)
```

### SN Classification

| SN Class | Min Stiffness (kN/m²) |
|----------|----------------------|
| SN 2500 | 2500 |
| SN 5000 | 5000 |
| SN 10000 | 10000 |

Pass criteria: Ring stiffness >= 90% of SN class value

---

## Data Types Reference

### Siemens to Python Type Mapping

| S7 Type | Size | Python Type | Snap7 Function |
|---------|------|-------------|----------------|
| Bool | 1 bit | bool | get_bool/set_bool |
| Int | 2 bytes | int | get_int |
| Real | 4 bytes | float | get_real/set_real |
| DInt | 4 bytes | int | get_dint |
| String | variable | str | get_string |

### Byte Order

Siemens PLCs use **Big Endian** byte order. Snap7 handles conversion automatically.
