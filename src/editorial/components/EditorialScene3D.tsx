import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EditorialAcousticMonolith } from '../services/editorialMonolith';
import type { AcousticFeatures, MaterialPresetType, AppWorkflowState } from '../../types';

interface EditorialScene3DProps {
  features: AcousticFeatures | null;
  isObserving: boolean;
  workflowState: AppWorkflowState;
  materialType: MaterialPresetType;
  onMeshReady: (mesh: THREE.Object3D) => void;
  isWireframe?: boolean;
  isAutoRotate?: boolean;
  showGrid?: boolean;
  zoomDistance?: number;
  resetTrigger?: number;
}

export const EditorialScene3D: React.FC<EditorialScene3DProps> = ({
  features,
  isObserving,
  workflowState,
  materialType,
  onMeshReady,
  isWireframe = false,
  isAutoRotate = true,
  showGrid = true,
  zoomDistance = 5.6,
  resetTrigger = 0,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const monolithRef = useRef<EditorialAcousticMonolith | null>(null);

  // Interaction / Rotation states
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotation = useRef<{ x: number; y: number }>({ x: 0.16, y: -0.32 });
  const currentRotation = useRef<{ x: number; y: number }>({ x: 0.16, y: -0.32 });

  const targetDistance = useRef<number>(zoomDistance);
  const currentDistance = useRef<number>(zoomDistance);

  const featuresRef = useRef<AcousticFeatures | null>(features);
  const isObservingRef = useRef<boolean>(isObserving);
  const workflowStateRef = useRef<AppWorkflowState>(workflowState);
  const isAutoRotateRef = useRef<boolean>(isAutoRotate);
  const isWireframeRef = useRef<boolean>(isWireframe);
  const showGridRef = useRef<boolean>(showGrid);

  featuresRef.current = features;
  isObservingRef.current = isObserving;
  workflowStateRef.current = workflowState;
  isAutoRotateRef.current = isAutoRotate;
  isWireframeRef.current = isWireframe;
  showGridRef.current = showGrid;

  useEffect(() => {
    targetDistance.current = zoomDistance;
  }, [zoomDistance]);

  useEffect(() => {
    if (resetTrigger > 0) {
      targetRotation.current = { x: 0.16, y: -0.32 };
      targetDistance.current = 5.6;
      monolithRef.current?.resetCarve();
    }
  }, [resetTrigger]);

  // Material change
  useEffect(() => {
    if (monolithRef.current) {
      monolithRef.current.updateMaterial(materialType);
    }
  }, [materialType]);

  // Wireframe sync
  useEffect(() => {
    if (monolithRef.current) {
      monolithRef.current.setWireframe(isWireframe);
    }
  }, [isWireframe]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF4F2EE);
    scene.fog = new THREE.Fog(0xF4F2EE, 9, 24);

    // Minimal datum architectural grid
    const gridGroup = new THREE.Group();
    const gridHelper = new THREE.GridHelper(10, 24, 0xCDC8BA, 0xE6E2D6);
    gridHelper.position.y = -1.65;
    gridGroup.add(gridHelper);

    // Fine concentric ring on floor
    const ringGeo = new THREE.RingGeometry(1.6, 1.61, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xD0CBBF, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -1.64;
    gridGroup.add(ringMesh);

    scene.add(gridGroup);

    // =========================================================================
    // ARCHITECTURAL ROTUNDA BACKDROP (Inspired by Escape & Akira references)
    // Massive circular gallery rotunda with perspective ribs, tiles & catwalk
    // =========================================================================
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1024;
    bgCanvas.height = 1024;
    const bgCtx = bgCanvas.getContext('2d')!;

    // 1. Warm museum ambient base
    bgCtx.fillStyle = '#F3EFE9';
    bgCtx.fillRect(0, 0, 1024, 1024);

    // 2. Soft radial chiaroscuro illumination (lightwell behind monolith)
    const radLight = bgCtx.createRadialGradient(512, 420, 60, 512, 420, 580);
    radLight.addColorStop(0, '#FAF9F6');
    radLight.addColorStop(0.35, '#F2EFEB');
    radLight.addColorStop(0.7, '#E7E2D8');
    radLight.addColorStop(1, '#D8D1C4');
    bgCtx.fillStyle = radLight;
    bgCtx.fillRect(0, 0, 1024, 1024);

    // 3. Colossal Architectural Cylinder / Rotunda Perspective Rings (Escape Reference)
    const cx = 512;
    const cy = 410;
    const rotundaRadii = [140, 220, 310, 410, 520, 640, 780];

    // Radial perspective panel seams
    bgCtx.strokeStyle = 'rgba(20, 21, 24, 0.05)';
    bgCtx.lineWidth = 0.75;
    for (let a = 0; a < 36; a++) {
      const angle = (a * 10 * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      bgCtx.beginPath();
      bgCtx.moveTo(cx + cosA * 120, cy + sinA * 120);
      bgCtx.lineTo(cx + cosA * 780, cy + sinA * 780);
      bgCtx.stroke();
    }

    // Concentric perspective wall rings & subtle tile panels
    rotundaRadii.forEach((r, idx) => {
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bgCtx.strokeStyle = idx % 2 === 0 ? 'rgba(20, 21, 24, 0.12)' : 'rgba(20, 21, 24, 0.06)';
      bgCtx.lineWidth = idx % 2 === 0 ? 1.0 : 0.6;
      bgCtx.stroke();

      // Subtle alternating panel fills
      if (idx > 0 && idx % 2 === 1) {
        bgCtx.beginPath();
        bgCtx.arc(cx, cy, r, 0, Math.PI * 2);
        bgCtx.arc(cx, cy, rotundaRadii[idx - 1], Math.PI * 2, 0, true);
        bgCtx.fillStyle = 'rgba(20, 21, 24, 0.015)';
        bgCtx.fill();
      }
    });

    // 4. Diagonal Architectural Catwalk / Observation Bridge (Escape Reference)
    // A dramatic diagonal cross-beam passing behind the monolith
    bgCtx.save();
    bgCtx.translate(cx, cy);
    bgCtx.rotate(-0.38); // ~22 degrees tilt
    bgCtx.fillStyle = 'rgba(215, 210, 200, 0.65)';
    bgCtx.fillRect(-700, -22, 1400, 44);
    bgCtx.strokeStyle = 'rgba(20, 21, 24, 0.18)';
    bgCtx.lineWidth = 0.8;
    bgCtx.strokeRect(-700, -22, 1400, 44);

    // Handrail centerline
    bgCtx.strokeStyle = 'rgba(20, 21, 24, 0.09)';
    bgCtx.beginPath();
    bgCtx.moveTo(-700, 0);
    bgCtx.lineTo(700, 0);
    bgCtx.stroke();

    // Catwalk traversal ticks
    for (let tx = -680; tx < 680; tx += 20) {
      bgCtx.beginPath();
      bgCtx.moveTo(tx, -22);
      bgCtx.lineTo(tx, 22);
      bgCtx.strokeStyle = 'rgba(20, 21, 24, 0.06)';
      bgCtx.lineWidth = 0.5;
      bgCtx.stroke();
    }
    bgCtx.restore();

    // 5. Optical Aperture Indicator (Concentric Terracotta Accent from Escape)
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, 180, 0, Math.PI * 2);
    bgCtx.strokeStyle = 'rgba(186, 93, 56, 0.35)';
    bgCtx.lineWidth = 0.85;
    bgCtx.stroke();

    // Terracotta orbital satellite dot
    bgCtx.beginPath();
    bgCtx.arc(cx + 175, cy - 40, 4.5, 0, Math.PI * 2);
    bgCtx.fillStyle = '#BA5D38';
    bgCtx.fill();

    const bgTex = new THREE.CanvasTexture(bgCanvas);
    const bgGeo = new THREE.PlaneGeometry(16, 12);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, depthWrite: false });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.position.set(0, 0.3, -4.2);
    scene.add(bgMesh);

    // =========================================================================
    // 6. FROSTED SPECIMEN DATUM CARD (Akira Reference)
    // Translucent specimen shelf plate floating directly behind the lower monolith
    // =========================================================================
    const shelfCanvas = document.createElement('canvas');
    shelfCanvas.width = 512;
    shelfCanvas.height = 128;
    const shCtx = shelfCanvas.getContext('2d')!;
    shCtx.fillStyle = 'rgba(252, 250, 246, 0.88)';
    shCtx.fillRect(0, 0, 512, 128);
    shCtx.strokeStyle = 'rgba(20, 21, 24, 0.14)';
    shCtx.lineWidth = 1.0;
    shCtx.strokeRect(0.5, 0.5, 511, 127);

    // Faint horizontal registration line
    shCtx.strokeStyle = 'rgba(20, 21, 24, 0.08)';
    shCtx.beginPath();
    shCtx.moveTo(20, 64);
    shCtx.lineTo(492, 64);
    shCtx.stroke();

    const shelfTex = new THREE.CanvasTexture(shelfCanvas);
    const shelfGeo = new THREE.PlaneGeometry(4.8, 1.2);
    const shelfMat = new THREE.MeshBasicMaterial({
      map: shelfTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const shelfMesh = new THREE.Mesh(shelfGeo, shelfMat);
    shelfMesh.position.set(0, -0.42, -0.75);
    scene.add(shelfMesh);

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 0, currentDistance.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // Refined museum studio lighting
    const hemiLight = new THREE.HemisphereLight(0xFFFDF8, 0xD4C8B8, 1.35);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xFFF7EC, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xFFFDF6, 3.6);
    keyLight.position.set(4.2, 5.8, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xD8E2EC, 0.95);
    fillLight.position.set(-4.0, 1.8, 2.5);
    scene.add(fillLight);

    const frontLight = new THREE.DirectionalLight(0xFFFFFF, 1.05);
    frontLight.position.set(0.0, 0.6, 4.2);
    scene.add(frontLight);

    const rimLight = new THREE.DirectionalLight(0xEFE4D4, 2.2);
    rimLight.position.set(-3.2, 3.2, -3.8);
    scene.add(rimLight);

    // Ground soft shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(28, 24, 18, 0.24)');
    grad.addColorStop(0.38, 'rgba(28, 24, 18, 0.08)');
    grad.addColorStop(0.7, 'rgba(28, 24, 18, 0.02)');
    grad.addColorStop(1, 'rgba(28, 24, 18, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    const shadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.63;
    scene.add(shadowMesh);

    // Instantiate Editorial Monolith
    const monolith = new EditorialAcousticMonolith(materialType);
    monolith.setWireframe(isWireframeRef.current);
    scene.add(monolith.rootGroup);
    monolithRef.current = monolith;
    onMeshReady(monolith.mesh);

    // Mouse & Touch interaction
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - previousMousePosition.current.x;
      const deltaY = clientY - previousMousePosition.current.y;

      targetRotation.current.y += deltaX * 0.007;
      targetRotation.current.x = Math.max(-0.6, Math.min(0.6, targetRotation.current.x + deltaY * 0.007));

      previousMousePosition.current = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDistance.current = Math.max(3.5, Math.min(9.5, targetDistance.current + e.deltaY * 0.0035));
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      gridGroup.visible = showGridRef.current;

      currentDistance.current += (targetDistance.current - currentDistance.current) * 0.08;
      camera.position.z = currentDistance.current;

      if (!isDraggingRef.current && isAutoRotateRef.current) {
        targetRotation.current.y += delta * 0.028;
      }
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.08;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.08;

      monolith.rootGroup.rotation.x = currentRotation.current.x;
      monolith.rootGroup.rotation.y = currentRotation.current.y;

      const state = workflowStateRef.current;
      const liveFeat = featuresRef.current;

      monolith.update(delta, liveFeat, state === 'observing');

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="ed-canvas-host" />;
};
