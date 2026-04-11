"""
Integration tests – full HTTP layer via FastAPI TestClient.
Run:  pytest tests/ -v
"""

from __future__ import annotations

import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ── Synthetic DICOM ZIP fixture ───────────────────────────────────────────────

def _make_dicom_zip(n_slices: int = 5) -> bytes:
    import numpy as np
    import pydicom
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.uid import generate_uid, ExplicitVRLittleEndian

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for i in range(n_slices):
            ds = FileDataset(None, {}, preamble=b"\0" * 128)
            ds.file_meta = Dataset()
            ds.file_meta.MediaStorageSOPClassUID    = "1.2.840.10008.5.1.4.1.1.2"
            ds.file_meta.MediaStorageSOPInstanceUID = generate_uid()
            ds.file_meta.TransferSyntaxUID          = ExplicitVRLittleEndian
            ds.is_implicit_VR  = False
            ds.is_little_endian = True
            ds.PatientName          = "Test^Patient"
            ds.PatientID            = "TEST001"
            ds.PatientSex           = "M"
            ds.Modality             = "CT"
            ds.StudyDate            = "20240101"
            ds.SeriesDescription    = "Synthetic CT"
            ds.InstanceNumber       = i + 1
            ds.Rows                 = 64
            ds.Columns              = 64
            ds.PixelSpacing         = [0.5, 0.5]
            ds.SliceThickness       = 1.0
            ds.ImagePositionPatient = [0.0, 0.0, float(i)]
            ds.RescaleSlope         = 1.0
            ds.RescaleIntercept     = -1024.0
            ds.BitsAllocated        = 16
            ds.BitsStored           = 16
            ds.HighBit              = 15
            ds.PixelRepresentation  = 1
            ds.SamplesPerPixel      = 1
            ds.PhotometricInterpretation = "MONOCHROME2"
            # Pixel value 1300 → 1300 * 1 + (-1024) = 276 HU (inside bone window 200-1500)
            arr = (np.full((64, 64), 1300, dtype=np.int16))
            ds.PixelData = arr.tobytes()
            slice_buf = io.BytesIO()
            pydicom.dcmwrite(slice_buf, ds, write_like_original=False)
            zf.writestr(f"slice_{i:03d}.dcm", slice_buf.getvalue())
    return buf.getvalue()


@pytest.fixture(scope="module")
def dicom_zip():
    return _make_dicom_zip()


# ── Health ────────────────────────────────────────────────────────────────────

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_api_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200


# ── Two-step flow ─────────────────────────────────────────────────────────────

def test_upload_metadata_returns_file_id(dicom_zip):
    r = client.post(
        "/api/v1/upload-metadata",
        files={"file": ("scan.zip", dicom_zip, "application/zip")},
        data={"anonymize": "true"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "file_id" in body
    assert "metadata" in body
    assert "volume_shape" in body
    assert body["volume_shape"][0] == 5   # 5 slices


def test_upload_metadata_rejects_non_zip(dicom_zip):
    r = client.post(
        "/api/v1/upload-metadata",
        files={"file": ("scan.txt", b"not a zip", "text/plain")},
        data={"anonymize": "false"},
    )
    assert r.status_code == 400


def test_start_processing_invalid_file_id():
    r = client.post(
        "/api/v1/start-processing",
        data={"file_id": "does-not-exist", "tissue_type": "bone"},
    )
    assert r.status_code == 404


def test_two_step_flow_queues_job(dicom_zip):
    # Step 1
    r1 = client.post(
        "/api/v1/upload-metadata",
        files={"file": ("scan.zip", dicom_zip, "application/zip")},
        data={"anonymize": "true"},
    )
    assert r1.status_code == 200
    file_id = r1.json()["file_id"]

    # Step 2
    r2 = client.post(
        "/api/v1/start-processing",
        data={
            "file_id":      file_id,
            "tissue_type":  "bone",
            "output_format":"stl",
            "use_ai":       "false",
        },
    )
    assert r2.status_code == 200
    body = r2.json()
    assert "job_id" in body
    assert body["status"] in ("queued", "processing")


# ── Single-shot flow ──────────────────────────────────────────────────────────

def test_upload_single_shot_returns_job_id(dicom_zip):
    r = client.post(
        "/api/v1/upload",
        files={"file": ("scan.zip", dicom_zip, "application/zip")},
        data={"tissue_type": "bone", "output_format": "stl", "use_ai": "false"},
    )
    assert r.status_code == 200, r.text
    assert "job_id" in r.json()


# ── Job status ────────────────────────────────────────────────────────────────

def test_job_status_unknown():
    r = client.get("/api/v1/jobs/nonexistent-job-id")
    assert r.status_code == 404


def test_job_status_known(dicom_zip):
    r1 = client.post(
        "/api/v1/upload",
        files={"file": ("scan.zip", dicom_zip, "application/zip")},
        data={"tissue_type": "soft_tissue", "use_ai": "false"},
    )
    job_id = r1.json()["job_id"]

    r2 = client.get(f"/api/v1/jobs/{job_id}")
    assert r2.status_code == 200
    body = r2.json()
    assert body["job_id"] == job_id
    assert "status"   in body
    assert "progress" in body


def test_legacy_status_endpoint(dicom_zip):
    r1 = client.post(
        "/api/v1/upload",
        files={"file": ("scan.zip", dicom_zip, "application/zip")},
        data={"tissue_type": "bone", "use_ai": "false"},
    )
    job_id = r1.json()["job_id"]
    r2 = client.get(f"/api/v1/status/{job_id}")
    assert r2.status_code == 200
    assert "state" in r2.json()


# ── Admin ─────────────────────────────────────────────────────────────────────

def test_list_jobs():
    r = client.get("/api/v1/jobs")
    assert r.status_code == 200
    body = r.json()
    assert "total" in body
    assert "jobs"  in body


def test_list_segmentations():
    r = client.get("/api/v1/list-segmentations")
    assert r.status_code == 200
    assert "segmentations" in r.json()
