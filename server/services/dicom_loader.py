"""
DICOM Loader
============
Reads a directory of DICOM slices, sorts them by slice position,
extracts patient / study metadata, and assembles a 3-D NumPy volume.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import pydicom
from pydicom.errors import InvalidDicomError

from app.models.schemas import DicomMetadata

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _safe_str(ds, tag) -> Optional[str]:
    try:
        val = getattr(ds, tag, None)
        return str(val).strip() if val is not None else None
    except Exception:
        return None


def _safe_float(ds, tag) -> Optional[float]:
    try:
        val = getattr(ds, tag, None)
        return float(val) if val is not None else None
    except Exception:
        return None


# ── public API ────────────────────────────────────────────────────────────────

def discover_dicom_files(directory: Path) -> List[Path]:
    """Return all DICOM files found recursively under *directory*."""
    candidates: List[Path] = []
    for path in directory.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in {".dcm", ".dicom"}:
            candidates.append(path)
            continue
        # Files without extension – peek at magic bytes
        try:
            with path.open("rb") as fh:
                fh.seek(128)
                magic = fh.read(4)
            if magic == b"DICM":
                candidates.append(path)
        except Exception:
            pass
    logger.info("Discovered %d DICOM file(s) in %s", len(candidates), directory)
    return candidates


def load_dicom_series(
    dicom_files: List[Path],
) -> Tuple[np.ndarray, DicomMetadata]:
    """
    Load, sort and stack DICOM slices into a (Z, Y, X) float32 volume.

    Returns
    -------
    volume : np.ndarray, shape (Z, Y, X), dtype float32
        Pixel values converted to Hounsfield Units.
    metadata : DicomMetadata
    """
    if not dicom_files:
        raise ValueError("No DICOM files provided.")

    datasets = []
    for path in dicom_files:
        try:
            ds = pydicom.dcmread(str(path), force=True)
            if not hasattr(ds, "pixel_array"):
                logger.warning("Skipping %s – no pixel data", path.name)
                continue
            datasets.append(ds)
        except (InvalidDicomError, Exception) as exc:
            logger.warning("Skipping %s: %s", path.name, exc)

    if not datasets:
        raise ValueError("No readable DICOM slices found.")

    # ── Sort by ImagePositionPatient Z, fall back to InstanceNumber ──────────
    def sort_key(ds):
        try:
            return float(ds.ImagePositionPatient[2])
        except Exception:
            pass
        try:
            return int(ds.InstanceNumber)
        except Exception:
            return 0

    datasets.sort(key=sort_key)
    logger.info("Loaded and sorted %d DICOM slices.", len(datasets))

    # ── Build HU volume ───────────────────────────────────────────────────────
    first = datasets[0]
    rows = int(first.Rows)
    cols = int(first.Columns)
    volume = np.zeros((len(datasets), rows, cols), dtype=np.float32)

    for i, ds in enumerate(datasets):
        arr = ds.pixel_array.astype(np.float32)
        slope  = float(getattr(ds, "RescaleSlope",     1.0) or 1.0)
        intercept = float(getattr(ds, "RescaleIntercept", 0.0) or 0.0)
        volume[i] = arr * slope + intercept   # Hounsfield Units

    # ── Extract metadata from first slice ────────────────────────────────────
    pixel_spacing: Optional[List[float]] = None
    try:
        ps = first.PixelSpacing
        pixel_spacing = [float(ps[0]), float(ps[1])]
    except Exception:
        pass

    metadata = DicomMetadata(
        patient_name=_safe_str(first, "PatientName"),
        patient_id=_safe_str(first, "PatientID"),
        study_date=_safe_str(first, "StudyDate"),
        modality=_safe_str(first, "Modality"),
        series_description=_safe_str(first, "SeriesDescription"),
        slice_count=len(datasets),
        pixel_spacing=pixel_spacing,
        slice_thickness=_safe_float(first, "SliceThickness"),
        rows=rows,
        columns=cols,
        volume_shape=list(volume.shape),
    )

    logger.info(
        "Volume assembled: shape=%s  HU range=[%.0f, %.0f]",
        volume.shape,
        float(volume.min()),
        float(volume.max()),
    )
    return volume, metadata
