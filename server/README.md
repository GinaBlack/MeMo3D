# DICOM CT Scan AI Service

A **FastAPI** microservice that accepts a ZIP of DICOM CT scan files, runs tissue **segmentation** and **3-D surface reconstruction**, and returns a downloadable mesh (STL / OBJ / PLY / VTK) plus an optional PNG preview.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **Python 3.10 – 3.12** | VTK 9.x wheels are available for these versions |
| **pip** | Comes with Python |
| ~2 GB free disk | VTK is a large package (~400 MB) |

> **Windows users:** Python 3.11 is recommended. Install from [python.org](https://www.python.org/downloads/) and make sure *"Add Python to PATH"* is checked.

---

## Quickstart

### macOS / Linux

```bash
cd dicom-ai-service
bash run.sh
```

`run.sh` will automatically:
1. Create a `.venv` virtual environment
2. Install all dependencies
3. Copy `.env.example → .env`
4. Create `uploads/` and `outputs/` directories
5. Start the server with hot-reload

### Windows

```cmd
cd dicom-ai-service
run.bat
```

### Manual setup (any OS)

```bash
python -m venv .venv

# Activate
source .venv/bin/activate          # macOS / Linux
.venv\Scripts\activate             # Windows

pip install -r requirements.txt

cp .env.example .env
mkdir uploads outputs

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Once running, open:
- **API:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs

---

## Project Structure

```
dicom-ai-service/
├── main.py                        # FastAPI app entry point
├── run.sh / run.bat               # One-command local launchers
├── requirements.txt
├── .env.example
│
├── app/
│   ├── api/routes.py              # All HTTP endpoints
│   ├── core/config.py             # Settings loaded from .env
│   ├── models/schemas.py          # Pydantic request/response models
│   └── services/
│       ├── dicom_loader.py        # pydicom: load & sort slices → NumPy
│       ├── segmentation.py        # NumPy + SciPy: HU threshold + morphology
│       ├── reconstruction.py      # VTK: Marching Cubes → smooth → mesh file
│       └── job_manager.py         # Async job queue + in-memory job store
│
└── tests/
    ├── test_api.py                # Integration tests
    └── test_services.py           # Unit tests
```

---

## Pipeline

```
POST /api/v1/upload  (ZIP)
  → Unzip & discover DICOM slices
  → Sort by ImagePositionPatient Z  (pydicom)
  → Apply RescaleSlope/Intercept → Hounsfield Units
  → Stack into (Z, Y, X) float32 NumPy volume
  → HU threshold by tissue type  (numpy + scipy)
  → Binary closing + largest component filter
  → vtkImageData with real mm voxel spacing  (VTK)
  → Marching Cubes iso-surface
  → Laplacian smoothing
  → vtkDecimatePro mesh reduction
  → Recompute normals
  → Write STL / OBJ / PLY / VTK
  → Off-screen PNG preview

GET /api/v1/jobs/{id}              ← poll progress 0–100%
GET /api/v1/jobs/{id}/download/mesh
GET /api/v1/jobs/{id}/download/preview
```

---

## API Reference

### `POST /api/v1/upload`

| Field | Type | Default | Description |
|---|---|---|---|
| `file` | file | **required** | `.zip` containing `.dcm` slices |
| `tissue_type` | string | `bone` | `bone` / `soft_tissue` / `lung` / `custom` |
| `hu_min` | int | — | Custom HU min (`tissue_type=custom` only) |
| `hu_max` | int | — | Custom HU max (`tissue_type=custom` only) |
| `iso_value` | float | `300.0` | Marching Cubes iso-surface override |
| `output_format` | string | `stl` | `stl` / `obj` / `ply` / `vtk` |
| `apply_smoothing` | bool | `true` | Laplacian smoothing pass |
| `apply_decimation` | bool | `true` | Mesh decimation pass |
| `decimation_reduction` | float | `0.5` | Fraction of triangles to remove (0–0.95) |

### `GET /api/v1/jobs/{job_id}`
Poll status. Returns `progress` (0–100), `status`, and `result` when complete.

### `GET /api/v1/jobs/{job_id}/download/mesh`
Download finished mesh file.

### `GET /api/v1/jobs/{job_id}/download/preview`
Download PNG preview render.

### `GET /api/v1/jobs` / `DELETE /api/v1/jobs/{job_id}`
List or delete jobs.

---

## HU Window Presets

| Tissue | HU Min | HU Max |
|---|---|---|
| `bone` | 200 | 1500 |
| `soft_tissue` | -100 | 300 |
| `lung` | -1000 | -500 |
| `custom` | user-defined | user-defined |

All presets are overridable in `.env`.

---

## Front-End Integration (JavaScript)

```javascript
// 1 – Upload
const form = new FormData();
form.append("file", zipInput.files[0]);
form.append("tissue_type", "bone");
form.append("output_format", "stl");

const { job_id } = await fetch("http://localhost:8000/api/v1/upload", {
  method: "POST", body: form,
}).then(r => r.json());

// 2 – Poll
let result;
while (true) {
  const job = await fetch(`http://localhost:8000/api/v1/jobs/${job_id}`).then(r => r.json());
  console.log(`[${job.progress}%] ${job.message}`);
  if (job.status === "completed") { result = job.result; break; }
  if (job.status === "failed")    { throw new Error(job.message); }
  await new Promise(r => setTimeout(r, 2000));
}

// 3 – Download mesh
const blob = await fetch(result.mesh_file).then(r => r.blob());
const a = Object.assign(document.createElement("a"), {
  href: URL.createObjectURL(blob), download: "ct_model.stl",
});
a.click();
```

---

## Running Tests

```bash
source .venv/bin/activate    # or .venv\Scripts\activate on Windows
pytest tests/ -v
```

---

## Troubleshooting

**`vtk` fails to install**
VTK 9.x wheels exist for Python 3.10–3.12 only. If you are on 3.13+, switch to Python 3.11.

**Preview PNG is missing**
Off-screen rendering needs Mesa/OpenGL. On Linux: `sudo apt install libgl1 libglib2.0-0`. On Windows/macOS it is usually already present.

**Job stuck at `queued`**
`MAX_CONCURRENT_JOBS` in `.env` may be saturated. Each large scan (512³) can take 30–90 s.
