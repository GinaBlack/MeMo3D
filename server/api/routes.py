"""
API Routes
==========
POST  /upload                – Accept ZIP, queue pipeline job
GET   /jobs/{job_id}         – Poll job status / progress
GET   /jobs/{job_id}/download/mesh    – Download finished mesh
GET   /jobs/{job_id}/download/preview – Download preview PNG
GET   /jobs                  – List all jobs (dev/debug)
DELETE /jobs/{job_id}        – Delete job outputs
"""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings
from app.models.schemas import (
    JobStatus,
    JobStatusResponse,
    OutputFormat,
    SegmentationConfig,
    TissueType,
    UploadResponse,
)
from app.services.job_manager import create_job, get_job, submit_job

router = APIRouter()
logger = logging.getLogger(__name__)

_MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload DICOM ZIP and start processing",
    tags=["Pipeline"],
)
async def upload_dicom_zip(
    file: UploadFile = File(..., description="ZIP archive containing DICOM CT slices"),
    tissue_type: TissueType = Form(TissueType.bone),
    hu_min: int | None = Form(None),
    hu_max: int | None = Form(None),
    iso_value: float | None = Form(None),
    output_format: OutputFormat = Form(OutputFormat.stl),
    apply_smoothing: bool = Form(True),
    apply_decimation: bool = Form(True),
    decimation_reduction: float | None = Form(None),
):
    # ── basic validation ──────────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(400, "No filename provided.")
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are accepted.")

    # ── size guard ────────────────────────────────────────────────────────────
    contents = await file.read()
    if len(contents) > _MAX_BYTES:
        raise HTTPException(
            413,
            f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # ── save zip ──────────────────────────────────────────────────────────────
    job_id = create_job()
    upload_path = settings.UPLOAD_DIR / job_id
    upload_path.mkdir(parents=True, exist_ok=True)
    zip_path = upload_path / "upload.zip"
    zip_path.write_bytes(contents)

    logger.info(
        "[%s] Received %s (%.1f MB)",
        job_id,
        file.filename,
        len(contents) / 1_048_576,
    )

    # ── build config ──────────────────────────────────────────────────────────
    config = SegmentationConfig(
        tissue_type=tissue_type,
        hu_min=hu_min,
        hu_max=hu_max,
        iso_value=iso_value,
        output_format=output_format,
        apply_smoothing=apply_smoothing,
        apply_decimation=apply_decimation,
        decimation_reduction=decimation_reduction,
    )

    # ── submit async job ──────────────────────────────────────────────────────
    await submit_job(job_id, zip_path, config)

    return UploadResponse(
        job_id=job_id,
        status=JobStatus.queued,
        message="Job queued. Poll /api/v1/jobs/{job_id} for status.",
    )


# ── Status polling ────────────────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Get job status and result",
    tags=["Pipeline"],
)
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    return job


# ── Downloads ─────────────────────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}/download/mesh",
    summary="Download the generated 3-D mesh",
    tags=["Pipeline"],
)
async def download_mesh(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    if job.status != JobStatus.completed or job.result is None:
        raise HTTPException(409, "Job not yet completed.")

    # Find the mesh file in the output directory
    out_dir = settings.OUTPUT_DIR / job_id
    mesh_files = list(out_dir.glob("model.*"))
    if not mesh_files:
        raise HTTPException(404, "Mesh file not found on disk.")

    mesh_path = mesh_files[0]
    return FileResponse(
        str(mesh_path),
        filename=mesh_path.name,
        media_type="application/octet-stream",
    )


@router.get(
    "/jobs/{job_id}/download/preview",
    summary="Download the PNG preview render",
    tags=["Pipeline"],
)
async def download_preview(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    if job.status != JobStatus.completed:
        raise HTTPException(409, "Job not yet completed.")

    preview_path = settings.OUTPUT_DIR / job_id / "preview.png"
    if not preview_path.exists():
        raise HTTPException(404, "Preview not available (off-screen rendering may be unsupported).")

    return FileResponse(str(preview_path), filename="preview.png", media_type="image/png")


# ── List / delete (admin helpers) ─────────────────────────────────────────────

@router.get(
    "/jobs",
    summary="List all jobs",
    tags=["Admin"],
)
async def list_jobs():
    from app.services.job_manager import _jobs  # internal access for admin
    return {
        "total": len(_jobs),
        "jobs": [
            {
                "job_id":   j.job_id,
                "status":   j.status,
                "progress": j.progress,
                "message":  j.message,
            }
            for j in _jobs.values()
        ],
    }


@router.delete(
    "/jobs/{job_id}",
    summary="Delete job and all associated files",
    tags=["Admin"],
)
async def delete_job(job_id: str):
    from app.services.job_manager import _jobs
    if job_id not in _jobs:
        raise HTTPException(404, f"Job '{job_id}' not found.")

    # Remove output files
    for base in (settings.OUTPUT_DIR / job_id, settings.UPLOAD_DIR / job_id):
        if base.exists():
            shutil.rmtree(base, ignore_errors=True)

    del _jobs[job_id]
    return {"message": f"Job '{job_id}' deleted."}
