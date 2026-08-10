import torch
from pathlib import Path

# Force CPU (avoid CUDA errors)
DEVICE = torch.device("cpu")
print(f"🔧 Using device: {DEVICE}")

# Model config
MODEL_CONFIG = {
    "spatial_dims": 2,
    "in_channels": 1,
    "out_channels": 1,
    "channels": (16, 32, 64, 128, 256),
    "strides": (2, 2, 2, 2),
    "num_res_units": 2,
}

# Segmentation settings
DICOM_CONFIG = {
    "segmentation_threshold": 0.5
}

# Anonymization tags (keep PatientID and PatientSex)
ANONYMIZE_TAGS = {
    (0x0010, 0x0010): "ANONYMOUS",   # PatientName
    # (0x0010, 0x0020): keep original PatientID
    # (0x0010, 0x0040): keep original PatientSex
    (0x0010, 0x0030): "19000101",    # PatientBirthDate
    (0x0010, 0x1010): "",            # PatientAge
    (0x0008, 0x0020): "19000101",    # StudyDate
    (0x0008, 0x0030): "000000",      # StudyTime
    (0x0008, 0x0050): "",            # AccessionNumber
    (0x0008, 0x0080): "",            # InstitutionName
    (0x0008, 0x0090): "",            # ReferringPhysicianName
    (0x0008, 0x1070): "",            # OperatorsName
    (0x0020, 0x000D): "1.2.3.4.5.6.7.8.9.0",  # StudyInstanceUID
    (0x0020, 0x000E): "1.2.3.4.5.6.7.8.9.1",  # SeriesInstanceUID
}

# Output directory
OUTPUT_DIR = Path("segmentations")
OUTPUT_DIR.mkdir(exist_ok=True)

# API config
API_HOST = "127.0.0.1"
API_PORT = 8001