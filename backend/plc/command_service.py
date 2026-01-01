import time
import logging
from .connector import PLCConnector

logger = logging.getLogger(__name__)


class CommandService:
    """Service for sending commands to PLC via DB3"""

    # DB3 - Control Bits (Byte 0)
    DB3_ENABLE_BIT = 0
    DB3_JOG_FORWARD_BIT = 1
    DB3_JOG_BACKWARD_BIT = 2
    DB3_START_TEST_BIT = 3
    DB3_STOP_BIT = 4
    DB3_HOME_BIT = 5
    DB3_ALARM_RESET_BIT = 6

    # DB3 - Status/Control Bits (Byte 1)
    DB3_LOCK_UPPER_BIT = 3
    DB3_LOCK_LOWER_BIT = 4

    # DB3 - Jog Velocity offset
    DB3_JOG_VELOCITY = 2

    def __init__(self, plc: PLCConnector):
        self.plc = plc

    def _check_connection(self) -> bool:
        """Check PLC connection before command"""
        if not self.plc.connected:
            logger.warning("Cannot execute command: PLC not connected")
            return False
        return True

    # ========== Jog Control ==========

    def jog_forward(self, state: bool) -> bool:
        """Jog forward (down) - DB3.DBX0.1"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 0, self.DB3_JOG_FORWARD_BIT, state)
        logger.info(f"Jog forward: {state}")
        return result

    def jog_backward(self, state: bool) -> bool:
        """Jog backward (up) - DB3.DBX0.2"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 0, self.DB3_JOG_BACKWARD_BIT, state)
        logger.info(f"Jog backward: {state}")
        return result

    def set_jog_velocity(self, velocity: float) -> bool:
        """Set jog speed - DB3.DBD2 (mm/min)"""
        if not self._check_connection():
            return False
        # Clamp velocity to safe range
        velocity = max(1.0, min(100.0, velocity))
        result = self.plc.write_real(3, self.DB3_JOG_VELOCITY, velocity)
        logger.info(f"Jog velocity set to: {velocity} mm/min")
        return result

    def stop_all_jog(self) -> bool:
        """Stop all jog movements - safety function"""
        success = True
        success &= self.plc.write_bool(3, 0, self.DB3_JOG_FORWARD_BIT, False)
        success &= self.plc.write_bool(3, 0, self.DB3_JOG_BACKWARD_BIT, False)
        logger.info("All jog stopped")
        return success

    # ========== Test Control ==========

    def start_test(self) -> bool:
        """Start automated test - DB3.DBX0.3"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 0, self.DB3_START_TEST_BIT, True)
        logger.info("Test started")
        return result

    def stop(self) -> bool:
        """Emergency stop - DB3.DBX0.4 (pulse)"""
        if not self._check_connection():
            return False
        # Send stop pulse
        self.plc.write_bool(3, 0, self.DB3_STOP_BIT, True)
        time.sleep(0.1)
        result = self.plc.write_bool(3, 0, self.DB3_STOP_BIT, False)
        # Also stop any jog
        self.stop_all_jog()
        logger.warning("Emergency STOP executed")
        return result

    def home(self) -> bool:
        """Go to home position - DB3.DBX0.5"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 0, self.DB3_HOME_BIT, True)
        logger.info("Homing started")
        return result

    # ========== Servo Control ==========

    def enable_servo(self) -> bool:
        """Enable servo motor - DB3.DBX0.0"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 0, self.DB3_ENABLE_BIT, True)
        logger.info("Servo enabled")
        return result

    def disable_servo(self) -> bool:
        """Disable servo motor - DB3.DBX0.0"""
        if not self._check_connection():
            return False
        # Stop any movement first
        self.stop_all_jog()
        result = self.plc.write_bool(3, 0, self.DB3_ENABLE_BIT, False)
        logger.info("Servo disabled")
        return result

    def reset_alarm(self) -> bool:
        """Reset servo alarm - DB3.DBX0.6 (pulse)"""
        if not self._check_connection():
            return False
        self.plc.write_bool(3, 0, self.DB3_ALARM_RESET_BIT, True)
        time.sleep(0.5)
        result = self.plc.write_bool(3, 0, self.DB3_ALARM_RESET_BIT, False)
        logger.info("Alarm reset executed")
        return result

    # ========== Clamp Control ==========

    def lock_upper(self) -> bool:
        """Lock upper clamp - DB3.DBX1.3"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 1, self.DB3_LOCK_UPPER_BIT, True)
        logger.info("Upper clamp locked")
        return result

    def lock_lower(self) -> bool:
        """Lock lower clamp - DB3.DBX1.4"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 1, self.DB3_LOCK_LOWER_BIT, True)
        logger.info("Lower clamp locked")
        return result

    def unlock_upper(self) -> bool:
        """Unlock upper clamp - DB3.DBX1.3"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 1, self.DB3_LOCK_UPPER_BIT, False)
        logger.info("Upper clamp unlocked")
        return result

    def unlock_lower(self) -> bool:
        """Unlock lower clamp - DB3.DBX1.4"""
        if not self._check_connection():
            return False
        result = self.plc.write_bool(3, 1, self.DB3_LOCK_LOWER_BIT, False)
        logger.info("Lower clamp unlocked")
        return result

    def unlock_all(self) -> bool:
        """Unlock all clamps"""
        success = True
        success &= self.unlock_upper()
        success &= self.unlock_lower()
        logger.info("All clamps unlocked")
        return success
