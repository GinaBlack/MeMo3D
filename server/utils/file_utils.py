import os
import json
import numpy as np
import nibabel as nib
from datetime import datetime
from config import OUTPUT_DIR

def save_segmentation_results(mask_volume, prob_volume, metadata, volume_shape):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    patient_id = metadata.get('patient_id', 'unknown').replace('/', '_').replace('\\', '_')
    base = f"seg_{patient_id}_{timestamp}"
    results = {}

    nifti_path = OUTPUT_DIR / f"{base}.nii.gz"
    nib.save(nib.Nifti1Image(mask_volume.astype(np.uint8), np.eye(4)), nifti_path)
    results['nifti'] = str(nifti_path)

    npy_path = OUTPUT_DIR / f"{base}.npy"
    np.save(npy_path, mask_volume)
    results['npy'] = str(npy_path)

    prob_path = OUTPUT_DIR / f"{base}_prob.npy"
    np.save(prob_path, prob_volume)
    results['probability'] = str(prob_path)

    meta_path = OUTPUT_DIR / f"{base}_metadata.json"
    with open(meta_path, 'w') as f:
        json.dump({
            **metadata,
            "volume_shape": volume_shape,
            "mask_shape": mask_volume.shape,
            "timestamp": timestamp
        }, f, indent=2)
    results['metadata'] = str(meta_path)

    return results