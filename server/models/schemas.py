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
    all         = "all"


class OutputFormat(str, Enum):
    stl = "stl"
    obj = "obj"
    ply = "ply"
    vtk = "vtk"


class JobStatus(str, Enum):
    queued     = "queued"
    processing = "processing"
    completed  = "completed"
    failed     = "failed"


# ── Segmentation config ───────────────────────────────────────────────────────

class SegmentationConfig(BaseModel):
    tissue_type: TissueType = Field(TissueType.soft_tissue, description="Tissue preset")
    hu_min: Optional[int]   = Field(None, description="Custom HU min (tissue_type=custom only)")
    hu_max: Optional[int]   = Field(None, description="Custom HU max (tissue_type=custom only)")
    iso_value: Optional[float] = Field(None, description="Marching Cubes iso-surface override")
    output_format: OutputFormat = Field(OutputFormat.stl, description="Mesh output format")
    apply_smoothing: bool   = Field(True,  description="Laplacian smoothing")
    apply_decimation: bool  = Field(True,  description="Mesh decimation")
    decimation_reduction: Optional[float] = Field(None, ge=0.0, le=0.95)
    use_ai: bool            = Field(False, description="Use MONAI UNet AI model instead of HU threshold")
    anonymize: bool         = Field(True,  description="Anonymize DICOM patient data")


# ── DICOM metadata ────────────────────────────────────────────────────────────

class DicomMetadata(BaseModel):
    # Core identifiers
    patient_name: Optional[str]
    patient_id: Optional[str]
    patient_birth_date: Optional[str]
    patient_sex: Optional[str]
    patient_age: Optional[str]
    # Study info
    study_date: Optional[str]
    study_time: Optional[str]
    study_id: Optional[str]
    study_description: Optional[str]
    accession_number: Optional[str]
    # Series info
    modality: Optional[str]
    series_number: Optional[str]
    series_description: Optional[str]
    # Scanner info
    manufacturer: Optional[str]
    institution_name: Optional[str]
    kvp: Optional[str]
    exposure: Optional[str]
    # Geometry
    slice_count: int
    pixel_spacing: Optional[List[float]]
    slice_thickness: Optional[float]
    rows: Optional[int]
    columns: Optional[int]
    volume_shape: Optional[List[int]]
    # Window
    window_center: Optional[str]
    window_width: Optional[str]
    # Other
    body_part: Optional[str]
    patient_position: Optional[str]
    protocol_name: Optional[str]
    contrast_agent: Optional[str]


# ── Job tracking ──────────────────────────────────────────────────────────────

class SegmentationResult(BaseModel):
    job_id: str
    status: JobStatus
    tissue_type: TissueType
    mesh_file: Optional[str]           = None
    nifti_file: Optional[str]          = None
    preview_file: Optional[str]        = None
    metadata: Optional[DicomMetadata]  = None
    statistics: Optional[Dict[str, Any]] = None
    error: Optional[str]               = None
    processing_time_s: Optional[float] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = Field(0, ge=0, le=100)
    message: str  = ""
    result: Optional[SegmentationResult] = None


# ── Upload / two-step responses ───────────────────────────────────────────────

class UploadMetadataResponse(BaseModel):
    file_id: str
    metadata: DicomMetadata
    volume_shape: List[int]


class StartProcessingResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str
