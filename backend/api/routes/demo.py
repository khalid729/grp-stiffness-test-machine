"""Demo data endpoints for testing without PLC"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
import random

from db.database import get_db
from db.models import Test, TestDataPoint, Alarm

router = APIRouter(prefix="/demo", tags=["Demo"])


@router.post("/generate-tests")
async def generate_demo_tests(count: int = 5, db: AsyncSession = Depends(get_db)):
    """Generate demo test data for testing reports"""
    tests_created = []

    for i in range(count):
        # Random test parameters
        diameter = random.choice([150, 200, 250, 300, 400])
        length = 300
        deflection_pct = 3.0
        target_deflection = diameter * deflection_pct / 100

        # Random results
        force_at_target = random.uniform(20, 100)
        ring_stiffness = random.choice([2500, 5000, 10000]) + random.randint(-500, 500)
        sn_class = 2500 if ring_stiffness < 3750 else (5000 if ring_stiffness < 7500 else 10000)
        passed = ring_stiffness >= (sn_class * 0.9)  # 90% of target

        # Create test record
        test = Test(
            sample_id=f"SAMPLE-{random.randint(1000, 9999)}",
            operator=random.choice(["Ahmed", "Mohammed", "Khalid", "Ali"]),
            test_date=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            pipe_diameter=diameter,
            pipe_length=length,
            deflection_percent=deflection_pct,
            force_at_target=force_at_target,
            max_force=force_at_target * random.uniform(1.0, 1.2),
            ring_stiffness=ring_stiffness,
            sn_class=sn_class,
            passed=passed,
            test_speed=10.0,
            duration=random.uniform(30, 120),
        )
        db.add(test)
        await db.flush()  # Get the ID

        # Generate data points for chart
        num_points = random.randint(50, 150)
        for j in range(num_points):
            deflection = (target_deflection * j) / num_points
            # Simulated force curve (approximately linear with some noise)
            force = (force_at_target * j / num_points) + random.uniform(-0.5, 0.5)

            data_point = TestDataPoint(
                test_id=test.id,
                timestamp=j * 0.1,  # 100ms intervals
                force=max(0, force),
                deflection=deflection,
                position=deflection,
            )
            db.add(data_point)

        tests_created.append({
            "id": test.id,
            "sample_id": test.sample_id,
            "passed": test.passed,
            "sn_class": test.sn_class,
        })

    await db.commit()

    return {
        "success": True,
        "message": f"Created {count} demo tests",
        "tests": tests_created
    }


@router.post("/generate-alarms")
async def generate_demo_alarms(count: int = 5, db: AsyncSession = Depends(get_db)):
    """Generate demo alarm data"""
    alarm_types = [
        ("E001", "Servo Fault", "critical"),
        ("E002", "Communication Lost", "critical"),
        ("W001", "Position Limit Warning", "warning"),
        ("W002", "Force Limit Warning", "warning"),
        ("W003", "Overload Warning", "warning"),
        ("I001", "Test Started", "info"),
        ("I002", "Test Completed", "info"),
    ]

    alarms_created = []

    for i in range(count):
        code, message, severity = random.choice(alarm_types)

        alarm = Alarm(
            alarm_code=code,
            message=message,
            severity=severity,
            timestamp=datetime.utcnow() - timedelta(hours=random.randint(0, 72)),
            acknowledged=random.choice([True, False]),
        )
        db.add(alarm)
        alarms_created.append({"code": code, "message": message})

    await db.commit()

    return {
        "success": True,
        "message": f"Created {count} demo alarms",
        "alarms": alarms_created
    }


@router.delete("/clear-all")
async def clear_demo_data(db: AsyncSession = Depends(get_db)):
    """Clear all demo data"""
    from sqlalchemy import delete

    await db.execute(delete(TestDataPoint))
    await db.execute(delete(Test))
    await db.execute(delete(Alarm))
    await db.commit()

    return {"success": True, "message": "All demo data cleared"}
