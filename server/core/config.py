"""
Application configuration loaded from environment variables.
"""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = ["*"]

    # ── File storage ──────────────────────────────────────────────────────────
    UPLOAD_DIR: Path = Path("uploads")
    OUTPUT_DIR: Path = Path("outputs")
    MAX_UPLOAD_SIZE_MB: int = 500          # zip payload limit

    # ── Segmentation defaults ─────────────────────────────────────────────────
    # Hounsfield Unit window presets
    HU_BONE_MIN: int = 200
    HU_BONE_MAX: int = 1500
    HU_SOFT_TISSUE_MIN: int = -100
    HU_SOFT_TISSUE_MAX: int = 300
    HU_LUNG_MIN: int = -1000
    HU_LUNG_MAX: int = -500

    # Marching-cubes iso-surface value
    DEFAULT_ISO_VALUE: float = 300.0

    # VTK smoothing iterations
    SMOOTHING_ITERATIONS: int = 15
    SMOOTHING_RELAXATION: float = 0.1

    # Mesh decimation (0 = off, 1 = remove everything)
    DECIMATION_REDUCTION: float = 0.5

    # ── Background task workers ───────────────────────────────────────────────
    MAX_CONCURRENT_JOBS: int = 3

    @field_validator("UPLOAD_DIR", "OUTPUT_DIR", mode="before")
    @classmethod
    def make_path(cls, v):
        return Path(v)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
