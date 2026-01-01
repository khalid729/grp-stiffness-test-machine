from typing import Dict, Any, Optional
from .connector import PLCConnector
import logging

logger = logging.getLogger(__name__)


class DataService:
    """Service for reading data from PLC Data Blocks"""

    # DB1 - Test Parameters offsets
    DB1_PIPE_DIAMETER = 0
    DB1_PIPE_LENGTH = 4
    DB1_DEFLECTION_PERCENT = 8
    DB1_TEST_SPEED = 12
    DB1_MAX_STROKE = 16
    DB1_MAX_FORCE = 20

    # DB2 - Test Results offsets
    DB2_ACTUAL_FORCE = 0
    DB2_ACTUAL_DEFLECTION = 4
    DB2_TARGET_DEFLECTION = 8
    DB2_RING_STIFFNESS = 12
    DB2_FORCE_AT_TARGET = 16
    DB2_SN_CLASS = 20
    DB2_TEST_STATUS = 22
    DB2_TEST_PASSED = 24

    # DB3 - Servo Status offsets
    DB3_SERVO_READY_BYTE = 1
    DB3_SERVO_READY_BIT = 0
    DB3_SERVO_ERROR_BIT = 1
    DB3_AT_HOME_BIT = 2
    DB3_LOCK_UPPER_BIT = 3
    DB3_LOCK_LOWER_BIT = 4
    DB3_ACTUAL_POSITION = 6

    def __init__(self, plc: PLCConnector):
        self.plc = plc

    def get_live_data(self) -> Dict[str, Any]:
        """Read all real-time values for dashboard - called every 100ms"""
        if not self.plc.connected:
            return self._get_disconnected_data()

        try:
            return {
                # DB2 - Test Results
                "actual_force": self.plc.read_real(2, self.DB2_ACTUAL_FORCE) or 0.0,
                "actual_deflection": self.plc.read_real(2, self.DB2_ACTUAL_DEFLECTION) or 0.0,
                "target_deflection": self.plc.read_real(2, self.DB2_TARGET_DEFLECTION) or 0.0,
                "ring_stiffness": self.plc.read_real(2, self.DB2_RING_STIFFNESS) or 0.0,
                "force_at_target": self.plc.read_real(2, self.DB2_FORCE_AT_TARGET) or 0.0,
                "sn_class": self.plc.read_int(2, self.DB2_SN_CLASS) or 0,
                "test_status": self.plc.read_int(2, self.DB2_TEST_STATUS) or 0,
                "test_passed": self.plc.read_bool(2, self.DB2_TEST_PASSED, 0) or False,
                # DB3 - Servo Status
                "servo_ready": self.plc.read_bool(3, self.DB3_SERVO_READY_BYTE, self.DB3_SERVO_READY_BIT) or False,
                "servo_error": self.plc.read_bool(3, self.DB3_SERVO_READY_BYTE, self.DB3_SERVO_ERROR_BIT) or False,
                "at_home": self.plc.read_bool(3, self.DB3_SERVO_READY_BYTE, self.DB3_AT_HOME_BIT) or False,
                "lock_upper": self.plc.read_bool(3, self.DB3_SERVO_READY_BYTE, self.DB3_LOCK_UPPER_BIT) or False,
                "lock_lower": self.plc.read_bool(3, self.DB3_SERVO_READY_BYTE, self.DB3_LOCK_LOWER_BIT) or False,
                "actual_position": self.plc.read_real(3, self.DB3_ACTUAL_POSITION) or 0.0,
                # Connection status
                "connected": True,
            }
        except Exception as e:
            logger.error(f"Error reading live data: {e}")
            return self._get_disconnected_data()

    def _get_disconnected_data(self) -> Dict[str, Any]:
        """Return default values when PLC is disconnected"""
        return {
            "actual_force": 0.0,
            "actual_deflection": 0.0,
            "target_deflection": 0.0,
            "ring_stiffness": 0.0,
            "force_at_target": 0.0,
            "sn_class": 0,
            "test_status": -1,  # -1 indicates disconnected
            "test_passed": False,
            "servo_ready": False,
            "servo_error": False,
            "at_home": False,
            "lock_upper": False,
            "lock_lower": False,
            "actual_position": 0.0,
            "connected": False,
        }

    def get_parameters(self) -> Dict[str, Any]:
        """Read test parameters from DB1"""
        if not self.plc.connected:
            return {
                "pipe_diameter": 0.0,
                "pipe_length": 0.0,
                "deflection_percent": 0.0,
                "test_speed": 0.0,
                "max_stroke": 0.0,
                "max_force": 0.0,
                "connected": False,
            }

        return {
            "pipe_diameter": self.plc.read_real(1, self.DB1_PIPE_DIAMETER) or 0.0,
            "pipe_length": self.plc.read_real(1, self.DB1_PIPE_LENGTH) or 0.0,
            "deflection_percent": self.plc.read_real(1, self.DB1_DEFLECTION_PERCENT) or 0.0,
            "test_speed": self.plc.read_real(1, self.DB1_TEST_SPEED) or 0.0,
            "max_stroke": self.plc.read_real(1, self.DB1_MAX_STROKE) or 0.0,
            "max_force": self.plc.read_real(1, self.DB1_MAX_FORCE) or 0.0,
            "connected": True,
        }

    def set_parameters(
        self,
        diameter: Optional[float] = None,
        length: Optional[float] = None,
        deflection_pct: Optional[float] = None,
        test_speed: Optional[float] = None,
        max_stroke: Optional[float] = None,
        max_force: Optional[float] = None,
    ) -> bool:
        """Write test parameters to DB1"""
        if not self.plc.connected:
            return False

        success = True
        if diameter is not None:
            success &= self.plc.write_real(1, self.DB1_PIPE_DIAMETER, diameter)
        if length is not None:
            success &= self.plc.write_real(1, self.DB1_PIPE_LENGTH, length)
        if deflection_pct is not None:
            success &= self.plc.write_real(1, self.DB1_DEFLECTION_PERCENT, deflection_pct)
        if test_speed is not None:
            success &= self.plc.write_real(1, self.DB1_TEST_SPEED, test_speed)
        if max_stroke is not None:
            success &= self.plc.write_real(1, self.DB1_MAX_STROKE, max_stroke)
        if max_force is not None:
            success &= self.plc.write_real(1, self.DB1_MAX_FORCE, max_force)

        return success

    def get_test_result(self) -> Dict[str, Any]:
        """Get complete test result data"""
        if not self.plc.connected:
            return {"error": "PLC not connected"}

        return {
            "force_at_target": self.plc.read_real(2, self.DB2_FORCE_AT_TARGET) or 0.0,
            "ring_stiffness": self.plc.read_real(2, self.DB2_RING_STIFFNESS) or 0.0,
            "sn_class": self.plc.read_int(2, self.DB2_SN_CLASS) or 0,
            "test_passed": self.plc.read_bool(2, self.DB2_TEST_PASSED, 0) or False,
            "target_deflection": self.plc.read_real(2, self.DB2_TARGET_DEFLECTION) or 0.0,
        }
