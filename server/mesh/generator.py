import os
import numpy as np
import trimesh
from skimage import measure
import nibabel as nib

def create_stl_from_nifti(
    nifti_path,
    output_stl_path,
    voxel_spacing=(1.0, 1.0, 1.0),
    downsample_factor=2,
    target_faces=50000
):
    print(f"📂 Loading: {nifti_path}")

    img = nib.load(nifti_path)
    mask = img.get_fdata()
    mask = (mask > 0.5).astype(np.uint8)

    if mask.sum() == 0:
        raise ValueError("Mask is empty")

    # Downsample for speed
    if downsample_factor > 1:
        mask = mask[::downsample_factor, ::downsample_factor, ::downsample_factor]
        voxel_spacing = tuple(v * downsample_factor for v in voxel_spacing)
        print(f"⚡ Downsampled volume by factor {downsample_factor}")

    print("🧊 Running marching cubes...")
    verts, faces, _, _ = measure.marching_cubes(
        mask,
        level=0.5,
        spacing=voxel_spacing,
        method='lewiner'
    )

    mesh = trimesh.Trimesh(vertices=verts, faces=faces)
    mesh.merge_vertices()

    # Keep largest component
    components = mesh.split()
    if len(components) > 1:
        mesh = max(components, key=lambda x: x.area)

    # Fill holes if not watertight
    if not mesh.is_watertight:
        mesh.fill_holes()

    # Simplify if too many faces
    if len(mesh.faces) > target_faces:
        print(f"🔻 Reducing mesh to ~{target_faces} faces...")
        mesh = mesh.simplify_quadratic_decimation(target_faces)

    mesh.export(output_stl_path)
    size_kb = os.path.getsize(output_stl_path) / 1024
    print(f"✅ STL saved: {output_stl_path} ({size_kb:.1f} KB)")

    return {
        "vertices": len(mesh.vertices),
        "faces": len(mesh.faces),
        "file_size_kb": size_kb,
        "watertight": mesh.is_watertight
    }