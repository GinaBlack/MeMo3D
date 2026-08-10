"""
Unit tests for core services (segmentation, DICOM loader utilities).
"""

from __future__ import annotations

import numpy as np
import pytest

from app.models.schemas import SegmentationConfig, TissueType
from app.services.segmentation import get_hu_window, segment_volume


# ── HU window tests ───────────────────────────────────────────────────────────

def test_bone_preset():
    cfg = SegmentationConfig(tissue_type=TissueType.bone)
    lo, hi = get_hu_window(cfg)
    assert lo < hi
    assert lo >= 100  # bone is roughly 200–1500 HU


def test_soft_tissue_preset():
    cfg = SegmentationConfig(tissue_type=TissueType.soft_tissue)
    lo, hi = get_hu_window(cfg)
    assert lo < hi


def test_lung_preset():
    cfg = SegmentationConfig(tissue_type=TissueType.lung)
    lo, hi = get_hu_window(cfg)
    assert lo < 0  # lung is very negative HU


def test_custom_requires_hu_range():
    cfg = SegmentationConfig(tissue_type=TissueType.custom, hu_min=None, hu_max=None)
    with pytest.raises(ValueError, match="hu_min and hu_max"):
        get_hu_window(cfg)


def test_custom_range():
    cfg = SegmentationConfig(tissue_type=TissueType.custom, hu_min=0, hu_max=500)
    lo, hi = get_hu_window(cfg)
    assert lo == 0 and hi == 500


# ── Segmentation tests ────────────────────────────────────────────────────────

def _make_volume(shape=(20, 32, 32), fill=0.0):
    return np.full(shape, fill, dtype=np.float32)


def test_segment_bone_hits_bone_voxels():
    vol = _make_volume()
    # Insert a block of bone-like HU values
    vol[8:12, 10:22, 10:22] = 800.0
    cfg = SegmentationConfig(tissue_type=TissueType.bone)
    mask, stats = segment_volume(vol, cfg)

    assert mask.shape == vol.shape
    assert mask.dtype == bool
    # Some voxels should be masked
    assert stats["voxels_raw"] > 0
    assert stats["tissue_fraction_pct"] > 0


def test_segment_returns_zero_mask_when_no_tissue():
    vol = _make_volume(fill=-500.0)  # all air – won't match bone
    cfg = SegmentationConfig(tissue_type=TissueType.bone)
    mask, stats = segment_volume(vol, cfg)
    assert stats["voxels_final"] == 0


def test_segment_custom_range():
    vol = _make_volume()
    vol[5:10, 5:20, 5:20] = 150.0
    cfg = SegmentationConfig(
        tissue_type=TissueType.custom,
        hu_min=100,
        hu_max=200,
    )
    mask, stats = segment_volume(vol, cfg)
    assert stats["voxels_raw"] > 0
