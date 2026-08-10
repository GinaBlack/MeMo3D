import io
import zipfile
import pydicom
import numpy as np
from .anonymizer import anonymize_dicom
from .metadata import extract_metadata_from_dicom

def extract_dicom_volume(zip_bytes: bytes, anonymize: bool = False):
    slices = []
    metadata = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        dcm_files = [name for name in zf.namelist() if name.lower().endswith('.dcm')]
        if not dcm_files:
            raise ValueError("No DICOM files found")
        print(f"📁 Found {len(dcm_files)} DICOM files")
        valid_slices = 0
        expected_shape = None
        for dcm_name in dcm_files:
            with zf.open(dcm_name) as dcm_file:
                ds = pydicom.dcmread(dcm_file, force=True)
                if anonymize:
                    ds = anonymize_dicom(ds)
                pixel_array = ds.pixel_array.astype(np.float32)
                shape = pixel_array.shape
                if expected_shape is None:
                    expected_shape = shape
                elif shape != expected_shape:
                    print(f"⚠️ Skipping {dcm_name}: shape mismatch")
                    continue
                if valid_slices == 0:
                    metadata = extract_metadata_from_dicom(ds)
                try:
                    z_pos = float(ds.ImagePositionPatient[2]) if hasattr(ds, 'ImagePositionPatient') else float(valid_slices)
                except:
                    z_pos = float(valid_slices)
                if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                    pixel_array = pixel_array * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
                slices.append({'z': z_pos, 'image': pixel_array})
                valid_slices += 1
    if valid_slices == 0:
        raise ValueError("No valid DICOM files")
    slices.sort(key=lambda x: x['z'])
    volume = np.stack([s['image'] for s in slices])
    metadata['actual_slices'] = valid_slices
    metadata['total_files'] = len(dcm_files)
    print(f"📊 Volume shape: {volume.shape}")
    return volume, metadata