# DICOM CT Scan AI Service v2

FastAPI microservice for DICOM CT scan **segmentation** and **3D reconstruction**.
Accepts a ZIP of DICOM files, runs tissue segmentation (HU threshold or MONAI UNet AI),
reconstructs a 3D mesh with VTK, and exports STL / OBJ / PLY / NIfTI.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Python** | 3.10, 3.11, or 3.12 | VTK has no wheel for 3.13+ |
| **pip** | latest | `python -m pip install --upgrade pip` |
| **Disk space** | ~2 GB | VTK + PyTorch are large packages |

Check your Python version first:
```cmd
python --version
```
If it shows 3.13 or higher, install Python 3.11 from https://www.python.org/downloads/ and use that.

---

## Quickstart

### Windows (recommended)
```cmd
cd dicom-ai-service
run.bat
```
That's it. `run.bat` handles everything automatically.

### macOS / Linux
```bash
cd dicom-ai-service
bash run.sh
```

### Manual setup (any OS)
```bash
# 1. Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# 2. Install PyTorch FIRST (CPU build - works on any machine)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# 3. Install everything else
pip install -r requirements.txt

# 4. Create .env and data directories
copy .env.example .env       # Windows
cp .env.example .env         # macOS/Linux

mkdir uploads
mkdir outputs

# 5. Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Once running:
- **API:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health

---

## Project Structure

```
dicom-ai-service/
├── main.py                          # FastAPI app, Windows asyncio fix, CORS
├── run.bat                          # Windows one-command launcher
├── run.sh                           # macOS/Linux one-command launcher
├── requirements.txt
├── .env.example                     # All configurable settings
│
├── app/
│   ├── api/
│   │   └── routes.py                # ALL HTTP endpoints
│   ├── core/
│   │   └── config.py                # Settings + DEVICE + ANONYMIZE_TAGS
│   ├── models/
│   │   └── schemas.py               # Pydantic request/response models
│   └── services/
│       ├── dicom_loader.py          # ZIP extraction, sort, HU rescale, anonymize, metadata
│       ├── segmentation.py          # HU threshold + MONAI UNet AI inference
│       ├── reconstruction.py        # VTK: Marching Cubes → smooth → decimate → export
│       ├── file_utils.py            # NIfTI / NPY / JSON output saving
│       └── job_manager.py           # Async job queue, two-step + single-shot flows
│
└── tests/
    ├── test_api.py                  # HTTP integration tests
    └── test_services.py             # Unit tests (segmentation, anonymizer, helpers)
```

---

## API Endpoints

### Two-Step Flow (preserves your original front-end flow)

**Step 1 – Get metadata without processing:**
```
POST /api/v1/upload-metadata
Form: file (ZIP), anonymize (bool, default true)
Returns: { file_id, metadata, volume_shape }
```

**Step 2 – Start reconstruction:**
```
POST /api/v1/start-processing
Form: file_id, tissue_type, output_format, use_ai, ...
Returns: { job_id, status, message }
```

### Single-Shot Flow
```
POST /api/v1/upload
Form: file (ZIP), tissue_type, output_format, use_ai, ...
Returns: { job_id, status, message }
```

### Polling
```
GET /api/v1/jobs/{job_id}            → { status, progress (0-100), message, result }
GET /api/v1/status/{job_id}          → simple state string (legacy)
GET /api/v1/result/{job_id}          → full result when complete (legacy)
```

### Downloads
```
GET /api/v1/jobs/{job_id}/download/mesh      → STL / OBJ / PLY file
GET /api/v1/jobs/{job_id}/download/nifti     → NIfTI .nii.gz mask
GET /api/v1/jobs/{job_id}/download/preview   → PNG preview render
GET /api/v1/download-stl/{filename}          → by filename (legacy)
GET /api/v1/download-nifti/{filename}        → by filename (legacy)
```

### Admin
```
GET    /api/v1/jobs                  → list all jobs
DELETE /api/v1/jobs/{job_id}         → delete job + files
GET    /api/v1/list-segmentations    → list all output files (legacy)
GET    /api/v1/health
```

---

## Tissue Types & HU Windows

| tissue_type | HU Min | HU Max |
|---|---|---|
| `bone` | 200 | 1500 |
| `soft_tissue` | -100 | 300 |
| `lung` | -1000 | -500 |
| `custom` | you set `hu_min` | you set `hu_max` |

---

## Segmentation Modes

### HU Threshold (default, `use_ai=false`)
Fast, no model needed. Uses Hounsfield Unit range + morphological cleanup.

### AI Model (`use_ai=true`)
Slice-by-slice MONAI UNet inference. Requires:
1. `pip install monai` (already in requirements.txt)
2. A trained weights file – set `MODEL_WEIGHTS_PATH=path/to/weights.pth` in `.env`

If no weights file is set, the model runs with random weights (not useful clinically).
If the AI mask looks wrong (< 1% or > 50% of volume), it automatically falls back to
raising the threshold to 0.8.

---

## Anonymization

Enabled by default (`anonymize=true`). Removes or replaces:
- PatientName → `ANONYMOUS`
- PatientBirthDate, StudyDate, StudyTime
- AccessionNumber, InstitutionName, ReferringPhysicianName
- StudyInstanceUID, SeriesInstanceUID

**Preserved:** PatientID and PatientSex (as per your original config).

---

## Front-End Integration (JavaScript)

### Two-step flow:
```javascript
// Step 1 – get metadata
const form1 = new FormData();
form1.append("file", zipInput.files[0]);
form1.append("anonymize", "true");

const { file_id, metadata, volume_shape } = await fetch(
  "http://localhost:8000/api/v1/upload-metadata",
  { method: "POST", body: form1 }
).then(r => r.json());

console.log("Patient:", metadata.patient_name, "Slices:", volume_shape[0]);

// Step 2 – start processing
const form2 = new FormData();
form2.append("file_id",       file_id);
form2.append("tissue_type",   "bone");
form2.append("output_format", "stl");
form2.append("use_ai",        "false");

const { job_id } = await fetch(
  "http://localhost:8000/api/v1/start-processing",
  { method: "POST", body: form2 }
).then(r => r.json());

// Poll for completion
let result;
while (true) {
  const job = await fetch(`http://localhost:8000/api/v1/jobs/${job_id}`).then(r => r.json());
  console.log(`[${job.progress}%] ${job.message}`);
  if (job.status === "completed") { result = job.result; break; }
  if (job.status === "failed")    { throw new Error(job.message); }
  await new Promise(r => setTimeout(r, 2000));
}

// Download mesh
const blob = await fetch(result.mesh_file).then(r => r.blob());
const a = Object.assign(document.createElement("a"), {
  href: URL.createObjectURL(blob), download: "model.stl"
});
a.click();
```

---

## Running Tests

```bash
# Activate venv first
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux

pytest tests/ -v
```

---

## Configuration (.env)

| Variable | Default | Description |
|---|---|---|
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `ALLOWED_ORIGINS` | `["*"]` | CORS origins |
| `UPLOAD_DIR` | `uploads` | Temp upload directory |
| `OUTPUT_DIR` | `outputs` | Output files directory |
| `MAX_UPLOAD_SIZE_MB` | `500` | ZIP size limit |
| `HU_BONE_MIN/MAX` | `200/1500` | Bone HU window |
| `HU_SOFT_TISSUE_MIN/MAX` | `-100/300` | Soft tissue HU window |
| `HU_LUNG_MIN/MAX` | `-1000/-500` | Lung HU window |
| `DEFAULT_ISO_VALUE` | `300.0` | Marching Cubes iso-surface |
| `SMOOTHING_ITERATIONS` | `15` | VTK Laplacian smoothing passes |
| `DECIMATION_REDUCTION` | `0.5` | Fraction of triangles to remove |
| `MODEL_WEIGHTS_PATH` | _(empty)_ | Path to .pth weights file |
| `SEGMENTATION_THRESHOLD` | `0.5` | AI model probability threshold |
| `INFERENCE_BATCH_SIZE` | `2` | Slices per AI inference batch |
| `MAX_CONCURRENT_JOBS` | `3` | Parallel reconstruction limit |

---

## Troubleshooting

**VTK fails to install**
Your Python version must be 3.10, 3.11, or 3.12. Run `python --version`.

**`ModuleNotFoundError: torch`**
Install PyTorch before requirements.txt:
```cmd
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

**Preview PNG missing**
Off-screen rendering needs OpenGL. On a normal Windows/macOS dev machine this is
already present. On Linux run: `sudo apt install libgl1 libglib2.0-0`

**Job stays at `queued` forever**
Check `MAX_CONCURRENT_JOBS` in `.env`. Each job runs in a thread pool; large
512³ scans can take 30-90 seconds. Watch the server console for progress logs.

**`Error: AI model is not available`**
Either install MONAI (`pip install monai`) or use `use_ai=false` (HU threshold).
