"""
File Utils
==========
Saves segmentation artefacts (NIfTI, NumPy, probability map, JSON metadata).
Mirrors your original utils/file_utils.py.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

import nibabel as nib
import numpy as np

from core.config import settings

logger = logging.getLogger(__name__)


def save_segmentation_results(
    mask_volume: np.ndarray,
    prob_volume: np.ndarray,
    metadata: Dict[str, Any],
    volume_shape: tuple,
    job_id: str,
) -> Dict[str, str]:
    """
    Persist:
      - mask.nii.gz    – binary segmentation mask (NIfTI)
      - mask.npy       – raw NumPy mask
      - prob.npy       – probability map
      - metadata.json  – patient + volume info

    Returns a dict of {key: absolute_path_str}.
    """
    out_dir = settings.OUTPUT_DIR / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    patient_id = str(metadata.get("patient_id", "unknown")).replace("/", "_").replace("\\", "_")
    base       = f"seg_{patient_id}_{timestamp}"
    results: Dict[str, str] = {}

    # ── NIfTI mask ────────────────────────────────────────────────────────────
    nifti_path = out_dir / f"{base}.nii.gz"
    nib.save(
        nib.Nifti1Image(mask_volume.astype(np.uint8), np.eye(4)),
        str(nifti_path),
    )
    results["nifti"] = str(nifti_path)
    logger.info("NIfTI saved → %s", nifti_path)

    # ── NumPy mask ────────────────────────────────────────────────────────────
    npy_path = out_dir / f"{base}.npy"
    np.save(str(npy_path), mask_volume)
    results["npy"] = str(npy_path)

    # ── Probability map ───────────────────────────────────────────────────────
    prob_path = out_dir / f"{base}_prob.npy"
    np.save(str(prob_path), prob_volume)
    results["probability"] = str(prob_path)

    # ── JSON metadata ─────────────────────────────────────────────────────────
    meta_path = out_dir / f"{base}_metadata.json"
    with open(meta_path, "w") as fh:
        json.dump(
            {
                **{str(k): v for k, v in metadata.items()},
                "volume_shape": list(volume_shape),
                "mask_shape":   list(mask_volume.shape),
                "timestamp":    timestamp,
            },
            fh,
            indent=2,
            default=str,
        )
    results["metadata"] = str(meta_path)

    return results
