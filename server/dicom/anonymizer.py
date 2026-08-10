import pydicom
from config import ANONYMIZE_TAGS

def anonymize_dicom(ds: pydicom.dataset.Dataset) -> pydicom.dataset.Dataset:
    """Remove or replace patient‑identifiable information (keep PatientID and PatientSex)."""
    for tag, value in ANONYMIZE_TAGS.items():
        if tag in ds:
            ds[tag].value = value
    # Remove private tags
    tags_to_remove = [tag for tag in ds.keys() if tag.is_private]
    for tag in tags_to_remove:
        del ds[tag]
    return ds