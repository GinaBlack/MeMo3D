"""
Job Manager
===========
Lightweight in-memory job store + async background worker.
For production, swap the dict for Redis / a database.
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import time
import uuid
import zipfile
from pathlib import Path
from typing import Dict, Optional

from app.core.config import settings
from app.models.schemas import (
    DicomMetadata,
    JobStatus,
    JobStatusResponse,
    SegmentationConfig,
    SegmentationResult,
)
from app.services.dicom_loader import discover_dicom_files, load_dicom_series
from app.services.reconstruction import reconstruct_3d
from app.services.segmentation import segment_volume

logger = logging.getLogger(__name__)

# ── in-memory store ───────────────────────────────────────────────────────────
_jobs: Dict[str, JobStatusResponse] = {}
_semaphore: Optional[asyncio.Semaphore] = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_JOBS)
    return _semaphore


# ── helpers ───────────────────────────────────────────────────────────────────

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


def _update(
    job_id: str,
    *,
    status: Optional[JobStatus] = None,
    progress: Optional[int] = None,
    message: Optional[str] = None,
    result: Optional[SegmentationResult] = None,
) -> None:
    job = _jobs.get(job_id)
    if job is None:
        return
    if status   is not None: job.status   = status
    if progress is not None: job.progress = progress
    if message  is not None: job.message  = message
    if result   is not None: job.result   = result


# ── core pipeline (runs in executor / thread) ──────────────────────────────

def _run_pipeline_sync(
    job_id: str,
    zip_path: Path,
    config: SegmentationConfig,
) -> None:
    """Blocking pipeline – DICOM load → segmentation → 3-D reconstruction."""
    t0 = time.perf_counter()
    work_dir = settings.UPLOAD_DIR / job_id
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        # ── 1 Unzip ──────────────────────────────────────────────────────────
        _update(job_id, status=JobStatus.processing, progress=5, message="Extracting ZIP …")
        extract_dir = work_dir / "dicom"
        extract_dir.mkdir(exist_ok=True)
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)
        logger.info("[%s] ZIP extracted to %s", job_id, extract_dir)

        # ── 2 Discover DICOM files ────────────────────────────────────────────
        _update(job_id, progress=10, message="Discovering DICOM files …")
        dicom_files = discover_dicom_files(extract_dir)
        if not dicom_files:
            raise ValueError("No valid DICOM files found in the uploaded ZIP.")

        # ── 3 Load series ─────────────────────────────────────────────────────
        _update(job_id, progress=20, message=f"Loading {len(dicom_files)} DICOM slices …")
        volume, metadata = load_dicom_series(dicom_files)

        # ── 4 Segment ────────────────────────────────────────────────────────
        _update(job_id, progress=40, message="Segmenting tissue …")
        mask, seg_stats = segment_volume(volume, config)

        # Apply mask – zero out voxels outside the segment, keep HU elsewhere
        masked_volume = np.where(mask, volume, volume.min())

        # ── 5 Reconstruct 3-D mesh ───────────────────────────────────────────
        _update(job_id, progress=60, message="Running Marching Cubes …")
        mesh_path, preview_path, mesh_stats = reconstruct_3d(
            masked_volume,
            config,
            job_id,
            pixel_spacing=metadata.pixel_spacing,
            slice_thickness=metadata.slice_thickness,
        )

        # ── 6 Build result ────────────────────────────────────────────────────
        _update(job_id, progress=95, message="Finalising …")
        elapsed = time.perf_counter() - t0

        result = SegmentationResult(
            job_id=job_id,
            status=JobStatus.completed,
            tissue_type=config.tissue_type,
            mesh_file=f"/api/v1/jobs/{job_id}/download/mesh",
            preview_file=f"/api/v1/jobs/{job_id}/download/preview"
            if preview_path and preview_path.exists()
            else None,
            metadata=metadata,
            statistics={**seg_stats, **mesh_stats},
            processing_time_s=round(elapsed, 2),
        )

        _update(
            job_id,
            status=JobStatus.completed,
            progress=100,
            message="Completed successfully.",
            result=result,
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
    finally:
        # Clean up raw upload to save disk space
        try:
            shutil.rmtree(work_dir / "dicom", ignore_errors=True)
            zip_path.unlink(missing_ok=True)
        except Exception:
            pass


# Lazy import to avoid circular at module level
import numpy as np  # noqa: E402  (imported here for _run_pipeline_sync)


# ── async entry point ─────────────────────────────────────────────────────────

async def submit_job(
    job_id: str,
    zip_path: Path,
    config: SegmentationConfig,
) -> None:
    """Submit a reconstruction job to the background executor."""
    sem = _get_semaphore()
    loop = asyncio.get_event_loop()

    async def _worker():
        async with sem:
            await loop.run_in_executor(
                None, _run_pipeline_sync, job_id, zip_path, config
            )

    asyncio.create_task(_worker())
    logger.info("[%s] Job submitted.", job_id)
