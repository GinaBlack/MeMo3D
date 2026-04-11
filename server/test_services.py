"""
Unit tests for core services.
Run:  pytest tests/ -v
"""

from __future__ import annotations

import numpy as np
import pytest

from app.models.schemas import SegmentationConfig, TissueType
from app.services.segmentation import get_hu_window, segment_volume
from app.services.dicom_loader import anonymize_dicom, _safe_str, _safe_float_list


# ── HU window tests ───────────────────────────────────────────────────────────

def test_bone_preset():
    cfg = SegmentationConfig(tissue_type=TissueType.bone)
    lo, hi = get_hu_window(cfg)
    assert lo < hi
    assert lo >= 100


def test_soft_tissue_preset():
    cfg = SegmentationConfig(tissue_type=TissueType.soft_tissue)
    lo, hi = get_hu_window(cfg)
    assert lo < hi


def test_lung_preset():
    cfg = SegmentationConfig(tissue_type=TissueType.lung)
    lo, hi = get_hu_window(cfg)
    assert lo < 0


def test_custom_requires_range():
    cfg = SegmentationConfig(tissue_type=TissueType.custom)
    with pytest.raises(ValueError, match="hu_min and hu_max"):
        get_hu_window(cfg)


def test_custom_range():
    cfg = SegmentationConfig(tissue_type=TissueType.custom, hu_min=0, hu_max=500)
    lo, hi = get_hu_window(cfg)
    assert lo == 0 and hi == 500


# ── Segmentation tests ────────────────────────────────────────────────────────

def _vol(shape=(20, 32, 32), fill=0.0):
    return np.full(shape, fill, dtype=np.float32)


def test_segment_bone_detects_bone_block():
    vol = _vol()
    vol[8:12, 10:22, 10:22] = 800.0   # bone-like HU block
    cfg  = SegmentationConfig(tissue_type=TissueType.bone)
    mask, stats = segment_volume(vol, cfg)
    assert mask.shape == vol.shape
    assert mask.dtype == bool
    assert stats["voxels_raw"] > 0


def test_segment_returns_empty_when_no_tissue():
    vol = _vol(fill=-500.0)   # all air – won't match bone
    cfg  = SegmentationConfig(tissue_type=TissueType.bone)
    mask, stats = segment_volume(vol, cfg)
    assert stats["voxels_final"] == 0


def test_segment_custom_range():
    vol = _vol()
    vol[5:10, 5:20, 5:20] = 150.0
    cfg  = SegmentationConfig(tissue_type=TissueType.custom, hu_min=100, hu_max=200)
    mask, stats = segment_volume(vol, cfg)
    assert stats["voxels_raw"] > 0


def test_stats_keys_present():
    vol  = _vol()
    vol[5:15, 5:25, 5:25] = 400.0
    cfg  = SegmentationConfig(tissue_type=TissueType.bone)
    _, stats = segment_volume(vol, cfg)
    for key in ("method", "hu_window", "voxels_raw", "voxels_final", "tissue_fraction_pct"):
        assert key in stats, f"Missing key: {key}"


# ── Helper tests ──────────────────────────────────────────────────────────────

def test_safe_str_none():
    assert _safe_str(None) == "N/A"


def test_safe_str_value():
    assert _safe_str("hello") == "hello"


def test_safe_float_list_none():
    result = _safe_float_list(None)
    assert result == [1.0, 1.0]


def test_safe_float_list_pair():
    result = _safe_float_list([0.5, 0.5])
    assert result == [0.5, 0.5]


# ── Anonymizer tests ──────────────────────────────────────────────────────────

def test_anonymize_replaces_patient_name():
    import pydicom
    from pydicom.dataset import Dataset
    ds = Dataset()
    ds.PatientName  = "Real Name"
    ds.PatientID    = "12345"
    ds.PatientSex   = "F"
    result = anonymize_dicom(ds)
    assert str(result.PatientName) == "ANONYMOUS"
    # PatientID and PatientSex must be preserved
    assert str(result.PatientID)  == "12345"
    assert str(result.PatientSex) == "F"
