import snap7
from snap7.util import get_real, set_real, get_int, get_bool, set_bool
import threading
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)


class PLCConnector:
    """Snap7 PLC Connection Handler for Siemens S7-1214C"""

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
            return self._connected and self.client.get_connected()
        except Exception:
            self._connected = False
            return False

    def connect(self) -> bool:
        """Establish connection to PLC"""
        try:
            if self.connected:
                return True
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
