import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WeldParameters, DistortionMetric } from '../types';
import { 
  Rotate3d, 
  Tag, 
  Flame, 
  Trash2, 
  Plus, 
  Upload, 
  HelpCircle, 
  Compass, 
  ChevronRight,
  Sparkles,
  AlertOctagon,
  Eye,
  Settings,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Annotation {
  id: string;
  x: number;
  y: number;
  z: number;
  type: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  note: string;
  timestamp: string;
}

interface ModelViewer3DProps {
  parameters: WeldParameters;
  distortion: DistortionMetric;
  heatInput: number;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  parameters,
  distortion,
  heatInput
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const weldmentGroupRef = useRef<THREE.Group | null>(null);
  const annotationPinsGroupRef = useRef<THREE.Group | null>(null);
  
  // States
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [activeDefectType, setActiveDefectType] = useState<string>('Crack');
  const [activeSeverity, setActiveSeverity] = useState<'Minor' | 'Moderate' | 'Severe'>('Severe');
  const [annotationNote, setAnnotationNote] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([
    {
      id: 'demo-1',
      x: 0,
      y: 0.2,
      z: 15,
      type: 'Longitudinal Crack',
      severity: 'Severe',
      note: 'High restraint cooling crack located in the HAZ centerline.',
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: 'demo-2',
      x: -5,
      y: -0.5,
      z: -20,
      type: 'Porosity Cluster',
      severity: 'Moderate',
      note: 'Localized shielding gas flow rate drop created porosity pores.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isThermalCurveMinimized, setIsThermalCurveMinimized] = useState<boolean>(false);
  const [customGeometry, setCustomGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'front' | 'side' | 'top'>('orbit');

  // Generate temperature curve data based on heatInput and parameters
  const tempChartData = React.useMemo(() => {
    const data = [];
    const peakTemp = 1530 + heatInput * 100; // rough estimation of peak temp based on heat input
    const coolingFactor = parameters.material === 'Aluminum' ? 0.08 : (parameters.material === 'Stainless Steel' ? 0.02 : 0.04);
    
    for (let t = -5; t <= 30; t++) {
      if (t < 0) {
        // pre-heating or ambient
        data.push({ time: t, temp: parameters.preheat });
      } else {
        // cooling curve: Newton's law of cooling approximation
        const temp = parameters.preheat + (peakTemp - parameters.preheat) * Math.exp(-coolingFactor * t);
        data.push({ time: t, temp: Math.round(temp) });
      }
    }
    return data;
  }, [heatInput, parameters.preheat, parameters.material]);

  // Parse STL File Helper
  const parseSTL = (arrayBuffer: ArrayBuffer): THREE.BufferGeometry => {
    const isBinary = (buffer: ArrayBuffer): boolean => {
      if (buffer.byteLength < 84) return false;
      const reader = new DataView(buffer);
      const faceCount = reader.getUint32(80, true);
      const expectedSize = 80 + 4 + faceCount * 50;
      return expectedSize === buffer.byteLength;
    };

    const parseBinary = (buffer: ArrayBuffer): THREE.BufferGeometry => {
      const reader = new DataView(buffer);
      const faceCount = reader.getUint32(80, true);
      const positions = new Float32Array(faceCount * 9);
      const normals = new Float32Array(faceCount * 9);
      let offset = 84;

      for (let i = 0; i < faceCount; i++) {
        // Normal vector
        const nx = reader.getFloat32(offset, true);
        const ny = reader.getFloat32(offset + 4, true);
        const nz = reader.getFloat32(offset + 8, true);
        offset += 12;

        // 3 Vertices
        for (let v = 0; v < 3; v++) {
          const vx = reader.getFloat32(offset, true);
          const vy = reader.getFloat32(offset + 4, true);
          const vz = reader.getFloat32(offset + 8, true);
          offset += 12;

          const idx = i * 9 + v * 3;
          positions[idx] = vx;
          positions[idx + 1] = vy;
          positions[idx + 2] = vz;

          normals[idx] = nx;
          normals[idx + 1] = ny;
          normals[idx + 2] = nz;
        }

        offset += 2; // Attribute byte count
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      return geometry;
    };

    const parseASCII = (buffer: ArrayBuffer): THREE.BufferGeometry => {
      const text = new TextDecoder().decode(buffer);
      const lines = text.split('\n');
      const positions: number[] = [];
      const normals: number[] = [];
      let currentNormal = [0, 0, 0];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('facet normal')) {
          const parts = line.split(/\s+/);
          currentNormal = [
            parseFloat(parts[2]),
            parseFloat(parts[3]),
            parseFloat(parts[4])
          ];
        } else if (line.startsWith('vertex')) {
          const parts = line.split(/\s+/);
          positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
          normals.push(currentNormal[0], currentNormal[1], currentNormal[2]);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      return geometry;
    };

    return isBinary(arrayBuffer) ? parseBinary(arrayBuffer) : parseASCII(arrayBuffer);
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await loadFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await loadFile(files[0]);
    }
  };

  const loadFile = async (file: File) => {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'stl') {
        alert('Please upload an STL file formats only.');
        return;
      }
      const buffer = await file.arrayBuffer();
      const geometry = parseSTL(buffer);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      
      // Center the uploaded model
      geometry.center();
      
      setCustomGeometry(geometry);
      setFileName(file.name);
    } catch (err) {
      console.error(err);
      alert('Error parsing the STL file. Make sure it is a valid ASCII or binary STL file.');
    }
  };

  // Build local mesh procedurally if no custom file loaded
  const generateProceduralWeldment = (
    jointType: string,
    thickness: number,
    heatInput: number,
    dist: DistortionMetric
  ) => {
    const group = new THREE.Group();
    const length = 120; // Weld length
    const width = 45;   // Plate width
    const depth = thickness; // Plate thickness

    // Heatmap color function (based on proximity to weld centerline at X=0)
    const getVertexHeatColor = (x: number, y: number, z: number, showHeat: boolean) => {
      if (!showHeat) return new THREE.Color('#334155'); // Slate-700 equivalent for better visibility
      const distToSeam = Math.abs(x);
      
      // Calculate heat dispersion factor
      const maxHeatDist = 15 + heatInput * 12;
      const intensity = Math.max(0, 1 - distToSeam / maxHeatDist);
      
      // High heat input creates a larger Heat Affected Zone (HAZ)
      if (intensity > 0.75) {
        // Molten Pool Center (Vibrant yellow/orange glow)
        return new THREE.Color().lerpColors(new THREE.Color('#fbbf24'), new THREE.Color('#f97316'), (intensity - 0.75) * 4);
      } else if (intensity > 0.35) {
        // Heat Affected Zone (Bright red/magenta)
        return new THREE.Color().lerpColors(new THREE.Color('#ef4444'), new THREE.Color('#a21caf'), (intensity - 0.35) * 1.5);
      } else if (intensity > 0.05) {
        // Warmer metal boundary (Electric blue/indigo)
        return new THREE.Color().lerpColors(new THREE.Color('#818cf8'), new THREE.Color('#3b82f6'), (intensity - 0.05) * 3.3);
      }
      return new THREE.Color('#334155'); // Cool slate plate
    };

    // Apply distortion warp to individual vertex coordinates
    const warpVertex = (x: number, y: number, z: number) => {
      let wx = x;
      let wy = y;
      let wz = z;

      // 1. Angular warping (plate tilts about the center weld line X=0)
      if (jointType === 'Butt Joint') {
        const angleRad = (dist.angular * Math.PI) / 180;
        if (x > 0.1) {
          // Tilt right plate up
          wy += (x - 2) * Math.sin(angleRad);
          wx = 2 + (x - 2) * Math.cos(angleRad);
        } else if (x < -0.1) {
          // Tilt left plate up
          wy += (-x - 2) * Math.sin(angleRad);
          wx = -2 + (x + 2) * Math.cos(angleRad);
        }
      } else if (jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') {
        // Vertical plate shrinks angularly (single fillet has more tilt than double, but let's just use the same base for now)
        const multiplier = jointType === 'T-Joint (Single Fillet)' ? 1.0 : 0.5;
        const angleRad = (dist.angular * multiplier * Math.PI) / 180;
        if (y > 0.1) {
          // Tilt vertical plate
          wx += y * Math.sin(angleRad);
          wy = depth / 2 + y * Math.cos(angleRad);
        }
      } else if (jointType === 'Lap Joint') {
        // Dynamic tilt due to single sided weld
        const angleRad = (dist.angular * 0.7 * Math.PI) / 180;
        if (x > 0) {
          wy += x * Math.sin(angleRad);
        }
      }

      // 2. Transverse contraction (shrinks the plate widthwards, shifting them closer)
      const transverseShift = dist.transverse * 0.5;
      if (x > 0.1) {
        wx -= transverseShift;
      } else if (x < -0.1) {
        wx += transverseShift;
      }

      // 3. Longitudinal shrinkage / Bowing (ends curve upwards/downwards)
      const bowFactor = dist.longitudinal * 0.05;
      // Parabolic curvature centered along the length (Z-axis)
      const lengthRatio = Math.pow(z / (length / 2), 2); // 0 at center, 1 at ends
      wy -= bowFactor * lengthRatio;

      return { x: wx, y: wy, z: wz };
    };

    // Construct Plate mesh geometries manually to support vertex colors & custom warping
    const createWarpedPlate = (
      offsetX: number,
      offsetY: number,
      pWidth: number,
      pHeight: number,
      pDepth: number,
      segmentsW: number,
      segmentsH: number,
      segmentsD: number
    ) => {
      const geo = new THREE.BoxGeometry(pWidth, pHeight, pDepth, segmentsW, segmentsH, segmentsD);
      const pos = geo.attributes.position;
      const colors: number[] = [];

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + offsetX;
        const y = pos.getY(i) + offsetY;
        const z = pos.getZ(i);

        // Apply real-time thermodynamic warp
        const warped = warpVertex(x, y, z);
        pos.setXYZ(i, warped.x, warped.y, warped.z);

        // Heat color gradient
        const col = getVertexHeatColor(warped.x, warped.y, warped.z, showHeatmap);
        colors.push(col.r, col.g, col.b);
      }

      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.2,
        metalness: 0.7,
        reflectivity: 0.5,
        clearcoat: 0.1,
        clearcoatRoughness: 0.2,
        flatShading: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // Helper to generate the weld bead mesh procedurally
    const createWeldBead = () => {
      const beadSegments = 30;
      const path: THREE.Vector3[] = [];
      for (let i = 0; i <= beadSegments; i++) {
        const z = -length / 2 + (length * i) / beadSegments;
        // Apply longitudinal bowing to bead path as well
        const bowFactor = dist.longitudinal * 0.05;
        const lengthRatio = Math.pow(z / (length / 2), 2);
        path.push(new THREE.Vector3(0, -bowFactor * lengthRatio, z));
      }

      // TubeGeometry along the path
      const beadRadius = Math.max(2, 1.5 + heatInput * 1.8);
      const geo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(path),
        beadSegments,
        beadRadius,
        12,
        false
      );

      const colors: number[] = [];
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        // Glow bright orange/red for high heat input
        const z = pos.getZ(i);
        const col = showHeatmap 
          ? new THREE.Color().lerpColors(new THREE.Color('#f97316'), new THREE.Color('#b91c1c'), 0.4)
          : new THREE.Color('#475569');
        colors.push(col.r, col.g, col.b);
      }

      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.1,
        metalness: 1.0,
        emissive: showHeatmap ? new THREE.Color('#f97316') : new THREE.Color(0,0,0),
        emissiveIntensity: showHeatmap ? 2.0 : 0,
        flatShading: true
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    if (jointType === 'Butt Joint') {
      // Left plate
      const leftPlate = createWarpedPlate(-width / 2 - 1, 0, width, depth, length, 12, 4, 12);
      // Right plate
      const rightPlate = createWarpedPlate(width / 2 + 1, 0, width, depth, length, 12, 4, 12);
      // Weld Bead
      const bead = createWeldBead();
      bead.position.y = depth / 4;

      group.add(leftPlate);
      group.add(rightPlate);
      group.add(bead);
    } else if (jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') {
      // Horizontal base plate
      const basePlate = createWarpedPlate(0, -depth / 2, width * 1.5, depth, length, 12, 4, 12);
      // Vertical top plate
      const vertPlate = createWarpedPlate(0, width / 2, depth, width, length, 4, 12, 12);
      // Left fillet bead line
      const beadLeft = createWeldBead();
      beadLeft.position.x = -depth / 1.5;
      beadLeft.scale.set(0.6, 0.6, 1);
      
      group.add(basePlate);
      group.add(vertPlate);
      group.add(beadLeft);

      // Right fillet bead line only for Double Fillet
      if (jointType === 'T-Joint') {
        const beadRight = createWeldBead();
        beadRight.position.x = depth / 1.5;
        beadRight.scale.set(0.6, 0.6, 1);
        group.add(beadRight);
      }
    } else {
      // Lap Joint (Overlapping plates)
      // Bottom Plate (shifted left)
      const bottomPlate = createWarpedPlate(-width / 3, -depth / 2, width, depth, length, 12, 4, 12);
      // Top Plate (shifted right, stacked)
      const topPlate = createWarpedPlate(width / 3, depth / 2, width, depth, length, 12, 4, 12);
      // Lap fillet joint bead
      const bead = createWeldBead();
      bead.position.set(width / 3 - width / 2, depth / 4, 0);
      bead.scale.set(0.8, 0.8, 1);

      group.add(bottomPlate);
      group.add(topPlate);
      group.add(bead);
    }

    return group;
  };

  // Add clicking to place annotations on the mesh
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current || !weldmentGroupRef.current) return;

    // Only place annotation if we didn't drag the mouse (meaning simple clean click)
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // Get intersections with children meshes of the weldment group
    const intersects = raycaster.intersectObjects(weldmentGroupRef.current.children, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      
      // Store new annotation
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        x: Math.round(hitPoint.x * 10) / 10,
        y: Math.round(hitPoint.y * 10) / 10,
        z: Math.round(hitPoint.z * 10) / 10,
        type: activeDefectType,
        severity: activeSeverity,
        note: annotationNote || `Potential ${activeDefectType} localized defect point.`,
        timestamp: new Date().toLocaleTimeString()
      };

      setAnnotations(prev => [...prev, newAnnotation]);
      setSelectedAnnotationId(newAnnotation.id);
      setAnnotationNote(''); // Reset note form
    }
  };

  // Setup Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create scene, camera, renderer
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to show CSS gradient
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 50, 140);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); 
    
    // Professional color and tone mapping
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 40;
    controls.maxDistance = 400;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Advanced Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.4);
    scene.add(hemiLight);

    // Main Studio Light
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(100, 150, 100);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    // Rim Light for edge definition
    const rimLight = new THREE.DirectionalLight(0x6366f1, 1.2);
    rimLight.position.set(-100, 50, -100);
    scene.add(rimLight);

    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0x475569, 0.3);
    scene.add(ambientLight);

    // Weld Arc Point Light (Glowing effect)
    const arcLight = new THREE.PointLight(0xfbbf24, 15, 80);
    arcLight.position.set(0, 5, 0);
    scene.add(arcLight);

    // Ground Grid Helper
    const gridHelper = new THREE.GridHelper(200, 20, '#475569', '#334155');
    gridHelper.position.y = -12;
    if (gridHelper.material instanceof THREE.Material) {
      gridHelper.material.opacity = 0.5;
      gridHelper.material.transparent = true;
    }
    scene.add(gridHelper);

    // Groups
    const weldmentGroup = new THREE.Group();
    scene.add(weldmentGroup);
    weldmentGroupRef.current = weldmentGroup;

    const annotationPinsGroup = new THREE.Group();
    scene.add(annotationPinsGroup);
    annotationPinsGroupRef.current = annotationPinsGroup;

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Make annotation pins glow/bounce gently
      const time = Date.now() * 0.003;
      if (annotationPinsGroupRef.current) {
        annotationPinsGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            const bounce = 1 + Math.sin(time + child.position.x) * 0.12;
            child.scale.set(bounce, bounce, bounce);
          }
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Resize Observer for responsive centering
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length || !containerRef.current) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      
      if (cameraRef.current) {
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
      }
      
      if (rendererRef.current) {
        rendererRef.current.setSize(newWidth, newHeight);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, []);

  // Update Geometry and Heatmap on changes
  useEffect(() => {
    if (!sceneRef.current || !weldmentGroupRef.current) return;

    // Clear previous geometries
    while (weldmentGroupRef.current.children.length > 0) {
      weldmentGroupRef.current.remove(weldmentGroupRef.current.children[0]);
    }

    if (customGeometry) {
      // Use loaded STL file representation
      const material = new THREE.MeshPhysicalMaterial({
        color: showHeatmap ? '#b91c1c' : '#475569',
        roughness: 0.2,
        metalness: 0.9,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        flatShading: true,
        wireframe: false
      });
      const mesh = new THREE.Mesh(customGeometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Scale down to fit viewport nicely
      mesh.scale.set(0.35, 0.35, 0.35);
      weldmentGroupRef.current.add(mesh);
    } else {
      // Generate standard procedural interactive joint
      const proceduralGroup = generateProceduralWeldment(
        parameters.jointType,
        parameters.thickness,
        heatInput,
        distortion
      );
      weldmentGroupRef.current.add(proceduralGroup);
    }
  }, [parameters.jointType, parameters.thickness, heatInput, distortion, showHeatmap, customGeometry]);

  // Update Annotation pins inside Three.js
  useEffect(() => {
    if (!sceneRef.current || !annotationPinsGroupRef.current) return;

    // Clear previous pins
    while (annotationPinsGroupRef.current.children.length > 0) {
      annotationPinsGroupRef.current.remove(annotationPinsGroupRef.current.children[0]);
    }

    annotations.forEach((ann) => {
      // Different color depending on severity
      let pinColor = 0xef4444; // Severe: Red
      if (ann.severity === 'Moderate') pinColor = 0xf59e0b; // Moderate: Amber
      if (ann.severity === 'Minor') pinColor = 0x3b82f6; // Minor: Blue

      // Glowing sphere pin
      const geometry = new THREE.SphereGeometry(selectedAnnotationId === ann.id ? 2.5 : 1.5, 12, 12);
      const material = new THREE.MeshBasicMaterial({
        color: pinColor,
        transparent: true,
        opacity: selectedAnnotationId === ann.id ? 0.95 : 0.75,
        wireframe: selectedAnnotationId === ann.id
      });

      const pinMesh = new THREE.Mesh(geometry, material);
      pinMesh.position.set(ann.x, ann.y, ann.z);
      
      // Store annotation ID in user data for raycaster lookup if needed
      pinMesh.userData = { id: ann.id };

      annotationPinsGroupRef.current?.add(pinMesh);
    });
  }, [annotations, selectedAnnotationId]);

  // Handle Preset Views / Camera Positions
  const handleSetCameraMode = (mode: 'orbit' | 'front' | 'side' | 'top') => {
    setCameraMode(mode);
    if (!controlsRef.current || !cameraRef.current) return;

    const distance = 140;
    
    switch (mode) {
      case 'front':
        cameraRef.current.position.set(0, 0, distance);
        break;
      case 'side':
        cameraRef.current.position.set(distance, 0, 0);
        break;
      case 'top':
        cameraRef.current.position.set(0, distance, 0);
        break;
      case 'orbit':
      default:
        cameraRef.current.position.set(60, 60, 100);
        break;
    }
    
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    
    const factor = direction === 'in' ? 0.8 : 1.2;
    cameraRef.current.position.multiplyScalar(factor);
    
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-xl text-slate-100" id="viewer-3d-lab-panel">
      
      {/* Upper header action row */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Rotate3d className="w-5 h-5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
          <div className="flex flex-col">
            <h2 className="font-display font-semibold text-base text-slate-100">
              3D Diagnostic Workspace &amp; Annotation Lab
            </h2>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Thermodynamic Warp &amp; Defect Overlay Map
            </span>
          </div>
        </div>

        {/* Diagnostic Toggle & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showHeatmap 
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' 
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heatmap: {showHeatmap ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {/* Preset Views */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex gap-1">
            {(['orbit', 'front', 'side', 'top'] as const).map((v) => (
              <button
                key={v}
                onClick={() => handleSetCameraMode(v)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold transition-all ${
                  cameraMode === v 
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Zoom Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex gap-1">
            <button 
              onClick={() => handleZoom('in')}
              className="px-2.5 py-0.5 text-xs text-slate-400 hover:text-white font-bold font-mono hover:bg-slate-800 rounded"
              title="Zoom In"
            >
              +
            </button>
            <button 
              onClick={() => handleZoom('out')}
              className="px-2.5 py-0.5 text-xs text-slate-400 hover:text-white font-bold font-mono hover:bg-slate-800 rounded"
              title="Zoom Out"
            >
              -
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is 3D Workspace, Right is Annotation Side-Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[460px]">
        
        {/* Left Side: 3D Canvas area */}
        <div className="lg:col-span-8 relative flex flex-col bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 group">
          
          {/* Floating Instructions Banner - Hidden on mobile to reduce clutter */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none hidden md:flex">
            <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>DRAG TO ROTATE | SCROLL/BUTTONS TO ZOOM</span>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-red-400" />
              <span>CLICK DIRECTLY ON WELDMENT TO ATTACH ANNOTATION</span>
            </div>
          </div>

          {/* Drag & Drop File overlay */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 ${
              isDraggingFile 
                ? 'bg-amber-500/20 border-4 border-dashed border-amber-500 backdrop-blur-sm opacity-100' 
                : 'pointer-events-none opacity-0'
            }`}
          >
            <Upload className="w-12 h-12 text-amber-400 animate-bounce mb-3" />
            <h3 className="text-lg font-bold text-white">Drop your Weld STL File Here</h3>
            <p className="text-xs text-slate-400 mt-1">To load and overlay parameters onto custom 3D file formats</p>
          </div>

          {/* Live Canvas element */}
          <div className="flex-1 w-full h-full min-h-[380px] relative">
            <div 
              ref={containerRef} 
              className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
              onClick={handleCanvasClick}
            />
            
            {/* Temperature Profile Chart Overlay */}
            <div className={`absolute bottom-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg p-3 transition-all duration-300 shadow-xl ${isThermalCurveMinimized ? 'w-44 h-10' : 'w-[calc(100%-32px)] md:w-56 h-36'} pointer-events-auto`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  <span>THERMAL COOLING CURVE</span>
                </div>
                <button 
                  onClick={() => setIsThermalCurveMinimized(!isThermalCurveMinimized)}
                  className="p-1 hover:bg-slate-800 rounded transition text-slate-500 hover:text-slate-200"
                  title={isThermalCurveMinimized ? "Expand Curve" : "Minimize Curve"}
                >
                  {isThermalCurveMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              <AnimatePresence>
                {!isThermalCurveMinimized && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex-1 w-full h-full mt-1.5 overflow-hidden"
                  >
                    <ResponsiveContainer width="100%" height={90}>
                      <LineChart data={tempChartData}>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 2000]} hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px', borderRadius: '6px' }}
                          itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                          labelStyle={{ display: 'none' }}
                          formatter={(value: number) => [`${value}°C`, 'Temp']}
                        />
                        <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* STL File Upload Bottom-Bar */}
          <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs gap-4 z-10">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-[11px] font-mono">
                {fileName ? `Uploaded STL: ${fileName}` : 'Load custom STL model geometries:'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {fileName && (
                <button
                  onClick={() => {
                    setCustomGeometry(null);
                    setFileName('');
                  }}
                  className="px-2 py-1 text-[10px] bg-slate-800 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition"
                >
                  Restore Procedural Joint
                </button>
              )}
              <label className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded text-[10px] cursor-pointer transition uppercase tracking-wider">
                Upload STL File
                <input 
                  type="file" 
                  accept=".stl" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Side: Annotation List & Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/50 border-l border-slate-800/80 flex flex-col h-full overflow-hidden">
          
          {/* Inspector Form (Place annotation info) */}
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 tracking-wider">
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>ANNOTATION DESIGNER</span>
            </div>
            
            {/* Defect Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Defect Type</label>
                <select
                  value={activeDefectType}
                  onChange={(e) => setActiveDefectType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="Longitudinal Crack">Longitudinal Crack</option>
                  <option value="Transverse Crack">Transverse Crack</option>
                  <option value="Surface Porosity">Surface Porosity</option>
                  <option value="Severe Undercut">Severe Undercut</option>
                  <option value="Incomplete Penetration">Incomplete Penetration</option>
                  <option value="Excess Spatter">Excess Spatter</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Severity Level</label>
                <div className="flex border border-slate-800 rounded overflow-hidden p-0.5 bg-slate-950">
                  {(['Minor', 'Moderate', 'Severe'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveSeverity(s)}
                      className={`flex-1 py-0.5 text-[9px] uppercase font-bold rounded transition-all ${
                        activeSeverity === s
                          ? s === 'Severe' 
                            ? 'bg-red-500 text-white font-extrabold'
                            : s === 'Moderate'
                            ? 'bg-amber-500 text-slate-950 font-extrabold'
                            : 'bg-blue-500 text-white font-extrabold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Note Text area */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Observation Notes</label>
              <input
                type="text"
                value={annotationNote}
                onChange={(e) => setAnnotationNote(e.target.value)}
                placeholder="Type notes and then click on model weldment to pin..."
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Saved Annotations List */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 max-h-[300px] lg:max-h-[none]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Pinned Annotations ({annotations.length})
              </span>
              {annotations.length > 0 && (
                <button
                  onClick={() => {
                    setAnnotations([]);
                    setSelectedAnnotationId(null);
                  }}
                  className="text-[9px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 uppercase"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {annotations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Tag className="w-6 h-6 text-slate-600 mb-2" />
                <p className="text-[11px]">No custom inspection tags pinned yet.</p>
                <p className="text-[9px] text-slate-600 mt-1">Click the model above to place a 3D annotation.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {annotations.map((ann) => {
                  const isSelected = selectedAnnotationId === ann.id;
                  let badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                  if (ann.severity === 'Moderate') badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  if (ann.severity === 'Minor') badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

                  return (
                    <div
                      key={ann.id}
                      onClick={() => {
                        setSelectedAnnotationId(ann.id);
                        // Focus camera on annotation
                        if (controlsRef.current && cameraRef.current) {
                          const target = new THREE.Vector3(ann.x, ann.y, ann.z);
                          const offset = new THREE.Vector3(40, 40, 40);
                          cameraRef.current.position.copy(target).add(offset);
                          controlsRef.current.target.copy(target);
                          controlsRef.current.update();
                        }
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500/5 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/70 hover:border-slate-700/80'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`font-bold text-xs ${isSelected ? 'text-amber-400' : 'text-slate-100'}`}>
                          {ann.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                            {ann.severity}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotation(ann.id);
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-[11px] text-slate-400 leading-normal font-sans">
                        {ann.note}
                      </p>

                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mt-1 border-t border-slate-800/50 pt-1">
                        <span>X: {ann.x} | Y: {ann.y} | Z: {ann.z}</span>
                        <span>{ann.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
