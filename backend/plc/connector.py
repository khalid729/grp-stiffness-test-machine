import snap7
from snap7.client import Area as Areas
from snap7.util import get_real, set_real, get_int, get_bool, set_bool
import threading
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)


class PLCConnector:
    """Snap7 PLC Connection Handler for Siemens S7-1214C"""

    # CPU State Constants
    CPU_STATE_RUN = 0x08
    CPU_STATE_STOP = 0x04
    CPU_STATE_UNKNOWN = 0x00

    def __init__(
        self,
        ip: str = settings.PLC_IP,
        rack: int = settings.PLC_RACK,
        slot: int = settings.PLC_SLOT,
    ):
        self.ip = ip
        self.rack = rack
        self.slot = slot
        self.client = snap7.client.Client()
        self._connected = False
        self.lock = threading.Lock()

    @property
    def connected(self) -> bool:
        """Check if PLC is connected"""
        try:
            if not self._connected:
                return False
            # Actually test the connection
            is_connected = self.client.get_connected()
            if not is_connected:
                self._connected = False
            return is_connected
        except Exception:
            self._connected = False
            return False

    def _handle_connection_error(self, error: Exception) -> None:
        """Handle connection errors and mark as disconnected"""
        error_str = str(error)
        if "Socket error" in error_str or "TCP" in error_str or "connection" in error_str.lower():
            self._connected = False
            logger.warning(f"Connection lost: {error}")

    def connect(self) -> bool:
        """Establish connection to PLC"""
        try:
            if self.connected:
                return True
            # Always disconnect first to reset client state
            try:
                self.client.disconnect()
            except Exception:
                pass
            self.client.connect(self.ip, self.rack, self.slot)
            self._connected = self.client.get_connected()
            if self._connected:
                logger.info(f"Connected to PLC at {self.ip}")
            return self._connected
        except Exception as e:
            logger.error(f"PLC connection error: {e}")
            self._connected = False
            return False

    def disconnect(self):
        """Disconnect from PLC"""
        try:
            if self.client.get_connected():
                self.client.disconnect()
            self._connected = False
            logger.info("Disconnected from PLC")
        except Exception as e:
            logger.error(f"PLC disconnect error: {e}")

    def reconnect(self) -> bool:
        """Reconnect to PLC"""
        self.disconnect()
        return self.connect()

    def get_cpu_state(self) -> str:
        """Get PLC CPU state (RUN/STOP)

        Returns: 'run' | 'stop' | 'unknown'
        """
        if not self._connected:
            return "unknown"

        try:
            with self.lock:
                state = self.client.get_cpu_state()
                if state == self.CPU_STATE_RUN:
                    return "run"
                elif state == self.CPU_STATE_STOP:
                    return "stop"
                else:
                    return "unknown"
        except Exception as e:
            logger.error(f"Error reading CPU state: {e}")
            return "unknown"

    def read_real(self, db_number: int, offset: int) -> Optional[float]:
        """Read a Real (float) value from DB"""
        if not self.connected:
            return None
        try:
            with self.lock:
                data = self.client.db_read(db_number, offset, 4)
                return get_real(data, 0)
        except Exception as e:
            logger.error(f"Error reading Real from DB{db_number}.{offset}: {e}")
            return None

    def write_real(self, db_number: int, offset: int, value: float) -> bool:
        """Write a Real (float) value to DB"""
        if not self.connected:
            return False
        try:
            with self.lock:
                data = bytearray(4)
                set_real(data, 0, value)
                self.client.db_write(db_number, offset, data)
                return True
        except Exception as e:
            logger.error(f"Error writing Real to DB{db_number}.{offset}: {e}")
            return False

    def read_bool(self, db_number: int, byte_offset: int, bit_offset: int) -> Optional[bool]:
        """Read a Bool value from DB"""
        if not self.connected:
            return None
        try:
            with self.lock:
                data = self.client.db_read(db_number, byte_offset, 1)
                return get_bool(data, 0, bit_offset)
        except Exception as e:
            logger.error(f"Error reading Bool from DB{db_number}.DBX{byte_offset}.{bit_offset}: {e}")
            return None

    def write_bool(self, db_number: int, byte_offset: int, bit_offset: int, value: bool) -> bool:
        """Write a Bool value to DB"""
        if not self.connected:
            return False
        try:
            with self.lock:
                # Read current byte first to preserve other bits
                data = self.client.db_read(db_number, byte_offset, 1)
                set_bool(data, 0, bit_offset, value)
                self.client.db_write(db_number, byte_offset, data)
                return True
        except Exception as e:
            logger.error(f"Error writing Bool to DB{db_number}.DBX{byte_offset}.{bit_offset}: {e}")
            return False

    def read_int(self, db_number: int, offset: int) -> Optional[int]:
        """Read an Int (16-bit) value from DB"""
        if not self.connected:
            return None
        try:
            with self.lock:
                data = self.client.db_read(db_number, offset, 2)
                return get_int(data, 0)
        except Exception as e:
            logger.error(f"Error reading Int from DB{db_number}.{offset}: {e}")
            return None

    def write_int(self, db_number: int, offset: int, value: int) -> bool:
        """Write an Int (16-bit) value to DB"""
        if not self.connected:
            return False
        try:
            with self.lock:
                data = bytearray(2)
                data[0] = (value >> 8) & 0xFF
                data[1] = value & 0xFF
                self.client.db_write(db_number, offset, data)
                return True
        except Exception as e:
            logger.error(f"Error writing Int to DB{db_number}.{offset}: {e}")
            return False

    # ══════════════════════════════════════════════════════════════════════
    # DIRECT HARDWARE I/O - Read directly from physical inputs (PE Area)
    # No PLC programming needed for these signals!
    # ══════════════════════════════════════════════════════════════════════

    def read_input_bit(self, byte_offset: int, bit: int) -> Optional[bool]:
        """Read digital input directly from hardware (I0.0, I0.1, etc.)

        Args:
            byte_offset: Byte number (0 for I0.x, 1 for I1.x)
            bit: Bit number (0-7)

        Returns:
            bool value or None if error
        """
        if not self.connected:
            return None
        try:
            with self.lock:
                data = self.client.read_area(Areas.PE, 0, byte_offset, 1)
                return get_bool(data, 0, bit)
        except Exception as e:
            self._handle_connection_error(e)
            logger.error(f"Error reading input I{byte_offset}.{bit}: {e}")
            return None

    def read_input_byte(self, byte_offset: int) -> Optional[int]:
        """Read full input byte (IB0, IB1, etc.)

        Args:
            byte_offset: Byte number (0 for IB0, 1 for IB1)

        Returns:
            Byte value (0-255) or None if error
        """
        if not self.connected:
            return None
        try:
            with self.lock:
                data = self.client.read_area(Areas.PE, 0, byte_offset, 1)
                return data[0]
        except Exception as e:
            self._handle_connection_error(e)
            logger.error(f"Error reading input byte IB{byte_offset}: {e}")
            return None

    def read_analog_input(self, address: int) -> Optional[int]:
        """Read analog input word (IW64, IW66, etc.)

        Args:
            address: Word address (64 for IW64, 66 for IW66)

        Returns:
            Raw value (0-27648 for 0-10V) or None if error
        """
        if not self.connected:
            return None
        try:
            with self.lock:
                data = self.client.read_area(Areas.PE, 0, address, 2)
                return get_int(data, 0)
        except Exception as e:
            self._handle_connection_error(e)
            logger.error(f"Error reading analog input IW{address}: {e}")
            return None

    # ══════════════════════════════════════════════════════════════════════
    # DIRECT HARDWARE OUTPUTS - Write directly to physical outputs (PA/Q Area)
    # ══════════════════════════════════════════════════════════════════════

    def write_output_bit(self, byte_offset: int, bit: int, value: bool) -> bool:
        """Write digital output directly to hardware (Q0.0, Q0.1, etc.)

        Args:
            byte_offset: Byte number (0 for Q0.x, 1 for Q1.x, 4 for Q4.x)
            bit: Bit number (0-7)
            value: True/False

        Returns:
            True if successful, False otherwise
        """
        if not self.connected:
            return False
        try:
            with self.lock:
                # Read current byte to preserve other bits
                data = self.client.read_area(Areas.PA, 0, byte_offset, 1)
                set_bool(data, 0, bit, value)
                self.client.write_area(Areas.PA, 0, byte_offset, data)
                return True
        except Exception as e:
            self._handle_connection_error(e)
            logger.error(f"Error writing output Q{byte_offset}.{bit}: {e}")
            return False

    def read_output_bit(self, byte_offset: int, bit: int) -> Optional[bool]:
        """Read digital output state (Q0.0, Q0.1, etc.)

        Args:
            byte_offset: Byte number (0 for Q0.x, 1 for Q1.x)
            bit: Bit number (0-7)

        Returns:
            bool value or None if error
        """
        if not self.connected:
            return None
        try:
            with self.lock:
                data = self.client.read_area(Areas.PA, 0, byte_offset, 1)
                return get_bool(data, 0, bit)
        except Exception as e:
            self._handle_connection_error(e)
            logger.error(f"Error reading output Q{byte_offset}.{bit}: {e}")
            return None
