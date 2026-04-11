"""
3‑D Reconstruction Service using scikit‑image marching cubes + numpy‑stl
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
from skimage import measure
from stl import mesh as stl_mesh

from core.config import settings
from models.schemas import OutputFormat, SegmentationConfig

logger = logging.getLogger(__name__)


def reconstruct_3d(
    volume: np.ndarray,
    config: SegmentationConfig,
    job_id: str,
    pixel_spacing: Optional[list] = None,
    slice_thickness: Optional[float] = None,
) -> Tuple[Path, Optional[Path], dict]:
    """
    Full reconstruction pipeline using skimage marching cubes.
    Returns (mesh_path, preview_path, stats).
    """
    t0 = time.perf_counter()

    # --- 1. Determine iso‑value (auto if not provided) ---
    if config.iso_value is not None:
        iso = config.iso_value
    else:
        # Use 30th percentile of non‑background HU values
        non_bg = volume[volume > volume.min()]
        if len(non_bg) > 0:
            iso = np.percentile(non_bg, 30)
        else:
            iso = settings.DEFAULT_ISO_VALUE
        logger.info(f"Auto iso-value = {iso:.2f}")

    # --- 2. Run marching cubes on the volume ---
    #   volume is assumed to be in Hounsfield Units (float32)
    #   marching_cubes expects a 3D array; returns vertices, faces, normals, values
    try:
        verts, faces, normals, _ = measure.marching_cubes(
            volume, level=iso, spacing=(1.0, 1.0, 1.0)  # we'll apply real spacing later
        )
    except Exception as e:
        raise RuntimeError(f"Marching cubes failed: {e}")

    if len(verts) == 0 or len(faces) == 0:
        raise RuntimeError(f"Marching cubes produced empty mesh at iso={iso:.2f}")

    logger.info(f"Marching cubes → {len(verts)} vertices, {len(faces)} faces")

    # --- 3. Apply physical spacing (voxel to mm) ---
    if pixel_spacing and len(pixel_spacing) >= 2:
        dx = float(pixel_spacing[0])  # mm per pixel in X
        dy = float(pixel_spacing[1])  # mm per pixel in Y
    else:
        dx = dy = 1.0
    dz = float(slice_thickness) if slice_thickness else 1.0

    # Scale vertices: original marching cubes output uses voxel indices (z,y,x)
    # We need to map to physical coordinates (x,y,z) with mm spacing.
    # verts shape: (N, 3) where columns are (row, col, ?) Actually skimage gives (z, y, x)
    # We'll reorder to (x, y, z) and scale.
    verts_physical = np.zeros_like(verts)
    verts_physical[:, 0] = verts[:, 2] * dx   # x = column index * pixel spacing X
    verts_physical[:, 1] = verts[:, 1] * dy   # y = row index * pixel spacing Y
    verts_physical[:, 2] = verts[:, 0] * dz   # z = slice index * slice thickness

    # --- 4. Optional smoothing / decimation ---
    # skimage marching cubes does not include built‑in smoothing/decimation.
    # For simplicity we skip them here. You can add external libraries (e.g., pyvista) if needed.
    # For now, we just use the raw mesh.

    # --- 5. Save as STL using numpy-stl ---
    # numpy-stl expects faces in (N,3,3) format: each face is 3 vertices
    stl_verts = verts_physical[faces]  # shape (N, 3, 3)
    mesh = stl_mesh.Mesh(np.zeros(len(stl_verts), dtype=stl_mesh.Mesh.dtype))
    for i, face in enumerate(stl_verts):
        mesh.vectors[i] = face

    ext = config.output_format.value
    mesh_path = settings.OUTPUT_DIR / job_id / f"model_{job_id}.{ext}"
    mesh_path.parent.mkdir(parents=True, exist_ok=True)
    mesh.save(str(mesh_path))
    logger.info(f"Mesh saved → {mesh_path} ({mesh_path.stat().st_size / 1024:.1f} KB)")

    # --- 6. Preview (optional) – skip because we don’t have VTK renderer anymore ---
    # You could generate a simple preview using matplotlib (off‑screen) if needed.
    preview_path = None
    logger.info("Preview generation skipped (no VTK).")

    elapsed = time.perf_counter() - t0
    stats = {
        "num_points": len(verts),
        "num_triangles": len(faces),
        "reconstruction_time_s": round(elapsed, 2),
        "iso_value": float(iso),
    }
    logger.info(f"Reconstruction done in {elapsed:.2f} s")
    return mesh_path, preview_path, stats