import traceback
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
import os
import uuid
import tempfile
from config import OUTPUT_DIR
from dicom.loader import extract_dicom_volume
from dicom.processor import preprocess_volume
from inference.segment import run_inference
from utils.file_utils import save_segmentation_results
from mesh.generator import create_stl_from_nifti

router = APIRouter()

temp_files = {}
jobs = {}


@router.post("/upload-metadata")
async def upload_metadata(
    file: UploadFile = File(...),
    anonymize: bool = Form(True)
):
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "Only ZIP archives are allowed")

    zip_bytes = await file.read()
    file_id = str(uuid.uuid4())

    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{file_id}.zip")

    with open(temp_path, "wb") as f:
        f.write(zip_bytes)

    temp_files[file_id] = {"path": temp_path, "anonymize": anonymize}

    volume, metadata = extract_dicom_volume(zip_bytes, anonymize=anonymize)

    print(f"📁 Found {volume.shape[0]} DICOM slices")
    print(f"📊 Volume shape: {volume.shape}")

    return {
        "file_id": file_id,
        "metadata": metadata,
        "volume_shape": list(volume.shape)
    }


@router.post("/start-processing")
async def start_processing(
    file_id: str = Form(...),
    generate_stl: bool = Form(True)
):
    if file_id not in temp_files:
        raise HTTPException(404, "File not found. Please upload first.")

    file_info = temp_files[file_id]
    zip_path = file_info["path"]
    anonymize = file_info["anonymize"]

    job_id = str(uuid.uuid4())

    try:
        print("\n🚀 Starting processing pipeline...")

        with open(zip_path, "rb") as f:
            zip_bytes = f.read()

        volume, metadata = extract_dicom_volume(zip_bytes, anonymize=anonymize)
        print("1. Volume loaded")

        volume_tensor = preprocess_volume(volume)
        print("2. Volume preprocessed")

        mask_volume, prob_volume = run_inference(volume_tensor)
        print("3. Inference done")

        saved = save_segmentation_results(mask_volume, prob_volume, metadata, volume.shape)
        print("4. Results saved")

        result_data = {
            "metadata": metadata,
            "output_files": {k: os.path.basename(v) for k, v in saved.items()},
            "nifti_file": os.path.basename(saved["nifti"]),
        }

        if generate_stl:
            print("5. Starting STL generation...")
            nifti_path = saved["nifti"]
            stl_path = nifti_path.replace(".nii.gz", ".stl")
            stats = create_stl_from_nifti(nifti_path, stl_path)
            result_data["stl_file"] = os.path.basename(stl_path)
            result_data["mesh_stats"] = stats
            print("6. STL generated")

        jobs[job_id] = {"state": "completed", "result": result_data}

        # Cleanup temporary file
        os.unlink(zip_path)
        del temp_files[file_id]

        print("🎉 Pipeline completed successfully\n")
        return {"job_id": job_id}

    except Exception as e:
        print("\n❌ PIPELINE ERROR:")
        traceback.print_exc()
        jobs[job_id] = {"state": "failed", "error": str(e)}
        raise HTTPException(500, detail=str(e))


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        return {"job_id": job_id, "state": "pending"}
    job = jobs[job_id]
    if job["state"] == "completed":
        return {"job_id": job_id, "state": "completed"}
    return {"job_id": job_id, "state": "failed", "error": job.get("error")}


@router.get("/result/{job_id}")
async def get_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    if job["state"] != "completed":
        raise HTTPException(400, "Result not ready")
    return job["result"]


@router.get("/list-segmentations")
async def list_segmentations():
    """List all generated files in the output directory."""
    files = []
    for f in OUTPUT_DIR.iterdir():
        # Accept .stl, .nii.gz, .npy, .json
        if f.suffix in ('.nii.gz', '.npy', '.stl', '.json') or str(f).endswith('.nii.gz'):
            files.append({
                "filename": f.name,
                "size_bytes": f.stat().st_size,
                "size_kb": round(f.stat().st_size / 1024, 2),
                "modified": f.stat().st_mtime
            })
    files.sort(key=lambda x: x['modified'], reverse=True)
    return {"segmentations": files, "count": len(files), "directory": str(OUTPUT_DIR)}


@router.get("/health")
async def health_check():
    return {"status": "healthy"}


@router.get("/download-stl/{filename}")
async def download_stl(filename: str):
    """Download a generated STL file."""
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(400, "Invalid filename")
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, f"File not found: {filename}")
    return FileResponse(str(file_path), media_type="application/vnd.ms-pkistl", filename=filename)

@router.get("/download-nifti/{filename}")
async def download_nifti(filename: str):
    """Download a NIfTI segmentation file."""
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(400, "Invalid filename")
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, f"File not found: {filename}")
    return FileResponse(str(file_path), media_type="application/octet-stream", filename=filename)