"""
Unified application configuration.
All values can be overridden via .env file or environment variables.
"""

from __future__ import annotations

import torch
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "127.0.0.1"
    PORT: int = 8001
    DEBUG: bool = False

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = ["*"]

    # ── Storage ───────────────────────────────────────────────────────────────
    UPLOAD_DIR: Path = Path("uploads")
    OUTPUT_DIR: Path = Path("outputs")
    MAX_UPLOAD_SIZE_MB: int = 500

    # ── HU window presets ─────────────────────────────────────────────────────
    HU_BONE_MIN: int = 200
    HU_BONE_MAX: int = 2000
    HU_SOFT_TISSUE_MIN: int = -200
    HU_SOFT_TISSUE_MAX: int = 500
    HU_LUNG_MIN: int = -1000
    HU_LUNG_MAX: int = -500

    # ── Marching Cubes ────────────────────────────────────────────────────────
    DEFAULT_ISO_VALUE: float = 150.0

    # ── VTK mesh post-processing ──────────────────────────────────────────────
    SMOOTHING_ITERATIONS: int = 15
    SMOOTHING_RELAXATION: float = 0.1
    DECIMATION_REDUCTION: float = 0.5

    # ── AI model (MONAI UNet) ─────────────────────────────────────────────────
    MODEL_WEIGHTS_PATH: Optional[str] = None   # path to .pth weights file
    MODEL_SPATIAL_DIMS: int = 2
    MODEL_IN_CHANNELS: int = 1
    MODEL_OUT_CHANNELS: int = 1
    SEGMENTATION_THRESHOLD: float = 0.5
    INFERENCE_BATCH_SIZE: int = 2

    # ── Concurrency ───────────────────────────────────────────────────────────
    MAX_CONCURRENT_JOBS: int = 3

    @field_validator("UPLOAD_DIR", "OUTPUT_DIR", mode="before")
    @classmethod
    def make_path(cls, v):
        return Path(v)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# ── Device (CPU forced – change to "cuda" in .env if GPU available) ──────────
DEVICE = torch.device("cpu")

# ── Anonymization tag map (from your original config.py) ─────────────────────
# PatientID and PatientSex are intentionally kept as-is.
ANONYMIZE_TAGS: Dict[Tuple[int, int], str] = {
    (0x0010, 0x0010): "ANONYMOUS",         # PatientName
    (0x0010, 0x0030): "19000101",          # PatientBirthDate
    (0x0010, 0x1010): "",                  # PatientAge
    (0x0008, 0x0020): "19000101",          # StudyDate
    (0x0008, 0x0030): "000000",            # StudyTime
    (0x0008, 0x0050): "",                  # AccessionNumber
    (0x0008, 0x0080): "",                  # InstitutionName
    (0x0008, 0x0090): "",                  # ReferringPhysicianName
    (0x0008, 0x1070): "",                  # OperatorsName
    (0x0020, 0x000D): "1.2.3.4.5.6.7.8.9.0",  # StudyInstanceUID
    (0x0020, 0x000E): "1.2.3.4.5.6.7.8.9.1",  # SeriesInstanceUID
}
