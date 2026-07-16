import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WeldParameters, DistortionMetric } from '../types';

interface Props {
  parameters: WeldParameters;
  distortion: DistortionMetric;
  heatInput: number;
}

export const ModelViewer3D: React.FC<Props> = ({ parameters, distortion, heatInput }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const w = el.clientWidth, h = el.clientHeight, t = parameters.thickness;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 30, 80);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0x404060, 2));
    const dir = new THREE.DirectionalLight(0xffffff, 3);
    dir.position.set(20, 40, 30);
    scene.add(dir);
    scene.add(new THREE.GridHelper(60, 20, 0x334155, 0x1e293b));

    const mat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8, roughness: 0.4 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(20, t, 40), mat);
    left.position.set(-10.5, t / 2, 0);
    scene.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(20, t, 40), mat);
    right.position.set(10.5, t / 2, 0);
    scene.add(right);

    const r = 1.5 + heatInput * 1.5;
    const bead = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 40, 16),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.08, 1, 0.4 + heatInput * 0.3), metalness: 0.6, roughness: 0.3, emissive: new THREE.Color('#331100'), emissiveIntensity: 0.5 })
    );
    bead.rotation.x = Math.PI / 2;
    bead.position.y = t / 2;
    scene.add(bead);

    let id: number;
    const animate = () => { id = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const onResize = () => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [parameters.thickness, heatInput]);

  return <div ref={ref} className="w-full h-full rounded-2xl overflow-hidden" />;
};
