import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WeldParameters, DistortionMetric } from '../types';

interface Props {
  parameters: WeldParameters;
  distortion: DistortionMetric;
  heatInput: number;
}

export const ModelViewer3D: React.FC<Props> = ({ parameters, distortion, heatInput }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    const t = parameters.thickness;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 30, 80);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0x404060, 2));
    const dir = new THREE.DirectionalLight(0xffffff, 3);
    dir.position.set(20, 40, 30);
    scene.add(dir);

    const grid = new THREE.GridHelper(60, 20, 0x334155, 0x1e293b);
    scene.add(grid);

    const plateMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8, roughness: 0.4 });

    const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(20, t, 40), plateMat);
    leftPlate.position.set(-10.5, t / 2, 0);
    scene.add(leftPlate);

    const rightPlate = new THREE.Mesh(new THREE.BoxGeometry(20, t, 40), plateMat);
    rightPlate.position.set(10.5, t / 2, 0);
    scene.add(rightPlate);

    const beadR = 1.5 + heatInput * 1.5;
    const beadGeo = new THREE.CylinderGeometry(beadR, beadR, 40, 16);
    const beadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 1, 0.4 + heatInput * 0.3),
      metalness: 0.6, roughness: 0.3, emissive: new THREE.Color('#331100'), emissiveIntensity: 0.5,
    });
    const bead = new THREE.Mesh(beadGeo, beadMat);
    bead.rotation.x = Math.PI / 2;
    bead.position.y = t / 2;
    scene.add(bead);

    let id: number;
    const animate = () => { id = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [parameters.thickness, heatInput]);

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />;
};
