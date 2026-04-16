'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { extractSilhouette, Point } from '@/lib/silhouette';

export type DetectedObject = {
  label: string;
  bbox: [number, number, number, number];
  dominant_color: string;
};

type Silhouette = {
  points: Point[];
  width: number;
  height: number;
  color: string;
  label: string;
};

export default function SilhouetteShowcase({
  imageUrl,
  objects,
}: {
  imageUrl: string;
  objects: DetectedObject[];
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [silhouettes, setSilhouettes] = useState<Silhouette[]>([]);

  // Extract silhouettes once when image + objects arrive
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results: Silhouette[] = [];
      for (const obj of objects) {
        try {
          const sil = await extractSilhouette(imageUrl, obj.bbox, 128);
          if (cancelled) return;
          if (sil && sil.points.length >= 6) {
            results.push({
              points: sil.points,
              width: sil.width,
              height: sil.height,
              color: obj.dominant_color || sil.averageColor,
              label: obj.label,
            });
          } else {
            // Fallback: a simple rounded rect shape using bbox dimensions
            const [, , bw, bh] = obj.bbox;
            const rectW = Math.max(30, bw * 200);
            const rectH = Math.max(30, bh * 200);
            results.push({
              points: rectPoints(rectW, rectH),
              width: rectW,
              height: rectH,
              color: obj.dominant_color || '#8B6F4E',
              label: obj.label + ' (approx)',
            });
          }
        } catch {
          // Fallback rect
          const [, , bw, bh] = obj.bbox;
          const rectW = Math.max(30, bw * 200);
          const rectH = Math.max(30, bh * 200);
          results.push({
            points: rectPoints(rectW, rectH),
            width: rectW,
            height: rectH,
            color: obj.dominant_color || '#8B6F4E',
            label: obj.label + ' (approx)',
          });
        }
      }
      if (!cancelled) setSilhouettes(results);
    })();
    return () => { cancelled = true; };
  }, [imageUrl, objects]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || silhouettes.length === 0) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    if (!width || !height) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5F1E8);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xFFFFFF, 0.55));
    const key = new THREE.DirectionalLight(0xFFFAF0, 1.1);
    key.position.set(3, 4, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8FB8E0, 0.35);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    // Ground: blueprint grid
    const grid = new THREE.GridHelper(8, 16, 0x0051BA, 0x0051BA);
    (grid.material as THREE.Material).opacity = 0.15;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -1.2;
    scene.add(grid);

    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 32), shadowMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build extruded mesh for each silhouette
    const groups: THREE.Group[] = [];
    const TARGET_SIZE = 1.2; // world units

    silhouettes.forEach((sil) => {
      const shape = new THREE.Shape();
      // Silhouette points are in pixel space with Y going down. Flip Y, center, and scale.
      const cx = sil.width / 2;
      const cy = sil.height / 2;
      const scale = TARGET_SIZE / Math.max(sil.width, sil.height);
      shape.moveTo(
        (sil.points[0].x - cx) * scale,
        -(sil.points[0].y - cy) * scale
      );
      for (let i = 1; i < sil.points.length; i++) {
        shape.lineTo(
          (sil.points[i].x - cx) * scale,
          -(sil.points[i].y - cy) * scale
        );
      }
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 6,
      });
      geom.center();

      const mat = new THREE.MeshStandardMaterial({
        color: parseColor(sil.color),
        roughness: 0.6,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Outline edges for blueprint feel
      const edges = new THREE.EdgesGeometry(geom, 30);
      const edgeLines = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x0A0A0A, opacity: 0.4, transparent: true })
      );

      const group = new THREE.Group();
      group.add(mesh);
      group.add(edgeLines);
      scene.add(group);
      groups.push(group);
    });

    // Orbital choreography: each object orbits a shared centre at different radii
    // and phases, while also rotating on its own axis. Creates the "around each
    // other" dance effect.
    let rafId = 0;
    let t = 0;
    const radii = [1.2, 0.6, 1.0];
    const speeds = [0.5, 0.8, 0.35];
    const heights = [0.3, -0.2, 0.5];
    const phases = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

    const animate = () => {
      t += 0.012;
      groups.forEach((g, i) => {
        const angle = t * speeds[i] + phases[i];
        g.position.x = Math.cos(angle) * radii[i];
        g.position.z = Math.sin(angle) * radii[i];
        g.position.y = heights[i] + Math.sin(t * 0.7 + phases[i]) * 0.15;
        // Spin around Y plus a gentle tilt
        g.rotation.y = t * 0.7 + phases[i];
        g.rotation.x = Math.sin(t * 0.4 + phases[i]) * 0.2;
      });
      // Camera slowly orbits the whole scene too
      camera.position.x = Math.sin(t * 0.12) * 5;
      camera.position.z = Math.cos(t * 0.12) * 5;
      camera.position.y = 1.2 + Math.sin(t * 0.08) * 0.2;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [silhouettes]);

  return (
    <div className="relative border-2 border-black bg-white p-2">
      <div ref={mountRef} className="bg-[#F5F1E8] w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}/>
      <div className="f-mono text-[10px] tracking-widest mt-2 opacity-60 px-1 flex flex-wrap gap-2 justify-between">
        <span>TRACED FROM THE PHOTO</span>
        <span className="truncate">
          {silhouettes.length > 0
            ? silhouettes.map(s => s.label).join(' · ')
            : 'extracting silhouettes…'}
        </span>
      </div>
    </div>
  );
}

function rectPoints(w: number, h: number): Point[] {
  const r = Math.min(w, h) * 0.12;
  const pts: Point[] = [];
  const steps = 5;
  // top-left corner arc
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (i / steps) * (Math.PI / 2);
    pts.push({ x: r + Math.cos(a) * r, y: r + Math.sin(a) * r });
  }
  // top-right
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push({ x: w - r + Math.cos(a) * r, y: r + Math.sin(a) * r });
  }
  // bottom-right
  for (let i = 0; i <= steps; i++) {
    const a = 0 + (i / steps) * (Math.PI / 2);
    pts.push({ x: w - r + Math.cos(a) * r, y: h - r + Math.sin(a) * r });
  }
  // bottom-left
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push({ x: r + Math.cos(a) * r, y: h - r + Math.sin(a) * r });
  }
  return pts;
}

function parseColor(c: string): THREE.Color {
  try {
    return new THREE.Color(c);
  } catch {
    return new THREE.Color(0x8B6F4E);
  }
}
