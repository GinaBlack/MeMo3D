# utils/stl_saver.py

import os
from datetime import datetime
from config import OUTPUT_DIR

def save_stl_file(stl_bytes: bytes, original_filename: str = "model") -> str:
    """
    Save STL bytes to the shared output directory.
    Returns the saved filename.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = original_filename.replace(" ", "_").replace("/", "_")
    # Remove extension if any
    if safe_name.lower().endswith(('.dcm', '.nii', '.nii.gz')):
        safe_name = os.path.splitext(safe_name)[0]
    filename = f"{safe_name}_{timestamp}.stl"
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(stl_bytes)
    return filename