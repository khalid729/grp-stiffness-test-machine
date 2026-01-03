from typing import Dict, Any, Optional
from .connector import PLCConnector
import logging

logger = logging.getLogger(__name__)


class DataService:
    """Service for reading data from PLC - using Direct I/O and Data Blocks"""

    # ══════════════════════════════════════════════════════════════════════
    # DIRECT HARDWARE INPUTS (PE Area) - No PLC programming needed!
    # ══════════════════════════════════════════════════════════════════════
    # Byte 0 (I0.x)
    INPUT_SERVO_READY = (0, 0)      # I0.0
    INPUT_SERVO_ERROR = (0, 1)      # I0.1
    INPUT_AT_HOME = (0, 2)          # I0.2
    INPUT_UPPER_LIMIT = (0, 3)      # I0.3
    INPUT_LOWER_LIMIT = (0, 4)      # I0.4
    INPUT_E_STOP = (0, 6)           # I0.6
    INPUT_START_BUTTON = (0, 7)     # I0.7

    # Analog Inputs
    ANALOG_LOAD_CELL = 64           # IW64 (0-27648 = 0-200 kN)

    # ══════════════════════════════════════════════════════════════════════
    # DATA BLOCKS - For calculated/processed values
    # ══════════════════════════════════════════════════════════════════════
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

    # DB3 - Control Mode
    DB3_REMOTE_MODE = (25, 0)  # DB3.DBX25.0 (False=Local, True=Remote)

    # Load cell scaling constants
    LOAD_CELL_MAX_RAW = 27648
    LOAD_CELL_MAX_FORCE = 200.0  # kN

    def __init__(self, plc: PLCConnector):
        self.plc = plc

    def _scale_load_cell(self, raw_value: int) -> float:
        """Scale raw analog value (0-27648) to kN (0-200)"""
        if raw_value is None or raw_value < 0:
            return 0.0
        return (raw_value / self.LOAD_CELL_MAX_RAW) * self.LOAD_CELL_MAX_FORCE

    def get_live_data(self) -> Dict[str, Any]:
        """Read all real-time values for dashboard - called every 100ms"""
        if not self.plc.connected:
            return self._get_disconnected_data()

        try:
            # Read load cell raw value for scaling
            load_cell_raw = self.plc.read_analog_input(self.ANALOG_LOAD_CELL) or 0

            return {
                # ═══════════════════════════════════════════════════════════
                # DIRECT FROM HARDWARE (I/O) - No PLC programming needed!
                # ═══════════════════════════════════════════════════════════
                "servo_ready": self.plc.read_input_bit(*self.INPUT_SERVO_READY) or False,
                "servo_error": self.plc.read_input_bit(*self.INPUT_SERVO_ERROR) or False,
                "at_home": self.plc.read_input_bit(*self.INPUT_AT_HOME) or False,
                "upper_limit": self.plc.read_input_bit(*self.INPUT_UPPER_LIMIT) or False,
                "lower_limit": self.plc.read_input_bit(*self.INPUT_LOWER_LIMIT) or False,
                "e_stop": self.plc.read_input_bit(*self.INPUT_E_STOP) or False,
                "start_button": self.plc.read_input_bit(*self.INPUT_START_BUTTON) or False,
                # Load cell - direct analog with Python scaling
                "load_cell_raw": load_cell_raw,
                # ═══════════════════════════════════════════════════════════
                # FROM DATA BLOCKS (Calculated/Processed values)
                # ═══════════════════════════════════════════════════════════
                "actual_force": self.plc.read_real(2, self.DB2_ACTUAL_FORCE) or 0.0,
                "actual_deflection": self.plc.read_real(2, self.DB2_ACTUAL_DEFLECTION) or 0.0,
                "target_deflection": self.plc.read_real(2, self.DB2_TARGET_DEFLECTION) or 0.0,
                "ring_stiffness": self.plc.read_real(2, self.DB2_RING_STIFFNESS) or 0.0,
                "force_at_target": self.plc.read_real(2, self.DB2_FORCE_AT_TARGET) or 0.0,
                "sn_class": self.plc.read_int(2, self.DB2_SN_CLASS) or 0,
                "test_status": self.plc.read_int(2, self.DB2_TEST_STATUS) or 0,
                "test_passed": self.plc.read_bool(2, self.DB2_TEST_PASSED, 0) or False,
                # Position from DB2 or calculated
                "actual_position": self.plc.read_real(2, self.DB2_ACTUAL_DEFLECTION) or 0.0,
                # ═══════════════════════════════════════════════════════════
                # CONTROL MODE
                # ═══════════════════════════════════════════════════════════
                "remote_mode": self.plc.read_bool(3, *self.DB3_REMOTE_MODE) or False,
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
            "upper_limit": False,
            "lower_limit": False,
            "e_stop": False,
            "start_button": False,
            "load_cell_raw": 0,
            "actual_position": 0.0,
            "remote_mode": False,
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
