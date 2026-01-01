"""
GRP Ring Stiffness Test Machine - Backend Server
Python + FastAPI + Snap7 + WebSocket

Run with: uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

from config import settings
from db.database import init_db
from plc.connector import PLCConnector
from plc.data_service import DataService
from plc.command_service import CommandService
from services.pdf_generator import PDFGenerator
from services.excel_export import ExcelExporter
from services.test_service import TestService
from api.routes import status, commands, reports, demo
from api import websocket as ws

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('grp_test.log')
    ]
)
logger = logging.getLogger(__name__)

# Initialize components
plc = PLCConnector(settings.PLC_IP, settings.PLC_RACK, settings.PLC_SLOT)
data_service = DataService(plc)
command_service = CommandService(plc)
pdf_generator = PDFGenerator()
excel_exporter = ExcelExporter()
test_service = TestService(data_service, command_service)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown"""
    # Startup
    logger.info("Starting GRP Test Backend Server...")

    # Initialize database
    init_db()
    logger.info("Database initialized")

    # Connect to PLC
    if plc.connect():
        logger.info(f"Connected to PLC at {settings.PLC_IP}")
    else:
        logger.warning(f"Could not connect to PLC at {settings.PLC_IP} - running in offline mode")

    # Start WebSocket broadcast task
    ws.start_broadcast_task()
    logger.info("WebSocket broadcast started")

    yield

    # Shutdown
    logger.info("Shutting down...")

    # Stop broadcast
    ws.stop_broadcast_task()

    # Safety: stop all movements
    command_service.stop_all_jog()

    # Disconnect PLC
    plc.disconnect()
    logger.info("Server shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="GRP Ring Stiffness Test API",
    description="Backend API for GRP Pipe Ring Stiffness Testing Machine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set services for routes
status.set_services(plc, data_service)
commands.set_services(command_service)
reports.set_services(pdf_generator, excel_exporter)
ws.set_services(data_service, command_service)

# Include routers
app.include_router(status.router, prefix="/api")
app.include_router(commands.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(demo.router, prefix="/api")  # Demo data for testing


# Additional API endpoints
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "plc_connected": plc.connected,
        "plc_ip": settings.PLC_IP
    }


@app.post("/api/test/start")
async def api_start_test(
    pipe_diameter: float,
    pipe_length: float,
    deflection_percent: float,
    test_speed: float = 10.0,
    sample_id: str = None,
    operator: str = None
):
    """Start a new test via API"""
    test_id = await test_service.start_test(
        pipe_diameter=pipe_diameter,
        pipe_length=pipe_length,
        deflection_percent=deflection_percent,
        test_speed=test_speed,
        sample_id=sample_id,
        operator=operator
    )
    if test_id:
        return {"success": True, "test_id": test_id, "message": "Test started"}
    return {"success": False, "message": "Failed to start test"}


@app.post("/api/test/stop")
async def api_stop_test():
    """Stop current test"""
    test_service.stop_test()
    return {"success": True, "message": "Test stopped"}


# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(
    ws.sio,
    app,
    socketio_path='/socket.io'
)

# Serve static files (frontend build) - mount last
try:
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
except Exception:
    logger.info("Static files directory not found - frontend not served")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:socket_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
