"""
API Routes
==========
Two-step flow  (from your original endpoints.py):
  POST /upload-metadata        – upload ZIP, get metadata back immediately
  POST /start-processing       – trigger full pipeline on cached upload

Single-shot flow  (from new service):
  POST /upload                 – upload ZIP + start everything in one call

Polling / downloads:
  GET  /jobs/{job_id}                    – poll progress
  GET  /jobs/{job_id}/download/mesh      – download STL/OBJ/PLY/VTK
  GET  /jobs/{job_id}/download/nifti     – download NIfTI mask
  GET  /jobs/{job_id}/download/preview   – download PNG preview

Admin:
  GET    /jobs                 – list all jobs
  DELETE /jobs/{job_id}        – delete job + files

Legacy-compatible:
  GET  /status/{job_id}        – simple state string (for old front-end)
  GET  /result/{job_id}        – full result (for old front-end) – FIXED
  GET  /list-segmentations     – list output files
  GET  /health
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse

from core.config import settings
from models.schemas import (
    JobStatus,
    JobStatusResponse,
    OutputFormat,
    SegmentationConfig,
    StartProcessingResponse,
    TissueType,
    UploadMetadataResponse,
)
from services import job_manager

router = APIRouter()
logger = logging.getLogger(__name__)

_MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ─────────────────────────────────────────────────────────────────────────────
# Two-step flow
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/upload-metadata",
    response_model=UploadMetadataResponse,
    summary="Step 1 – Upload ZIP and get metadata (no processing yet)",
    tags=["Two-Step Pipeline"],
)
async def upload_metadata(
    file: UploadFile = File(...),
    anonymize: bool = Form(True),
):
    """
    Upload a ZIP of DICOM files.
    Returns patient metadata and volume shape immediately.
    Call /start-processing with the returned file_id to begin reconstruction.
    """
    _validate_zip(file)
    zip_bytes = await file.read()
    _check_size(zip_bytes)

    try:
        file_id, metadata, volume_shape = job_manager.store_temp_file(zip_bytes, anonymize)
    except Exception as exc:
        raise HTTPException(400, f"Failed to read DICOM files: {exc}")

    return UploadMetadataResponse(
        file_id=file_id,
        metadata=metadata,
        volume_shape=volume_shape,
    )


@router.post(
    "/start-processing",
    response_model=StartProcessingResponse,
    summary="Step 2 – Trigger full pipeline on previously uploaded file",
    tags=["Two-Step Pipeline"],
)
async def start_processing(
    file_id: str = Form(...),
    tissue_type: TissueType = Form(TissueType.bone),
    hu_min: int | None = Form(None),
    hu_max: int | None = Form(None),
    iso_value: float | None = Form(None),
    output_format: OutputFormat = Form(OutputFormat.stl),
    apply_smoothing: bool = Form(True),
    apply_decimation: bool = Form(True),
    decimation_reduction: float | None = Form(None),
    use_ai: bool = Form(False),
    anonymize: bool = Form(True),
):
    config = SegmentationConfig(
        tissue_type=tissue_type,
        hu_min=hu_min,
        hu_max=hu_max,
        iso_value=iso_value,
        output_format=output_format,
        apply_smoothing=apply_smoothing,
        apply_decimation=apply_decimation,
        decimation_reduction=decimation_reduction,
        use_ai=use_ai,
        anonymize=anonymize,
    )

    job_id = job_manager.create_job()
    try:
        await job_manager.submit_job_from_file(job_id, file_id, config)
    except ValueError as exc:
        raise HTTPException(404, str(exc))

    return StartProcessingResponse(
        job_id=job_id,
        status=JobStatus.queued,
        message="Job queued. Poll /api/v1/jobs/{job_id} for status.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Single-shot flow
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=StartProcessingResponse,
    summary="Upload ZIP and start processing in one call",
    tags=["Single-Shot Pipeline"],
)
async def upload_and_process(
    file: UploadFile = File(...),
    tissue_type: TissueType = Form(TissueType.bone),
    hu_min: int | None = Form(None),
    hu_max: int | None = Form(None),
    iso_value: float | None = Form(None),
    output_format: OutputFormat = Form(OutputFormat.stl),
    apply_smoothing: bool = Form(True),
    apply_decimation: bool = Form(True),
    decimation_reduction: float | None = Form(None),
    use_ai: bool = Form(False),
    anonymize: bool = Form(True),
):
    _validate_zip(file)
    zip_bytes = await file.read()
    _check_size(zip_bytes)

    config = SegmentationConfig(
        tissue_type=tissue_type,
        hu_min=hu_min,
        hu_max=hu_max,
        iso_value=iso_value,
        output_format=output_format,
        apply_smoothing=apply_smoothing,
        apply_decimation=apply_decimation,
        decimation_reduction=decimation_reduction,
        use_ai=use_ai,
        anonymize=anonymize,
    )

    job_id = job_manager.create_job()
    await job_manager.submit_job(job_id, zip_bytes, config)

    return StartProcessingResponse(
        job_id=job_id,
        status=JobStatus.queued,
        message="Job queued. Poll /api/v1/jobs/{job_id} for status.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Job status & polling
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Poll job status and result",
    tags=["Polling"],
)
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found")
    return job


# Legacy simple status (your original /status/{job_id})
@router.get("/status/{job_id}", summary="Simple status string (legacy)", tags=["Polling"])
async def get_status_legacy(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        return {"job_id": job_id, "state": "pending"}
    if job.status == JobStatus.completed:
        return {"job_id": job_id, "state": "completed"}
    if job.status == JobStatus.failed:
        return {"job_id": job_id, "state": "failed", "error": job.message}
    return {"job_id": job_id, "state": job.status.value, "progress": job.progress}


# ─────────────────────────────────────────────────────────────────────────────
# FIXED LEGACY RESULT ENDPOINT – returns flat fields for frontend preview
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/result/{job_id}", summary="Full result when job is complete (legacy)", tags=["Polling"])
async def get_result_legacy(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.completed:
        raise HTTPException(400, "Result not ready yet")
    
    result = job.result
    if result is None:
        raise HTTPException(500, "Result object missing")
    
    metadata = result.metadata
    stats = result.statistics or {}
    
    # Volume shape
    shape = metadata.volume_shape or [0, 0, 0]
    dim_z, dim_y, dim_x = shape[0], shape[1], shape[2] if len(shape) >= 3 else (0,0,0)
    
    # Bone volume (cc)
    voxel_volume_mm3 = 1.0
    if metadata.pixel_spacing and len(metadata.pixel_spacing) >= 2:
        spacing_x = float(metadata.pixel_spacing[0]) if metadata.pixel_spacing[0] else 1.0
        spacing_y = float(metadata.pixel_spacing[1]) if metadata.pixel_spacing[1] else 1.0
        spacing_z = float(metadata.slice_thickness) if metadata.slice_thickness else 1.0
        voxel_volume_mm3 = spacing_x * spacing_y * spacing_z
    voxel_count = stats.get("voxels_final", 0)
    bone_volume_cc = (voxel_count * voxel_volume_mm3) / 1000.0
    
    # URLs
    mesh_url = f"/jobs/{job_id}/download/mesh"
    nifti_url = f"/jobs/{job_id}/download/nifti"
    preview_url = f"/jobs/{job_id}/download/preview"
    
    # Build response with multiple formats
    response = {
        "dimensions": f"{dim_x} x {dim_y} x {dim_z}",
        "dim_x": dim_x, "dim_y": dim_y, "dim_z": dim_z,
        "volume_shape": [dim_z, dim_y, dim_x],
        "bone_volume": round(bone_volume_cc, 2),
        "total_slices": metadata.slice_count,
        "patient_name": metadata.patient_name or "ANONYMOUS",
        "modality": metadata.modality or "CT",
        "study_date": metadata.study_date or "19000101",
        "mesh_url": mesh_url,
        "nifti_url": nifti_url,
        "preview_url": preview_url,
        "stl_url": mesh_url,
        "nifti_download_url": nifti_url,
        "preview_image_url": preview_url,
        "statistics": stats,
        "metadata": metadata.model_dump() if hasattr(metadata, "model_dump") else metadata.__dict__,
    }
    
    # Log the response (check your server console)
    logger.info(f"🔍 Legacy result for {job_id}:")
    logger.info(f"   dimensions = {response['dimensions']}")
    logger.info(f"   bone_volume = {response['bone_volume']} cc")
    logger.info(f"   mesh_url = {response['mesh_url']}")
    
    return response


# ─────────────────────────────────────────────────────────────────────────────
# Downloads
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}/download/mesh", summary="Download 3D mesh file", tags=["Downloads"])
async def download_mesh(job_id: str):
    _require_completed(job_id)
    out_dir = settings.OUTPUT_DIR / job_id
    mesh_files = list(out_dir.glob("model.*"))
    if not mesh_files:
        raise HTTPException(404, "Mesh file not found")
    path = mesh_files[0]
    return FileResponse(str(path), filename=path.name, media_type="application/octet-stream")


@router.get("/jobs/{job_id}/download/nifti", summary="Download NIfTI segmentation mask", tags=["Downloads"])
async def download_nifti(job_id: str):
    _require_completed(job_id)
    out_dir = settings.OUTPUT_DIR / job_id
    nifti_files = list(out_dir.glob("*.nii.gz"))
    if not nifti_files:
        raise HTTPException(404, "NIfTI file not found")
    path = nifti_files[0]
    return FileResponse(str(path), filename=path.name, media_type="application/octet-stream")


@router.get("/jobs/{job_id}/download/preview", summary="Download PNG preview render", tags=["Downloads"])
async def download_preview(job_id: str):
    _require_completed(job_id)
    path = settings.OUTPUT_DIR / job_id / "preview.png"
    if not path.exists():
        raise HTTPException(404, "Preview not available")
    return FileResponse(str(path), filename="preview.png", media_type="image/png")


# ─────────────────────────────────────────────────────────────────────────────
# FIXED LEGACY DOWNLOADS – accept optional job_id query parameter
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/download-stl/{filename}", summary="Download STL by filename (legacy)", tags=["Downloads"])
async def download_stl_legacy(filename: str, job_id: str = Query(None, description="Job ID to restrict search")):
    return _safe_file_response(filename, job_id)


@router.get("/download-nifti/{filename}", summary="Download NIfTI by filename (legacy)", tags=["Downloads"])
async def download_nifti_legacy(filename: str, job_id: str = Query(None, description="Job ID to restrict search")):
    return _safe_file_response(filename, job_id)


# ─────────────────────────────────────────────────────────────────────────────
# Admin / listing
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/jobs", summary="List all jobs", tags=["Admin"])
async def list_jobs():
    jobs = job_manager.list_jobs()
    return {
        "total": len(jobs),
        "jobs": [
            {
                "job_id":   j.job_id,
                "status":   j.status,
                "progress": j.progress,
                "message":  j.message,
            }
            for j in jobs.values()
        ],
    }


@router.delete("/jobs/{job_id}", summary="Delete job and output files", tags=["Admin"])
async def delete_job(job_id: str):
    if not job_manager.delete_job(job_id):
        raise HTTPException(404, f"Job '{job_id}' not found")
    return {"message": f"Job '{job_id}' deleted"}


@router.get("/list-segmentations", summary="List all output files (legacy)", tags=["Admin"])
async def list_segmentations():
    files = []
    output_dir = settings.OUTPUT_DIR
    if output_dir.exists():
        for f in output_dir.rglob("*"):
            if f.is_file() and f.suffix in {".stl", ".obj", ".ply", ".npy", ".json"}  \
                    or (f.is_file() and str(f).endswith(".nii.gz")):
                files.append({
                    "filename":   f.name,
                    "job_id":     f.parent.name,
                    "size_bytes": f.stat().st_size,
                    "size_kb":    round(f.stat().st_size / 1024, 2),
                    "modified":   f.stat().st_mtime,
                })
    files.sort(key=lambda x: x["modified"], reverse=True)
    return {"segmentations": files, "count": len(files), "directory": str(output_dir)}


@router.get("/health", summary="Health check", tags=["Health"])
async def health_check():
    return {"status": "healthy"}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _validate_zip(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are accepted")


def _check_size(data: bytes) -> None:
    if len(data) > _MAX_BYTES:
        raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")


def _require_completed(job_id: str) -> None:
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found")
    if job.status != JobStatus.completed:
        raise HTTPException(409, "Job not yet completed")


def _safe_file_response(filename: str, job_id: str = None) -> FileResponse:
    if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
        raise HTTPException(400, "Invalid filename")
    
    # If job_id is given, only search that job's folder
    if job_id:
        job_dir = settings.OUTPUT_DIR / job_id
        if job_dir.exists():
            target = job_dir / filename
            if target.is_file():
                return FileResponse(str(target), filename=filename, media_type="application/octet-stream")
        raise HTTPException(404, f"File '{filename}' not found in job '{job_id}'")
    
    # Legacy recursive search (backward compatibility)
    for path in settings.OUTPUT_DIR.rglob(filename):
        if path.is_file():
            return FileResponse(str(path), filename=filename, media_type="application/octet-stream")
    raise HTTPException(404, f"File not found: {filename}")