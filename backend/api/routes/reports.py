from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
import io

from db.database import get_db
from db.models import Test, TestDataPoint, Alarm

router = APIRouter(tags=["Reports"])

# These will be set from main.py
pdf_generator = None
excel_exporter = None


def set_services(pdf_gen, excel_exp):
    global pdf_generator, excel_exporter
    pdf_generator = pdf_gen
    excel_exporter = excel_exp


# ========== Test History ==========

@router.get("/tests")
async def get_tests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sample_id: Optional[str] = None,
    operator: Optional[str] = None,
    passed: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get test history with pagination and filters"""
    query = select(Test).order_by(desc(Test.test_date))

    # Apply filters
    if sample_id:
        query = query.where(Test.sample_id.contains(sample_id))
    if operator:
        query = query.where(Test.operator.contains(operator))
    if passed is not None:
        query = query.where(Test.passed == passed)

    # Count total
    count_query = select(Test)
    if sample_id:
        count_query = count_query.where(Test.sample_id.contains(sample_id))
    if operator:
        count_query = count_query.where(Test.operator.contains(operator))
    if passed is not None:
        count_query = count_query.where(Test.passed == passed)

    result = await db.execute(count_query)
    total = len(result.scalars().all())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    tests = result.scalars().all()

    return {
        "tests": [t.to_dict() for t in tests],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/tests/{test_id}")
async def get_test(test_id: int, db: AsyncSession = Depends(get_db)):
    """Get single test details with data points"""
    query = select(Test).options(selectinload(Test.data_points)).where(Test.id == test_id)
    result = await db.execute(query)
    test = result.scalar_one_or_none()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test_dict = test.to_dict()
    test_dict["data_points"] = [dp.to_dict() for dp in test.data_points]
    return test_dict


@router.delete("/tests/{test_id}")
async def delete_test(test_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a test record"""
    query = select(Test).where(Test.id == test_id)
    result = await db.execute(query)
    test = result.scalar_one_or_none()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    await db.delete(test)
    await db.commit()

    return {"success": True, "message": f"Test {test_id} deleted"}


# ========== PDF Reports ==========

@router.get("/report/pdf/{test_id}")
async def download_pdf_report(test_id: int, db: AsyncSession = Depends(get_db)):
    """Download PDF report for a specific test"""
    if pdf_generator is None:
        raise HTTPException(status_code=503, detail="PDF generator not initialized")

    query = select(Test).options(selectinload(Test.data_points)).where(Test.id == test_id)
    result = await db.execute(query)
    test = result.scalar_one_or_none()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Generate PDF
    pdf_buffer = pdf_generator.generate_test_report(test)

    filename = f"test_report_{test_id}_{test.test_date.strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_buffer),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ========== Excel Export ==========

@router.get("/report/excel")
async def export_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Export tests to Excel file"""
    if excel_exporter is None:
        raise HTTPException(status_code=503, detail="Excel exporter not initialized")

    query = select(Test).order_by(desc(Test.test_date))

    # Apply date filters
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.where(Test.test_date >= start)
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.where(Test.test_date <= end)

    result = await db.execute(query)
    tests = result.scalars().all()

    if not tests:
        raise HTTPException(status_code=404, detail="No tests found for export")

    # Generate Excel
    excel_buffer = excel_exporter.export_tests(tests)

    filename = f"test_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        io.BytesIO(excel_buffer),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ========== Alarms ==========

@router.get("/alarms")
async def get_alarms(
    active_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get alarm history"""
    query = select(Alarm).order_by(desc(Alarm.timestamp))

    if active_only:
        query = query.where(Alarm.acknowledged == False)

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    alarms = result.scalars().all()

    return {
        "alarms": [a.to_dict() for a in alarms],
        "page": page,
        "page_size": page_size
    }


@router.post("/alarms/{alarm_id}/acknowledge")
async def acknowledge_alarm(
    alarm_id: int,
    ack_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge an alarm"""
    query = select(Alarm).where(Alarm.id == alarm_id)
    result = await db.execute(query)
    alarm = result.scalar_one_or_none()

    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    alarm.acknowledged = True
    alarm.ack_timestamp = datetime.utcnow()
    alarm.ack_by = ack_by

    await db.commit()

    return {"success": True, "message": f"Alarm {alarm_id} acknowledged"}


@router.post("/alarms/acknowledge-all")
async def acknowledge_all_alarms(
    ack_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge all active alarms"""
    query = select(Alarm).where(Alarm.acknowledged == False)
    result = await db.execute(query)
    alarms = result.scalars().all()

    count = 0
    for alarm in alarms:
        alarm.acknowledged = True
        alarm.ack_timestamp = datetime.utcnow()
        alarm.ack_by = ack_by
        count += 1

    await db.commit()

    return {"success": True, "message": f"{count} alarms acknowledged"}
