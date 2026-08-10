"""
Integration tests for the DICOM AI Service.
Run: pytest tests/ -v
"""

from __future__ import annotations

import io
import zipfile

import numpy as np
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _make_minimal_dicom_zip() -> bytes:
    """
    Create a tiny in-memory ZIP containing synthetic DICOM-like files.
    Uses pydicom to build valid DICOM datasets so the loader accepts them.
    """
    import pydicom
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.sequence import Sequence
    from pydicom.uid import generate_uid, ExplicitVRLittleEndian
    import datetime

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for i in range(5):  # 5 synthetic slices
            ds = FileDataset(None, {}, preamble=b"\0" * 128)
            ds.file_meta = Dataset()
            ds.file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
            ds.file_meta.MediaStorageSOPInstanceUID = generate_uid()
            ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

            ds.is_implicit_VR = False
            ds.is_little_endian = True

            ds.PatientName = "Test^Patient"
            ds.PatientID = "TEST001"
            ds.Modality = "CT"
            ds.StudyDate = "20240101"
            ds.SeriesDescription = "Synthetic CT"
            ds.InstanceNumber = i + 1
            ds.Rows = 64
            ds.Columns = 64
            ds.PixelSpacing = [0.5, 0.5]
            ds.SliceThickness = 1.0
            ds.ImagePositionPatient = [0.0, 0.0, float(i)]
            ds.RescaleSlope = 1.0
            ds.RescaleIntercept = -1024.0
            ds.BitsAllocated = 16
            ds.BitsStored = 16
            ds.HighBit = 15
            ds.PixelRepresentation = 1
            ds.SamplesPerPixel = 1
            ds.PhotometricInterpretation = "MONOCHROME2"

            # Synthetic pixel data: uniform value 1300 (maps to ~276 HU after rescale)
            pixel_array = np.full((64, 64), 1300, dtype=np.int16)
            ds.PixelData = pixel_array.tobytes()

            slice_buf = io.BytesIO()
            pydicom.dcmwrite(slice_buf, ds, write_like_original=False)
            zf.writestr(f"slice_{i:03d}.dcm", slice_buf.getvalue())

    return buf.getvalue()


@pytest.fixture(scope="module")
def dicom_zip_bytes():
    return _make_minimal_dicom_zip()


# ── Health ────────────────────────────────────────────────────────────────────

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "running"


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


# ── Upload ────────────────────────────────────────────────────────────────────

def test_upload_returns_job_id(dicom_zip_bytes):
    r = client.post(
        "/api/v1/upload",
        files={"file": ("ct_scan.zip", dicom_zip_bytes, "application/zip")},
        data={
            "tissue_type": "bone",
            "output_format": "stl",
            "apply_smoothing": "true",
            "apply_decimation": "true",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "job_id" in body
    assert body["status"] in ("queued", "processing")


def test_upload_rejects_non_zip():
    r = client.post(
        "/api/v1/upload",
        files={"file": ("scan.txt", b"not a zip", "text/plain")},
        data={"tissue_type": "bone"},
    )
    assert r.status_code == 400


# ── Job status ────────────────────────────────────────────────────────────────

def test_job_status_unknown():
    r = client.get("/api/v1/jobs/nonexistent-job-id")
    assert r.status_code == 404


def test_job_status_known(dicom_zip_bytes):
    # Upload first
    upload_r = client.post(
        "/api/v1/upload",
        files={"file": ("ct.zip", dicom_zip_bytes, "application/zip")},
        data={"tissue_type": "soft_tissue", "output_format": "obj"},
    )
    job_id = upload_r.json()["job_id"]

    # Status should exist immediately
    status_r = client.get(f"/api/v1/jobs/{job_id}")
    assert status_r.status_code == 200
    body = status_r.json()
    assert body["job_id"] == job_id
    assert "status" in body
    assert "progress" in body


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_jobs():
    r = client.get("/api/v1/jobs")
    assert r.status_code == 200
    body = r.json()
    assert "total" in body
    assert "jobs" in body
