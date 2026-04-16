'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OBJECT_RECIPES, ObjectType } from '@/lib/objects';

export type DetectedObject = {
  type: ObjectType;
  color: string;
  label: string;
};

export default function ObjectShowcase({ objects }: { objects: DetectedObject[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    if (!width || !height) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5F1E8);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 4.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lighting — warm key + cool fill, IKEA-ish
    scene.add(new THREE.AmbientLight(0xFFFFFF, 0.5));
    const key = new THREE.DirectionalLight(0xFFFAF0, 1.0);
    key.position.set(3, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8FB8E0, 0.4);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    // Ground plane — receives shadows only, low-poly circular pad
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 24), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // A subtle blue grid on the ground for the blueprint vibe
    const grid = new THREE.GridHelper(6, 12, 0x0051BA, 0x0051BA);
    (grid.material as THREE.Material).opacity = 0.15;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -1;
    scene.add(grid);

    // Build objects
    const groups: THREE.Group[] = [];
    const positions = [
      new THREE.Vector3(-1.3, 0, 0),
      new THREE.Vector3( 0,   0.3, 0),
      new THREE.Vector3( 1.3, 0, 0),
    ];

    objects.forEach((obj, i) => {
      const recipe = OBJECT_RECIPES[obj.type];
      if (!recipe) return;
      const g = recipe(obj.color);
      g.position.copy(positions[i]);
      g.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(g);
      groups.push(g);
    });

    // Animation — each object drifts with its own rhythm
    let rafId = 0;
    let t = 0;
    const orbitR = 0.25;
    const animate = () => {
      t += 0.01;
      groups.forEach((g, i) => {
        const phase = i * 2.1;
        g.rotation.y = t * 0.4 + phase;
        g.rotation.x = Math.sin(t * 0.3 + phase) * 0.15;
        // Gentle bob + sway
        g.position.y = positions[i].y + Math.sin(t * 0.8 + phase) * orbitR;
        g.position.x = positions[i].x + Math.cos(t * 0.4 + phase) * 0.1;
      });
      // Camera slowly circles too
      camera.position.x = Math.sin(t * 0.15) * 4.5;
      camera.position.z = Math.cos(t * 0.15) * 4.5;
      camera.position.y = 1.5 + Math.sin(t * 0.1) * 0.3;
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
  }, [objects]);

  return (
    <div className="relative border-2 border-black bg-white p-2">
      <div ref={mountRef} className="bg-[#F5F1E8] w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}/>
      <div className="f-mono text-[10px] tracking-widest mt-2 opacity-60 px-1 flex flex-wrap gap-2 justify-between">
        <span>SPOTTED IN THE ROOM</span>
        <span className="truncate">{objects.map(o => o.label).join(' · ')}</span>
      </div>
    </div>
  );
}
