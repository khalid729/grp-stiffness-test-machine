from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Test(Base):
    """Test record model - stores completed test results"""
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sample_id = Column(String(50), nullable=True, index=True)
    operator = Column(String(100), nullable=True)
    test_date = Column(DateTime, default=datetime.utcnow, index=True)

    # Test Parameters
    pipe_diameter = Column(Float, nullable=False)  # mm
    pipe_length = Column(Float, nullable=False)  # mm
    deflection_percent = Column(Float, nullable=False)  # %

    # Test Results
    force_at_target = Column(Float, nullable=True)  # kN (force at 3%)
    max_force = Column(Float, nullable=True)  # kN
    ring_stiffness = Column(Float, nullable=True)  # kN/m²
    sn_class = Column(Integer, nullable=True)  # SN classification (2500, 5000, 10000)
    passed = Column(Boolean, default=False)

    # Test metadata
    test_speed = Column(Float, nullable=True)  # mm/min
    duration = Column(Float, nullable=True)  # seconds
    notes = Column(Text, nullable=True)

    # Relationship to data points
    data_points = relationship("TestDataPoint", back_populates="test", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Test {self.id}: Ø{self.pipe_diameter}mm, SN{self.sn_class}, {'PASS' if self.passed else 'FAIL'}>"

    def to_dict(self):
        return {
            "id": self.id,
            "sample_id": self.sample_id,
            "operator": self.operator,
            "test_date": self.test_date.isoformat() if self.test_date else None,
            "pipe_diameter": self.pipe_diameter,
            "pipe_length": self.pipe_length,
            "deflection_percent": self.deflection_percent,
            "force_at_target": self.force_at_target,
            "max_force": self.max_force,
            "ring_stiffness": self.ring_stiffness,
            "sn_class": self.sn_class,
            "passed": self.passed,
            "test_speed": self.test_speed,
            "duration": self.duration,
            "notes": self.notes,
        }


class TestDataPoint(Base):
    """Test data point model - stores force/deflection curve data"""
    __tablename__ = "test_data_points"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(Float, nullable=False)  # Time offset in seconds from test start
    force = Column(Float, nullable=False)  # kN
    deflection = Column(Float, nullable=False)  # mm
    position = Column(Float, nullable=True)  # mm (actuator position)

    # Relationship
    test = relationship("Test", back_populates="data_points")

    def __repr__(self):
        return f"<DataPoint t={self.timestamp}s: F={self.force}kN, d={self.deflection}mm>"

    def to_dict(self):
        return {
            "id": self.id,
            "test_id": self.test_id,
            "timestamp": self.timestamp,
            "force": self.force,
            "deflection": self.deflection,
            "position": self.position,
        }


class Alarm(Base):
    """Alarm record model - stores alarm history"""
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alarm_code = Column(String(10), nullable=False, index=True)
    message = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False, default="warning")  # critical, warning, info
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)
    ack_timestamp = Column(DateTime, nullable=True)
    ack_by = Column(String(100), nullable=True)

    def __repr__(self):
        return f"<Alarm {self.alarm_code}: {self.message}>"

    def to_dict(self):
        return {
            "id": self.id,
            "alarm_code": self.alarm_code,
            "message": self.message,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "acknowledged": self.acknowledged,
            "ack_timestamp": self.ack_timestamp.isoformat() if self.ack_timestamp else None,
            "ack_by": self.ack_by,
        }


# SN Class constants for reference
SN_CLASSES = {
    2500: "SN 2500",
    5000: "SN 5000",
    10000: "SN 10000",
}
