"""
Segmentation Service
====================
Applies Hounsfield Unit thresholding (with optional morphological cleanup)
to isolate tissue of interest in a 3-D CT volume.
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
from scipy import ndimage

from app.core.config import settings
from app.models.schemas import SegmentationConfig, TissueType

logger = logging.getLogger(__name__)


# ── HU window presets ─────────────────────────────────────────────────────────

_HU_PRESETS: dict[TissueType, Tuple[int, int]] = {
    TissueType.bone:        (settings.HU_BONE_MIN,        settings.HU_BONE_MAX),
    TissueType.soft_tissue: (settings.HU_SOFT_TISSUE_MIN, settings.HU_SOFT_TISSUE_MAX),
    TissueType.lung:        (settings.HU_LUNG_MIN,        settings.HU_LUNG_MAX),
}


def get_hu_window(config: SegmentationConfig) -> Tuple[int, int]:
    if config.tissue_type == TissueType.custom:
        if config.hu_min is None or config.hu_max is None:
            raise ValueError(
                "hu_min and hu_max must be provided when tissue_type=custom"
            )
        return config.hu_min, config.hu_max
    return _HU_PRESETS[config.tissue_type]


def segment_volume(
    volume: np.ndarray,
    config: SegmentationConfig,
) -> Tuple[np.ndarray, dict]:
    """
    Threshold a CT volume by HU range and return a binary mask.

    Parameters
    ----------
    volume : (Z, Y, X) float32 array of Hounsfield Units
    config : SegmentationConfig

    Returns
    -------
    mask : (Z, Y, X) bool array
    stats : dict with voxel counts and HU statistics
    """
    hu_min, hu_max = get_hu_window(config)
    logger.info(
        "Segmenting %s tissue  HU=[%d, %d]", config.tissue_type, hu_min, hu_max
    )

    mask: np.ndarray = (volume >= hu_min) & (volume <= hu_max)

    voxel_count_raw = int(mask.sum())
    logger.info("Raw mask voxels: %d", voxel_count_raw)

    # ── Morphological cleanup ─────────────────────────────────────────────────
    # 1) Binary closing to fill small holes
    struct = ndimage.generate_binary_structure(3, 1)
    mask = ndimage.binary_closing(mask, structure=struct, iterations=2)

    # 2) Keep only the largest connected component (removes floating artefacts)
    labeled, n_components = ndimage.label(mask)
    if n_components > 1:
        sizes = ndimage.sum(mask, labeled, range(1, n_components + 1))
        largest = int(np.argmax(sizes)) + 1
        mask = labeled == largest
        logger.info(
            "Kept largest of %d components (%d voxels)",
            n_components,
            int(mask.sum()),
        )

    voxel_count_final = int(mask.sum())
    total_voxels = int(np.prod(volume.shape))

    stats = {
        "hu_window": [hu_min, hu_max],
        "voxels_raw": voxel_count_raw,
        "voxels_final": voxel_count_final,
        "tissue_fraction_pct": round(100.0 * voxel_count_final / total_voxels, 2),
        "hu_mean_in_mask": round(float(volume[mask].mean()), 2) if voxel_count_final else None,
        "hu_std_in_mask":  round(float(volume[mask].std()),  2) if voxel_count_final else None,
    }

    logger.info("Segmentation complete: %s", stats)
    return mask.astype(bool), stats
