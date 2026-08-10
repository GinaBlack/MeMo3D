"""
3-D Reconstruction Service
==========================
Converts a binary segmentation mask into a surface mesh using VTK's
Marching Cubes algorithm, then optionally smooths and decimates it,
and exports to the requested format (STL / OBJ / PLY / VTK).
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import vtk
from vtk.util import numpy_support

from app.core.config import settings
from app.models.schemas import OutputFormat, SegmentationConfig

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _numpy_volume_to_vtk_image(
    volume: np.ndarray,
    spacing: Tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> vtk.vtkImageData:
    """
    Convert a (Z, Y, X) float32 NumPy array to a vtkImageData object.
    VTK stores data in (X, Y, Z) order (Fortran-order for the flat array).
    """
    z, y, x = volume.shape
    image = vtk.vtkImageData()
    image.SetDimensions(x, y, z)
    image.SetSpacing(spacing[2], spacing[1], spacing[0])   # (dx, dy, dz)
    image.SetOrigin(0.0, 0.0, 0.0)

    flat = volume.ravel(order="F").astype(np.float32)
    vtk_array = numpy_support.numpy_to_vtk(flat, deep=True, array_type=vtk.VTK_FLOAT)
    vtk_array.SetName("HounsfieldUnits")
    image.GetPointData().SetScalars(vtk_array)
    return image


def _get_mesh_stats(poly: vtk.vtkPolyData) -> dict:
    return {
        "num_points":    poly.GetNumberOfPoints(),
        "num_triangles": poly.GetNumberOfCells(),
        "bounds": {
            "x_min": poly.GetBounds()[0], "x_max": poly.GetBounds()[1],
            "y_min": poly.GetBounds()[2], "y_max": poly.GetBounds()[3],
            "z_min": poly.GetBounds()[4], "z_max": poly.GetBounds()[5],
        },
    }


# ── marching cubes ────────────────────────────────────────────────────────────

def _run_marching_cubes(
    image: vtk.vtkImageData,
    iso_value: float,
) -> vtk.vtkPolyData:
    logger.info("Running Marching Cubes  iso=%.1f …", iso_value)
    mc = vtk.vtkMarchingCubes()
    mc.SetInputData(image)
    mc.SetValue(0, iso_value)
    mc.ComputeNormalsOn()
    mc.Update()
    poly = mc.GetOutput()
    logger.info(
        "Marching Cubes → %d points, %d cells",
        poly.GetNumberOfPoints(),
        poly.GetNumberOfCells(),
    )
    return poly


# ── post-processing ───────────────────────────────────────────────────────────

def _smooth_mesh(
    poly: vtk.vtkPolyData,
    iterations: int,
    relaxation: float,
) -> vtk.vtkPolyData:
    logger.info("Smoothing (%d iterations, relaxation=%.2f) …", iterations, relaxation)
    smoother = vtk.vtkSmoothPolyDataFilter()
    smoother.SetInputData(poly)
    smoother.SetNumberOfIterations(iterations)
    smoother.SetRelaxationFactor(relaxation)
    smoother.FeatureEdgeSmoothingOff()
    smoother.BoundarySmoothingOn()
    smoother.Update()
    return smoother.GetOutput()


def _decimate_mesh(
    poly: vtk.vtkPolyData,
    reduction: float,
) -> vtk.vtkPolyData:
    logger.info("Decimating (reduction=%.2f) …", reduction)
    dec = vtk.vtkDecimatePro()
    dec.SetInputData(poly)
    dec.SetTargetReduction(reduction)
    dec.PreserveTopologyOn()
    dec.Update()
    result = dec.GetOutput()
    logger.info(
        "After decimation → %d points, %d cells",
        result.GetNumberOfPoints(),
        result.GetNumberOfCells(),
    )
    return result


def _recompute_normals(poly: vtk.vtkPolyData) -> vtk.vtkPolyData:
    normals = vtk.vtkPolyDataNormals()
    normals.SetInputData(poly)
    normals.ConsistencyOn()
    normals.SplittingOff()
    normals.Update()
    return normals.GetOutput()


# ── writers ───────────────────────────────────────────────────────────────────

def _write_mesh(
    poly: vtk.vtkPolyData,
    output_path: Path,
    fmt: OutputFormat,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if fmt == OutputFormat.stl:
        writer = vtk.vtkSTLWriter()
        writer.SetFileTypeToBinary()
    elif fmt == OutputFormat.obj:
        writer = vtk.vtkOBJWriter()
    elif fmt == OutputFormat.ply:
        writer = vtk.vtkPLYWriter()
        writer.SetFileTypeToBinary()
    elif fmt == OutputFormat.vtk:
        writer = vtk.vtkPolyDataWriter()
        writer.SetFileTypeToBinary()
    else:
        raise ValueError(f"Unsupported output format: {fmt}")

    writer.SetFileName(str(output_path))
    writer.SetInputData(poly)
    writer.Write()
    logger.info("Mesh written → %s  (%.1f KB)", output_path, output_path.stat().st_size / 1024)


# ── optional PNG screenshot ───────────────────────────────────────────────────

def _render_preview(
    poly: vtk.vtkPolyData,
    output_path: Path,
) -> Optional[Path]:
    """
    Render an off-screen PNG thumbnail of the mesh.
    Gracefully skips if no display is available.
    """
    try:
        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputData(poly)

        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        actor.GetProperty().SetColor(0.85, 0.85, 0.85)
        actor.GetProperty().SetSpecular(0.5)
        actor.GetProperty().SetSpecularPower(50)

        renderer = vtk.vtkRenderer()
        renderer.AddActor(actor)
        renderer.SetBackground(0.1, 0.1, 0.15)
        renderer.ResetCamera()

        camera = renderer.GetActiveCamera()
        camera.Elevation(20)
        camera.Azimuth(45)
        renderer.ResetCameraClippingRange()

        render_window = vtk.vtkRenderWindow()
        render_window.SetOffScreenRendering(1)
        render_window.SetSize(800, 600)
        render_window.AddRenderer(renderer)
        render_window.Render()

        w2i = vtk.vtkWindowToImageFilter()
        w2i.SetInput(render_window)
        w2i.Update()

        writer = vtk.vtkPNGWriter()
        writer.SetFileName(str(output_path))
        writer.SetInputConnection(w2i.GetOutputPort())
        writer.Write()

        logger.info("Preview rendered → %s", output_path)
        return output_path
    except Exception as exc:
        logger.warning("Preview render skipped: %s", exc)
        return None


# ── public API ────────────────────────────────────────────────────────────────

def reconstruct_3d(
    volume: np.ndarray,
    config: SegmentationConfig,
    job_id: str,
    pixel_spacing: Optional[list] = None,
    slice_thickness: Optional[float] = None,
) -> Tuple[Path, Optional[Path], dict]:
    """
    Full reconstruction pipeline:
      1. NumPy → vtkImageData
      2. Marching Cubes
      3. (optional) Laplacian smoothing
      4. (optional) Mesh decimation
      5. Normal recomputation
      6. Write mesh file
      7. (optional) Off-screen preview PNG

    Returns
    -------
    mesh_path    : Path to saved mesh file
    preview_path : Path to PNG preview (or None)
    stats        : dict with mesh statistics + timing
    """
    t0 = time.perf_counter()

    # ── voxel spacing ─────────────────────────────────────────────────────────
    ps_row = float(pixel_spacing[0]) if pixel_spacing else 1.0
    ps_col = float(pixel_spacing[1]) if pixel_spacing else 1.0
    st     = float(slice_thickness)  if slice_thickness else 1.0
    spacing = (st, ps_row, ps_col)   # (dz, dy, dx)

    # ── iso-value ─────────────────────────────────────────────────────────────
    iso_value = config.iso_value if config.iso_value is not None else settings.DEFAULT_ISO_VALUE

    # ── convert to VTK ────────────────────────────────────────────────────────
    image = _numpy_volume_to_vtk_image(volume, spacing=spacing)

    # ── marching cubes ────────────────────────────────────────────────────────
    poly = _run_marching_cubes(image, iso_value)

    if poly.GetNumberOfPoints() == 0:
        raise RuntimeError(
            f"Marching Cubes produced an empty mesh at iso_value={iso_value}. "
            "Try adjusting the HU window or iso_value."
        )

    # ── smoothing ─────────────────────────────────────────────────────────────
    if config.apply_smoothing:
        poly = _smooth_mesh(
            poly,
            iterations=settings.SMOOTHING_ITERATIONS,
            relaxation=settings.SMOOTHING_RELAXATION,
        )

    # ── decimation ────────────────────────────────────────────────────────────
    if config.apply_decimation:
        reduction = (
            config.decimation_reduction
            if config.decimation_reduction is not None
            else settings.DECIMATION_REDUCTION
        )
        poly = _decimate_mesh(poly, reduction)

    poly = _recompute_normals(poly)

    # ── persist mesh ──────────────────────────────────────────────────────────
    ext = config.output_format.value
    mesh_path = settings.OUTPUT_DIR / job_id / f"model.{ext}"
    _write_mesh(poly, mesh_path, config.output_format)

    # ── preview PNG ───────────────────────────────────────────────────────────
    preview_path = _render_preview(
        poly, settings.OUTPUT_DIR / job_id / "preview.png"
    )

    elapsed = time.perf_counter() - t0
    stats = _get_mesh_stats(poly)
    stats["reconstruction_time_s"] = round(elapsed, 2)

    logger.info("Reconstruction complete in %.2f s", elapsed)
    return mesh_path, preview_path, stats
