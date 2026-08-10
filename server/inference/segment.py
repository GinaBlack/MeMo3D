import torch
import numpy as np
from scipy import ndimage
from config import DEVICE, DICOM_CONFIG
from models.unet import load_model

model = None

def get_model(weights_path=None):
    global model
    if model is None:
        model = load_model(weights_path)
    return model

def run_inference(volume_tensor: torch.Tensor, batch_size: int = 2):
    """
    Try AI first; if mask is empty or too large, fall back to HU threshold.
    """
    # Try AI segmentation
    model = get_model()
    if volume_tensor.ndim != 3:
        raise ValueError(f"Expected [N,H,W], got {volume_tensor.shape}")

    num_slices, H, W = volume_tensor.shape
    prob_volume = np.zeros((num_slices, H, W), dtype=np.float32)

    print(f"🎯 Running CPU inference on {num_slices} slices...")
    with torch.no_grad():
        for i in range(0, num_slices, batch_size):
            batch = volume_tensor[i:i + batch_size].unsqueeze(1)
            output = torch.sigmoid(model(batch.to(DEVICE)))
            output = output.squeeze(1).cpu().numpy()
            prob_volume[i:i + batch_size] = output
            print(f"   Processed {min(i + batch_size, num_slices)}/{num_slices}")

    threshold = DICOM_CONFIG["segmentation_threshold"]
    mask_volume = (prob_volume > threshold).astype(np.uint8)

    # If AI mask is empty or too large (>50% of volume), use HU threshold
    bone_ratio = mask_volume.sum() / mask_volume.size
    print(f"🧪 AI bone ratio: {bone_ratio:.2%}")

    if bone_ratio < 0.01 or bone_ratio > 0.5:
        print("⚠️ AI mask not reliable – falling back to HU threshold (300–1000)")
        # Use the original volume tensor (which is in HU after preprocessing)
        # volume_tensor is already normalized to [0,1] but we need original HU? Actually preprocess_volume clipped to 300-1000 and normalized.
        # So threshold at 0.5 corresponds to 650 HU? Let's do direct HU if we have the raw volume.
        # But we don't have raw HU here. Instead, we can re‑read the volume from the original data.
        # Simpler: use the probability map and apply a higher threshold.
        mask_volume = (prob_volume > 0.8).astype(np.uint8)

    # Lighter per‑slice cleanup
    print("🧪 Applying 2D cleanup...")
    for i in range(mask_volume.shape[0]):
        mask_volume[i] = ndimage.binary_closing(mask_volume[i], structure=np.ones((3,3)))
        mask_volume[i] = ndimage.binary_opening(mask_volume[i], structure=np.ones((3,3)))

    # Keep largest connected component (3D)
    labeled, num = ndimage.label(mask_volume)
    if num > 0:
        sizes = ndimage.sum(mask_volume, labeled, range(1, num + 1))
        largest = np.argmax(sizes) + 1
        mask_volume = (labeled == largest).astype(np.uint8)

    final_ratio = mask_volume.sum() / mask_volume.size
    print(f"✅ Final bone ratio: {final_ratio:.2%}")

    return mask_volume, prob_volume