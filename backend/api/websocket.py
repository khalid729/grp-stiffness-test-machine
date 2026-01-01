import socketio
import asyncio
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# Services - will be set from main.py
data_service = None
command_service = None

# Background task handle
broadcast_task: Optional[asyncio.Task] = None


def set_services(data_svc, cmd_svc):
    """Set service instances from main.py"""
    global data_service, command_service
    data_service = data_svc
    command_service = cmd_svc


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_status', {'connected': True}, room=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnect - SAFETY: stop all jog on disconnect"""
    logger.info(f"Client disconnected: {sid}")
    if command_service:
        # Safety: stop all jog movements when client disconnects
        command_service.stop_all_jog()
        logger.warning(f"Safety stop executed for disconnected client: {sid}")


@sio.event
async def subscribe(sid, data):
    """Subscribe to live data updates"""
    await sio.enter_room(sid, 'live_data')
    logger.info(f"Client {sid} subscribed to live_data")


@sio.event
async def unsubscribe(sid, data):
    """Unsubscribe from live data updates"""
    await sio.leave_room(sid, 'live_data')
    logger.info(f"Client {sid} unsubscribed from live_data")


@sio.event
async def jog_forward(sid, data):
    """Handle jog forward command from client"""
    if command_service:
        state = data.get('state', False)
        success = command_service.jog_forward(state)
        await sio.emit('jog_response', {
            'direction': 'forward',
            'state': state,
            'success': success
        }, room=sid)


@sio.event
async def jog_backward(sid, data):
    """Handle jog backward command from client"""
    if command_service:
        state = data.get('state', False)
        success = command_service.jog_backward(state)
        await sio.emit('jog_response', {
            'direction': 'backward',
            'state': state,
            'success': success
        }, room=sid)


@sio.event
async def set_jog_speed(sid, data):
    """Set jog velocity"""
    if command_service:
        velocity = data.get('velocity', 50)
        success = command_service.set_jog_velocity(velocity)
        await sio.emit('jog_speed_response', {
            'velocity': velocity,
            'success': success
        }, room=sid)


async def broadcast_live_data():
    """Background task to broadcast live data every 100ms"""
    logger.info("Starting live data broadcast task")
    while True:
        try:
            if data_service:
                data = data_service.get_live_data()
                await sio.emit('live_data', data, room='live_data')
        except Exception as e:
            logger.error(f"Error broadcasting live data: {e}")

        await asyncio.sleep(settings.WS_UPDATE_INTERVAL)


async def emit_test_complete(test_data: dict):
    """Emit test complete event to all clients"""
    await sio.emit('test_complete', test_data, room='live_data')
    logger.info(f"Test complete event emitted: {test_data}")


async def emit_alarm(alarm_data: dict):
    """Emit alarm event to all clients"""
    await sio.emit('alarm', alarm_data, room='live_data')
    logger.warning(f"Alarm event emitted: {alarm_data}")


async def emit_connection_status(connected: bool):
    """Emit PLC connection status change"""
    await sio.emit('connection_status', {'connected': connected}, room='live_data')
    logger.info(f"Connection status emitted: {connected}")


def start_broadcast_task():
    """Start the background broadcast task"""
    global broadcast_task
    if broadcast_task is None or broadcast_task.done():
        broadcast_task = asyncio.create_task(broadcast_live_data())
        logger.info("Broadcast task started")


def stop_broadcast_task():
    """Stop the background broadcast task"""
    global broadcast_task
    if broadcast_task and not broadcast_task.done():
        broadcast_task.cancel()
        logger.info("Broadcast task stopped")
