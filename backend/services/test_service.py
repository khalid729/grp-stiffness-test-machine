import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from db.models import Test, TestDataPoint, Alarm
from db.database import SessionLocal
from plc.data_service import DataService
from plc.command_service import CommandService

logger = logging.getLogger(__name__)


class TestService:
    """Service for managing test execution and data recording"""

    def __init__(self, data_service: DataService, command_service: CommandService):
        self.data_service = data_service
        self.command_service = command_service
        self.current_test: Optional[Test] = None
        self.is_recording = False
        self.data_points: List[Dict[str, float]] = []
        self.test_start_time: Optional[float] = None
        self._recording_task: Optional[asyncio.Task] = None

    async def start_test(
        self,
        pipe_diameter: float,
        pipe_length: float,
        deflection_percent: float,
        test_speed: float = 10.0,
        sample_id: Optional[str] = None,
        operator: Optional[str] = None,
    ) -> Optional[int]:
        """Start a new test and begin recording data"""
        if self.is_recording:
            logger.warning("Test already in progress")
            return None

        # Create test record
        db = SessionLocal()
        try:
            self.current_test = Test(
                sample_id=sample_id,
                operator=operator,
                test_date=datetime.utcnow(),
                pipe_diameter=pipe_diameter,
                pipe_length=pipe_length,
                deflection_percent=deflection_percent,
                test_speed=test_speed,
            )
            db.add(self.current_test)
            db.commit()
            db.refresh(self.current_test)
            test_id = self.current_test.id

            # Set parameters on PLC
            self.data_service.set_parameters(
                diameter=pipe_diameter,
                length=pipe_length,
                deflection_pct=deflection_percent,
                test_speed=test_speed,
            )

            # Start recording
            self.is_recording = True
            self.data_points = []
            self.test_start_time = asyncio.get_event_loop().time()

            # Start data recording task
            self._recording_task = asyncio.create_task(self._record_data())

            # Send start command to PLC
            self.command_service.start_test()

            logger.info(f"Test {test_id} started")
            return test_id

        except Exception as e:
            logger.error(f"Failed to start test: {e}")
            db.rollback()
            return None
        finally:
            db.close()

    async def _record_data(self):
        """Background task to record test data points"""
        while self.is_recording:
            try:
                data = self.data_service.get_live_data()
                current_time = asyncio.get_event_loop().time()

                self.data_points.append({
                    'timestamp': current_time - self.test_start_time,
                    'force': data.get('actual_force', 0),
                    'deflection': data.get('actual_deflection', 0),
                    'position': data.get('actual_position', 0),
                })

                # Check if test is complete (status == 5)
                if data.get('test_status') == 5:
                    await self.complete_test()
                    break

                await asyncio.sleep(0.1)  # Record at 10 Hz

            except Exception as e:
                logger.error(f"Error recording data: {e}")
                await asyncio.sleep(0.1)

    async def complete_test(self):
        """Complete the current test and save results"""
        if not self.is_recording or not self.current_test:
            return None

        self.is_recording = False
        test_end_time = asyncio.get_event_loop().time()

        db = SessionLocal()
        try:
            # Get final results from PLC
            result = self.data_service.get_test_result()

            # Update test record
            test = db.query(Test).filter(Test.id == self.current_test.id).first()
            if test:
                test.force_at_target = result.get('force_at_target', 0)
                test.ring_stiffness = result.get('ring_stiffness', 0)
                test.sn_class = result.get('sn_class', 0)
                test.passed = result.get('test_passed', False)
                test.duration = test_end_time - self.test_start_time
                test.max_force = max((dp['force'] for dp in self.data_points), default=0)

                # Save data points
                for dp in self.data_points:
                    data_point = TestDataPoint(
                        test_id=test.id,
                        timestamp=dp['timestamp'],
                        force=dp['force'],
                        deflection=dp['deflection'],
                        position=dp['position'],
                    )
                    db.add(data_point)

                db.commit()
                logger.info(f"Test {test.id} completed: {'PASS' if test.passed else 'FAIL'}")

                return {
                    'test_id': test.id,
                    'ring_stiffness': test.ring_stiffness,
                    'sn_class': test.sn_class,
                    'passed': test.passed,
                }

        except Exception as e:
            logger.error(f"Failed to complete test: {e}")
            db.rollback()
            return None
        finally:
            db.close()
            self.current_test = None
            self.data_points = []

    def stop_test(self):
        """Stop the current test (emergency stop)"""
        self.is_recording = False
        if self._recording_task:
            self._recording_task.cancel()
        self.command_service.stop()
        logger.warning("Test stopped by user")

    def add_alarm(self, alarm_code: str, message: str, severity: str = 'warning'):
        """Add an alarm to the database"""
        db = SessionLocal()
        try:
            alarm = Alarm(
                alarm_code=alarm_code,
                message=message,
                severity=severity,
                timestamp=datetime.utcnow(),
            )
            db.add(alarm)
            db.commit()
            logger.warning(f"Alarm added: {alarm_code} - {message}")
            return alarm.id
        except Exception as e:
            logger.error(f"Failed to add alarm: {e}")
            db.rollback()
            return None
        finally:
            db.close()
