"""
Job Manager
===========
In-memory async job store + background worker.
Supports both the two-step (upload-metadata / start-processing) flow
and the single-shot /upload flow.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import tempfile
import time
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict, Optional

from core.config import settings
from models.schemas import (
    DicomMetadata,
    JobStatus,
    JobStatusResponse,
    SegmentationConfig,
    SegmentationResult,
    TissueType,
)
from services.dicom_loader import extract_dicom_from_zip, discover_dicom_files, load_dicom_series
from services.file_utils import save_segmentation_results
from services.reconstruction import reconstruct_3d
from services.segmentation import run_ai_inference, segment_volume

logger = logging.getLogger(__name__)

# ── In-memory stores ──────────────────────────────────────────────────────────
_jobs: Dict[str, JobStatusResponse] = {}
_temp_files: Dict[str, Dict[str, Any]] = {}   # file_id → {path, anonymize}
_semaphore: Optional[asyncio.Semaphore] = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_JOBS)
    return _semaphore


# ── CRUD helpers ──────────────────────────────────────────────────────────────

def create_job() -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = JobStatusResponse(
        job_id=job_id,
        status=JobStatus.queued,
        progress=0,
        message="Job created",
    )
    return job_id


def get_job(job_id: str) -> Optional[JobStatusResponse]:
    return _jobs.get(job_id)


def list_jobs() -> Dict[str, JobStatusResponse]:
    return dict(_jobs)


def delete_job(job_id: str) -> bool:
    if job_id not in _jobs:
        return False
    for base in (settings.OUTPUT_DIR / job_id, settings.UPLOAD_DIR / job_id):
        if base.exists():
            shutil.rmtree(base, ignore_errors=True)
    del _jobs[job_id]
    return True


def _update(
    job_id: str,
    *,
    status: Optional[JobStatus] = None,
    progress: Optional[int] = None,
    message: Optional[str] = None,
    result: Optional[SegmentationResult] = None,
) -> None:
    job = _jobs.get(job_id)
    if not job:
        return
    if status   is not None: job.status   = status
    if progress is not None: job.progress = progress
    if message  is not None: job.message  = message
    if result   is not None: job.result   = result


# ── Two-step helpers (upload-metadata / start-processing) ─────────────────────

def store_temp_file(zip_bytes: bytes, anonymize: bool) -> tuple[str, DicomMetadata, list]:
    """
    Save ZIP to a temp file, extract volume + metadata, return (file_id, metadata, volume_shape).
    Called from the /upload-metadata endpoint.
    """
    file_id  = str(uuid.uuid4())
    tmp_path = Path(tempfile.gettempdir()) / f"{file_id}.zip"
    tmp_path.write_bytes(zip_bytes)

    volume, metadata = extract_dicom_from_zip(zip_bytes, anonymize=anonymize)
    _temp_files[file_id] = {"path": str(tmp_path), "anonymize": anonymize}

    logger.info("[temp:%s] ZIP cached – %d slices, shape %s", file_id, volume.shape[0], volume.shape)
    return file_id, metadata, list(volume.shape)


def pop_temp_file(file_id: str) -> Optional[Dict[str, Any]]:
    return _temp_files.pop(file_id, None)


# ── Core pipeline (blocking – runs in executor thread) ────────────────────────

def _run_pipeline_sync(
    job_id: str,
    zip_bytes: bytes,
    config: SegmentationConfig,
) -> None:
    t0 = time.perf_counter()

    try:
        # 1. Load volume from ZIP bytes
        _update(job_id, status=JobStatus.processing, progress=10, message="Loading DICOM slices …")
        volume, metadata = extract_dicom_from_zip(zip_bytes, anonymize=config.anonymize)
        logger.info("[%s] Volume loaded: %s", job_id, volume.shape)

        # 2. Segment
        _update(job_id, progress=30, message="Segmenting tissue …")
        if config.use_ai:
            _update(job_id, message="Running AI inference …")
            mask, seg_stats = run_ai_inference(volume)
        else:
            mask, seg_stats = segment_volume(volume, config)

        # Apply mask to volume for reconstruction
        masked_volume = np.where(mask, volume, float(volume.min()))

        # 3. Save NIfTI / NPY outputs
        _update(job_id, progress=55, message="Saving segmentation files …")
        meta_dict = metadata.model_dump() if hasattr(metadata, "model_dump") else metadata.__dict__
        saved = save_segmentation_results(
            mask.astype(np.uint8), np.zeros_like(volume, dtype=np.float32),
            meta_dict, volume.shape, job_id,
        )

        # 4. 3-D reconstruction
        _update(job_id, progress=65, message="Running 3D reconstruction …")
        mesh_path, preview_path, mesh_stats = reconstruct_3d(
            masked_volume, config, job_id,
            pixel_spacing=metadata.pixel_spacing,
            slice_thickness=metadata.slice_thickness,
        )
                

        # 5. Done
        elapsed = time.perf_counter() - t0
        _update(
            job_id,
            status=JobStatus.completed,
            progress=100,
            message="Completed successfully.",
            result=SegmentationResult(
                job_id=job_id,
                status=JobStatus.completed,
                tissue_type=config.tissue_type,
                mesh_file=f"/api/v1/jobs/{job_id}/download/mesh",
                nifti_file=f"/api/v1/jobs/{job_id}/download/nifti",
                preview_file=(
                    f"/api/v1/jobs/{job_id}/download/preview"
                    if preview_path and preview_path.exists() else None
                ),
                metadata=metadata,
                statistics={**seg_stats, **mesh_stats},
                processing_time_s=round(elapsed, 2),
            ),
        )
        logger.info("[%s] Pipeline done in %.2f s", job_id, elapsed)

    except Exception as exc:
        logger.exception("[%s] Pipeline error: %s", job_id, exc)
        _update(
            job_id,
            status=JobStatus.failed,
            progress=0,
            message=f"Error: {exc}",
            result=SegmentationResult(
                job_id=job_id,
                status=JobStatus.failed,
                tissue_type=config.tissue_type,
                error=str(exc),
            ),
        )


import numpy as np   # noqa: E402  (needed by _run_pipeline_sync above)


# ── Async entry points ────────────────────────────────────────────────────────

async def submit_job(
    job_id: str,
    zip_bytes: bytes,
    config: SegmentationConfig,
) -> None:
    """Submit a single-shot job (ZIP bytes passed directly)."""
    sem  = _get_semaphore()
    loop = asyncio.get_event_loop()

    async def _worker():
        async with sem:
            await loop.run_in_executor(
                None, _run_pipeline_sync, job_id, zip_bytes, config
            )

    asyncio.create_task(_worker())
    logger.info("[%s] Job submitted", job_id)


async def submit_job_from_file(
    job_id: str,
    file_id: str,
    config: SegmentationConfig,
) -> None:
    """Submit a job from a previously cached temp file (two-step flow)."""
    file_info = pop_temp_file(file_id)
    if not file_info:
        raise ValueError(f"No temp file found for file_id={file_id}")

    zip_path = Path(file_info["path"])
    zip_bytes = zip_path.read_bytes()
    try:
        zip_path.unlink(missing_ok=True)
    except Exception:
        pass

    await submit_job(job_id, zip_bytes, config)
