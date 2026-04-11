"""
Segmentation Service
====================
Two modes:
  1. HU Threshold  – fast, no model needed (default)
  2. AI Inference  – MONAI UNet slice-by-slice with HU fallback

Now supports "all" tissue type (bone + soft tissue combined).
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
from scipy import ndimage

from core.config import settings, DEVICE
from models.schemas import SegmentationConfig, TissueType

logger = logging.getLogger(__name__)

# ── HU window presets ─────────────────────────────────────────────────────────

_HU_PRESETS: dict = {
    TissueType.bone:        (settings.HU_BONE_MIN,        settings.HU_BONE_MAX),
    TissueType.soft_tissue: (settings.HU_SOFT_TISSUE_MIN, settings.HU_SOFT_TISSUE_MAX),
    TissueType.lung:        (settings.HU_LUNG_MIN,        settings.HU_LUNG_MAX),
}


def get_hu_window(config: SegmentationConfig) -> Tuple[int, int]:
    if config.tissue_type == TissueType.custom:
        if config.hu_min is None or config.hu_max is None:
            raise ValueError("hu_min and hu_max are required when tissue_type=custom")
        return config.hu_min, config.hu_max
    return _HU_PRESETS[config.tissue_type]


# ── Mode 1: HU threshold ──────────────────────────────────────────────────────

def segment_volume(
    volume: np.ndarray,
    config: SegmentationConfig,
) -> Tuple[np.ndarray, dict]:
    """
    Threshold the CT volume by HU range, apply morphological cleanup,
    and return a boolean mask + statistics dict.
    For tissue_type="all", it combines bone and soft tissue masks.
    """
    if config.tissue_type == TissueType.all:
        return segment_combined(volume, config)
    
    hu_min, hu_max = get_hu_window(config)
    logger.info("HU segmentation: tissue=%s  window=[%d, %d]", config.tissue_type, hu_min, hu_max)

    mask = (volume >= hu_min) & (volume <= hu_max)
    raw_count = int(mask.sum())

    # 3-D binary closing to fill small holes
    struct = ndimage.generate_binary_structure(3, 1)
    mask = ndimage.binary_closing(mask, structure=struct, iterations=2)

    # Keep largest connected component
    labeled, n = ndimage.label(mask)
    if n > 1:
        sizes  = ndimage.sum(mask, labeled, range(1, n + 1))
        mask   = labeled == (int(np.argmax(sizes)) + 1)
        logger.info("Kept largest of %d components", n)

    final_count  = int(mask.sum())
    total_voxels = int(np.prod(volume.shape))

    stats = {
        "method": "hu_threshold",
        "hu_window": [hu_min, hu_max],
        "voxels_raw": raw_count,
        "voxels_final": final_count,
        "tissue_fraction_pct": round(100.0 * final_count / total_voxels, 2),
        "hu_mean_in_mask": round(float(volume[mask].mean()), 2) if final_count else None,
    }
    logger.info("HU segmentation done: %s", stats)
    return mask.astype(bool), stats


def segment_combined(volume: np.ndarray, config: SegmentationConfig) -> Tuple[np.ndarray, dict]:
    """
    Segment bone and soft tissue, then combine into one mask.
    """
    logger.info("Combined segmentation: bone + soft tissue")
    
    # Segment bone (default HU window)
    bone_config = SegmentationConfig(
        tissue_type=TissueType.bone,
        hu_min=None, hu_max=None,
        iso_value=config.iso_value,
        output_format=config.output_format,
        apply_smoothing=config.apply_smoothing,
        apply_decimation=config.apply_decimation,
        decimation_reduction=config.decimation_reduction,
        use_ai=False,
        anonymize=config.anonymize,
    )
    bone_mask, bone_stats = segment_volume(volume, bone_config)
    
    # Segment soft tissue (default HU window)
    soft_config = SegmentationConfig(
        tissue_type=TissueType.soft_tissue,
        hu_min=None, hu_max=None,
        iso_value=config.iso_value,
        output_format=config.output_format,
        apply_smoothing=config.apply_smoothing,
        apply_decimation=config.apply_decimation,
        decimation_reduction=config.decimation_reduction,
        use_ai=False,
        anonymize=config.anonymize,
    )
    soft_mask, soft_stats = segment_volume(volume, soft_config)
    
    # Combine (union)
    combined = bone_mask | soft_mask
    
    # Keep largest connected component (to avoid small artifacts)
    labeled, n = ndimage.label(combined)
    if n > 1:
        sizes = ndimage.sum(combined, labeled, range(1, n+1))
        combined = labeled == (int(np.argmax(sizes)) + 1)
        logger.info("Combined mask: kept largest of %d components", n)
    
    total_voxels = int(np.prod(volume.shape))
    stats = {
        "method": "combined",
        "bone_voxels": int(bone_mask.sum()),
        "soft_voxels": int(soft_mask.sum()),
        "total_voxels": int(combined.sum()),
        "tissue_fraction_pct": round(100.0 * combined.sum() / total_voxels, 2),
    }
    logger.info("Combined segmentation done: %s", stats)
    return combined, stats


# ── Mode 2: AI inference ──────────────────────────────────────────────────────

_ai_model = None   # module-level singleton


def _get_ai_model():
    global _ai_model
    if _ai_model is not None:
        return _ai_model
    try:
        import torch
        from monai.networks.nets import UNet
        logger.info("🤖 Initialising MONAI UNet on %s …", DEVICE)
        model = UNet(
            spatial_dims=settings.MODEL_SPATIAL_DIMS,
            in_channels=settings.MODEL_IN_CHANNELS,
            out_channels=settings.MODEL_OUT_CHANNELS,
            channels=(16, 32, 64, 128, 256),
            strides=(2, 2, 2, 2),
            num_res_units=2,
        ).to(DEVICE)

        if settings.MODEL_WEIGHTS_PATH:
            state = torch.load(settings.MODEL_WEIGHTS_PATH, map_location=DEVICE)
            if "state_dict" in state:
                state = state["state_dict"]
            state = {k.replace("module.", ""): v for k, v in state.items()}
            model.load_state_dict(state)
            logger.info("✅ Weights loaded from %s", settings.MODEL_WEIGHTS_PATH)
        else:
            logger.warning("⚠️  No MODEL_WEIGHTS_PATH set – model has random weights")

        model.eval()
        _ai_model = model
        return _ai_model

    except ImportError as exc:
        logger.error("MONAI not installed – AI inference unavailable: %s", exc)
        return None
    except Exception as exc:
        logger.error("Model load failed: %s", exc)
        return None


def run_ai_inference(
    volume: np.ndarray,
) -> Tuple[np.ndarray, dict]:
    """
    Slice-by-slice MONAI UNet inference with automatic HU-threshold fallback.
    (Unchanged – works with any binary output)
    """
    import torch

    model = _get_ai_model()
    if model is None:
        raise RuntimeError(
            "AI model is not available. "
            "Install MONAI and set MODEL_WEIGHTS_PATH in .env, "
            "or use use_ai=false to fall back to HU threshold."
        )

    # Normalise to [0, 1]
    v = volume.astype(np.float32)
    v_min, v_max = v.min(), v.max()
    if v_max - v_min > 0:
        v = (v - v_min) / (v_max - v_min)
    tensor = torch.from_numpy(v)

    n, H, W = tensor.shape
    prob_volume = np.zeros((n, H, W), dtype=np.float32)
    bs = settings.INFERENCE_BATCH_SIZE

    logger.info("🎯 Running AI inference on %d slices (batch=%d) …", n, bs)
    with torch.no_grad():
        for i in range(0, n, bs):
            batch  = tensor[i:i + bs].unsqueeze(1).to(DEVICE)
            output = torch.sigmoid(model(batch)).squeeze(1).cpu().numpy()
            prob_volume[i:i + bs] = output
            logger.info("   Processed %d / %d", min(i + bs, n), n)

    threshold = settings.SEGMENTATION_THRESHOLD
    mask = (prob_volume > threshold).astype(np.uint8)
    ai_ratio = mask.sum() / mask.size
    logger.info("🧪 AI bone ratio: %.2f%%", ai_ratio * 100)

    if ai_ratio < 0.01 or ai_ratio > 0.5:
        logger.warning("⚠️  AI ratio unreliable – raising threshold to 0.8")
        mask = (prob_volume > 0.8).astype(np.uint8)

    for i in range(mask.shape[0]):
        mask[i] = ndimage.binary_closing(mask[i],  structure=np.ones((3, 3)))
        mask[i] = ndimage.binary_opening(mask[i],  structure=np.ones((3, 3)))

    labeled, n_comp = ndimage.label(mask)
    if n_comp > 0:
        sizes = ndimage.sum(mask, labeled, range(1, n_comp + 1))
        mask  = (labeled == (int(np.argmax(sizes)) + 1)).astype(np.uint8)

    final_ratio  = mask.sum() / mask.size
    total_voxels = int(np.prod(volume.shape))
    logger.info("✅ Final AI mask ratio: %.2f%%", final_ratio * 100)

    stats = {
        "method": "ai_unet",
        "ai_ratio_pct": round(float(final_ratio) * 100, 2),
        "voxels_final": int(mask.sum()),
        "tissue_fraction_pct": round(float(mask.sum()) / total_voxels * 100, 2),
        "inference_slices": n,
    }
    return mask.astype(bool), stats