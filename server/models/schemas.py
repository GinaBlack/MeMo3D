"""
Pydantic request / response schemas.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Enumerations ──────────────────────────────────────────────────────────────

class TissueType(str, Enum):
    bone        = "bone"
    soft_tissue = "soft_tissue"
    lung        = "lung"
    custom      = "custom"


class OutputFormat(str, Enum):
    stl  = "stl"
    obj  = "obj"
    ply  = "ply"
    vtk  = "vtk"


class JobStatus(str, Enum):
    queued     = "queued"
    processing = "processing"
    completed  = "completed"
    failed     = "failed"


# ── Request bodies ────────────────────────────────────────────────────────────

class SegmentationConfig(BaseModel):
    tissue_type: TissueType = Field(
        TissueType.bone,
        description="Tissue preset to segment",
    )
    hu_min: Optional[int] = Field(
        None,
        description="Custom HU minimum (only used when tissue_type=custom)",
    )
    hu_max: Optional[int] = Field(
        None,
        description="Custom HU maximum (only used when tissue_type=custom)",
    )
    iso_value: Optional[float] = Field(
        None,
        description="Marching-cubes iso-surface value (overrides tissue preset)",
    )
    output_format: OutputFormat = Field(
        OutputFormat.stl,
        description="3-D mesh output format",
    )
    apply_smoothing: bool = Field(True, description="Laplacian smoothing pass")
    apply_decimation: bool = Field(True, description="Mesh decimation pass")
    decimation_reduction: Optional[float] = Field(
        None,
        ge=0.0,
        le=0.95,
        description="Fraction of triangles to remove (0–0.95)",
    )


# ── Response bodies ───────────────────────────────────────────────────────────

class DicomMetadata(BaseModel):
    patient_name: Optional[str]
    patient_id: Optional[str]
    study_date: Optional[str]
    modality: Optional[str]
    series_description: Optional[str]
    slice_count: int
    pixel_spacing: Optional[List[float]]
    slice_thickness: Optional[float]
    rows: Optional[int]
    columns: Optional[int]
    volume_shape: Optional[List[int]]


class SegmentationResult(BaseModel):
    job_id: str
    status: JobStatus
    tissue_type: TissueType
    mesh_file: Optional[str]         = None   # relative URL to download
    preview_file: Optional[str]      = None   # PNG screenshot URL
    metadata: Optional[DicomMetadata] = None
    statistics: Optional[Dict[str, Any]] = None
    error: Optional[str]             = None
    processing_time_s: Optional[float] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = Field(0, ge=0, le=100)
    message: str  = ""
    result: Optional[SegmentationResult] = None


class UploadResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str
    slice_count: Optional[int] = None
    metadata: Optional[DicomMetadata] = None
