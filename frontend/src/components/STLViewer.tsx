import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface STLViewerProps {
  stlUrl: string;
  backgroundColor?: string;
  color?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const STLViewer: React.FC<STLViewerProps> = ({
  stlUrl,
  backgroundColor = 'rgb(238, 238, 241)',
  color = '#4b88ea',
  onLoad,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !stlUrl) return;

    // Capture the current container to a local variable for the cleanup closure
    const container = containerRef.current;
    let animationId: number;
    let mounted = true;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 4. Controls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(1, 2, 1);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-1, -1, -1);
    scene.add(backLight);

    // 6. Grid Helper
    const gridHelper = new THREE.GridHelper(10, 20, 0x3b82f6, 0x2d4a6e);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 7. STL Loading Logic
    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        if (!mounted) return;
        
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        geometry.translate(-center.x, -center.y, -center.z);

        const material = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.3,
          metalness: 0.7,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const maxDim = Math.max(size.x, size.y, size.z);
        const desiredSize = 3.0;
        const scale = maxDim > 0 ? desiredSize / maxDim : 1;
        mesh.scale.set(scale, scale, scale);

        const distance = desiredSize * 1.5;
        camera.position.set(distance, distance * 0.8, distance);
        controls.target.set(0, 0, 0);
        controls.update();

        setLoading(false);
        onLoad?.();
      },
      undefined,
      (err: unknown) => {
        if (!mounted) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    );

    // 8. Animation Loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. CLEANUP (The Critical Fix)
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      controls.dispose();
      renderer.dispose();
      
      // Safety check: only remove if the element is actually still there
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose of geometries and materials to prevent GPU leaks
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [stlUrl, backgroundColor, color]); // Removed onLoad/onError to prevent unnecessary re-mounts

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] relative rounded-lg overflow-hidden"
      style={{ backgroundColor }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 text-white">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span>Loading 3D model...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 text-red-500 p-4 text-center">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default STLViewer;