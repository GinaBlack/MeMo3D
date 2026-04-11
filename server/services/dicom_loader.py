"""
DICOM Loader
============
* Discovers DICOM files inside a ZIP (or a directory)
* Anonymises patient data on request
* Sorts slices by ImagePositionPatient Z
* Applies RescaleSlope / RescaleIntercept → Hounsfield Units
* Stacks into a (Z, Y, X) float32 NumPy volume
* Extracts rich metadata (mirrors your original metadata.py)
"""

from __future__ import annotations

import io
import logging
import zipfile
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import pydicom
from pydicom.errors import InvalidDicomError

from core.config import ANONYMIZE_TAGS
from models.schemas import DicomMetadata

logger = logging.getLogger(__name__)


# ── Safe value helpers (from your helpers.py) ─────────────────────────────────

def _safe_str(value) -> Optional[str]:
    try:
        return "N/A" if value is None else str(value).strip()
    except Exception:
        return None


def _safe_float_list(value) -> List[float]:
    if value is None:
        return [1.0, 1.0]
    if hasattr(value, "__iter__") and not isinstance(value, str):
        return [float(v) for v in value]
    return [float(value), float(value)]


def _safe_float(value, default=1.0) -> float:
    try:
        return float(value) if value is not None else default
    except Exception:
        return default


def _safe_int(value, default=512) -> int:
    try:
        return int(value) if value is not None else default
    except Exception:
        return default


# ── Anonymizer (from your anonymizer.py) ─────────────────────────────────────

def anonymize_dicom(ds: pydicom.Dataset) -> pydicom.Dataset:
    """
    Remove / replace patient-identifiable fields.
    PatientID and PatientSex are intentionally kept.
    """
    for tag, replacement in ANONYMIZE_TAGS.items():
        if tag in ds:
            ds[tag].value = replacement
    # Strip all private tags
    for tag in [t for t in ds.keys() if t.is_private]:
        del ds[tag]
    return ds


# ── Metadata extractor (from your metadata.py) ────────────────────────────────

def extract_metadata(ds: pydicom.Dataset, slice_count: int = 0) -> DicomMetadata:
    return DicomMetadata(
        # Core
        patient_name=_safe_str(ds.get("PatientName")),
        patient_id=_safe_str(ds.get("PatientID")),
        patient_birth_date=_safe_str(ds.get("PatientBirthDate")),
        patient_sex=_safe_str(ds.get("PatientSex")),
        patient_age=_safe_str(ds.get("PatientAge")),
        # Study
        study_date=_safe_str(ds.get("StudyDate")),
        study_time=_safe_str(ds.get("StudyTime")),
        study_id=_safe_str(ds.get("StudyID")),
        study_description=_safe_str(ds.get("StudyDescription")),
        accession_number=_safe_str(ds.get("AccessionNumber")),
        # Series
        modality=_safe_str(ds.get("Modality")),
        series_number=_safe_str(ds.get("SeriesNumber")),
        series_description=_safe_str(ds.get("SeriesDescription")),
        # Scanner
        manufacturer=_safe_str(ds.get("Manufacturer")),
        institution_name=_safe_str(ds.get("InstitutionName")),
        kvp=_safe_str(ds.get("KVP")),
        exposure=_safe_str(ds.get("Exposure")),
        # Geometry
        slice_count=slice_count,
        pixel_spacing=_safe_float_list(ds.get("PixelSpacing")),
        slice_thickness=_safe_float(ds.get("SliceThickness")),
        rows=_safe_int(ds.get("Rows")),
        columns=_safe_int(ds.get("Columns")),
        volume_shape=None,   # filled in after volume is built
        # Window
        window_center=_safe_str(ds.get("WindowCenter")),
        window_width=_safe_str(ds.get("WindowWidth")),
        # Other
        body_part=_safe_str(ds.get("BodyPartExamined")),
        patient_position=_safe_str(ds.get("PatientPosition")),
        protocol_name=_safe_str(ds.get("ProtocolName")),
        contrast_agent=_safe_str(ds.get("ContrastBolusAgent")),
    )


# ── ZIP extraction ─────────────────────────────────────────────────────────────

def extract_dicom_from_zip(zip_bytes: bytes, anonymize: bool = False) -> Tuple[np.ndarray, DicomMetadata]:
    """
    Extract DICOM slices from a ZIP byte payload.
    Mirrors your original loader.py / extract_dicom_volume().
    Returns (volume, metadata).
    """
    slices = []
    first_ds = None
    expected_shape = None

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        dcm_names = [n for n in zf.namelist() if n.lower().endswith(".dcm")]
        if not dcm_names:
            # Try files without extension – peek at DICM magic
            for name in zf.namelist():
                if "/" in name and name.endswith("/"):
                    continue
                try:
                    with zf.open(name) as fh:
                        fh.seek(128)
                        if fh.read(4) == b"DICM":
                            dcm_names.append(name)
                except Exception:
                    pass

        if not dcm_names:
            raise ValueError("No DICOM files found in ZIP")

        logger.info("Found %d DICOM file(s) in ZIP", len(dcm_names))

        for name in dcm_names:
            try:
                with zf.open(name) as fh:
                    ds = pydicom.dcmread(fh, force=True)

                if not hasattr(ds, "pixel_array"):
                    logger.warning("Skipping %s – no pixel data", name)
                    continue

                if anonymize:
                    ds = anonymize_dicom(ds)

                arr = ds.pixel_array.astype(np.float32)
                shape = arr.shape
                if expected_shape is None:
                    expected_shape = shape
                    first_ds = ds
                elif shape != expected_shape:
                    logger.warning("Skipping %s – shape mismatch %s vs %s", name, shape, expected_shape)
                    continue

                # Apply HU rescale
                slope     = float(getattr(ds, "RescaleSlope",     1.0) or 1.0)
                intercept = float(getattr(ds, "RescaleIntercept", 0.0) or 0.0)
                arr = arr * slope + intercept

                try:
                    z_pos = float(ds.ImagePositionPatient[2])
                except Exception:
                    try:
                        z_pos = float(ds.InstanceNumber)
                    except Exception:
                        z_pos = float(len(slices))

                slices.append({"z": z_pos, "image": arr})

            except (InvalidDicomError, Exception) as exc:
                logger.warning("Skipping %s: %s", name, exc)

    if not slices:
        raise ValueError("No readable DICOM slices found in ZIP")

    slices.sort(key=lambda s: s["z"])
    volume = np.stack([s["image"] for s in slices])   # (Z, Y, X)

    logger.info(
        "Volume built: shape=%s  HU=[%.0f, %.0f]",
        volume.shape, float(volume.min()), float(volume.max()),
    )

    metadata = extract_metadata(first_ds, slice_count=len(slices))
    metadata.volume_shape = list(volume.shape)

    return volume, metadata


# ── Directory-based loader (used by job_manager) ──────────────────────────────

def discover_dicom_files(directory: Path) -> List[Path]:
    candidates: List[Path] = []
    for path in directory.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in {".dcm", ".dicom"}:
            candidates.append(path)
            continue
        try:
            with path.open("rb") as fh:
                fh.seek(128)
                if fh.read(4) == b"DICM":
                    candidates.append(path)
        except Exception:
            pass
    logger.info("Discovered %d DICOM file(s) in %s", len(candidates), directory)
    return candidates


def load_dicom_series(
    dicom_files: List[Path],
    anonymize: bool = False,
) -> Tuple[np.ndarray, DicomMetadata]:
    """Load from a list of paths (used when ZIP is already extracted to disk)."""
    if not dicom_files:
        raise ValueError("No DICOM files provided")

    datasets = []
    for path in dicom_files:
        try:
            ds = pydicom.dcmread(str(path), force=True)
            if not hasattr(ds, "pixel_array"):
                continue
            if anonymize:
                ds = anonymize_dicom(ds)
            datasets.append(ds)
        except Exception as exc:
            logger.warning("Skipping %s: %s", path.name, exc)

    if not datasets:
        raise ValueError("No readable DICOM slices found")

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

    first = datasets[0]
    rows  = int(first.Rows)
    cols  = int(first.Columns)
    volume = np.zeros((len(datasets), rows, cols), dtype=np.float32)

    for i, ds in enumerate(datasets):
        arr       = ds.pixel_array.astype(np.float32)
        slope     = float(getattr(ds, "RescaleSlope",     1.0) or 1.0)
        intercept = float(getattr(ds, "RescaleIntercept", 0.0) or 0.0)
        volume[i] = arr * slope + intercept

    metadata = extract_metadata(first, slice_count=len(datasets))
    metadata.volume_shape = list(volume.shape)

    logger.info(
        "Series loaded: shape=%s  HU=[%.0f, %.0f]",
        volume.shape, float(volume.min()), float(volume.max()),
    )
    return volume, metadata
