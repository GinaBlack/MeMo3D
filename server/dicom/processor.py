import torch
import numpy as np

def preprocess_volume(volume_np):
    """
    Keep original shape [N,H,W]
    Only normalize + convert to tensor
    """
    if volume_np is None or volume_np.size == 0:
        raise ValueError("Invalid volume")

    volume_np = volume_np.astype(np.float32)

    # Normalize safely
    min_val = volume_np.min()
    max_val = volume_np.max()

    if max_val - min_val > 0:
        volume_np = (volume_np - min_val) / (max_val - min_val)

    volume_tensor = torch.from_numpy(volume_np)

    print(f"📊 Preprocessed volume: {volume_tensor.shape}, {volume_tensor.dtype}")

    return volume_tensor