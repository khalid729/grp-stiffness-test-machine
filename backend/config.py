from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # PLC Configuration
    PLC_IP: str = "192.168.0.100"
    PLC_RACK: int = 0
    PLC_SLOT: int = 1

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./grp_test.db"
    DATABASE_SYNC_URL: str = "sqlite:///./grp_test.db"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # WebSocket
    WS_UPDATE_INTERVAL: float = 0.1  # 100ms

    # Safety Limits
    MAX_FORCE: float = 200.0  # kN
    MAX_STROKE: float = 500.0  # mm
    MIN_SPEED: float = 1.0  # mm/min
    MAX_SPEED: float = 100.0  # mm/min

    class Config:
        env_file = ".env"


settings = Settings()
