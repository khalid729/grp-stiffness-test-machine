from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["Status"])

# These will be set from main.py
plc = None
data_service = None


def set_services(plc_instance, data_service_instance):
    global plc, data_service
    plc = plc_instance
    data_service = data_service_instance


class ParametersRequest(BaseModel):
    pipe_diameter: Optional[float] = None
    pipe_length: Optional[float] = None
    deflection_percent: Optional[float] = None
    test_speed: Optional[float] = None
    max_stroke: Optional[float] = None
    max_force: Optional[float] = None


class ConnectionResponse(BaseModel):
    connected: bool
    ip: str
    message: str


@router.get("/status")
async def get_status():
    """Get all live data (force, position, status, indicators)"""
    if data_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return data_service.get_live_data()


@router.get("/status/connection", response_model=ConnectionResponse)
async def get_connection_status():
    """Check PLC connection status"""
    if plc is None:
        return ConnectionResponse(
            connected=False,
            ip="",
            message="PLC service not initialized"
        )
    return ConnectionResponse(
        connected=plc.connected,
        ip=plc.ip,
        message="Connected" if plc.connected else "Disconnected"
    )


@router.post("/status/reconnect")
async def reconnect_plc():
    """Reconnect to PLC"""
    if plc is None:
        raise HTTPException(status_code=503, detail="PLC service not initialized")

    success = plc.reconnect()
    return {
        "success": success,
        "connected": plc.connected,
        "message": "Reconnected successfully" if success else "Reconnection failed"
    }


@router.get("/parameters")
async def get_parameters():
    """Get current test parameters from PLC"""
    if data_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return data_service.get_parameters()


@router.post("/parameters")
async def set_parameters(params: ParametersRequest):
    """Set test parameters to PLC"""
    if data_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    success = data_service.set_parameters(
        diameter=params.pipe_diameter,
        length=params.pipe_length,
        deflection_pct=params.deflection_percent,
        test_speed=params.test_speed,
        max_stroke=params.max_stroke,
        max_force=params.max_force,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to write parameters to PLC")

    return {"success": True, "message": "Parameters updated successfully"}
