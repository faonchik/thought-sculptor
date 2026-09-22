import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ProceduralSculpture } from '../services/proceduralGeometry';
import { createSculptureMaterial } from '../services/materialPresets';
import type { AcousticFeatures, MaterialPresetType, AppWorkflowState } from '../types';

interface SculptureSceneProps {
  features: AcousticFeatures | null;
  isObserving: boolean;
  workflowState: AppWorkflowState;
  materialType: MaterialPresetType;
  onMeshReady: (mesh: THREE.Mesh) => void;
  sculptureRef: React.MutableRefObject<ProceduralSculpture | null>;
}

export const SculptureScene: React.FC<SculptureSceneProps> = ({
  features,
  isObserving,
  workflowState,
  materialType,
  onMeshReady,
  sculptureRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Interaction / Rotation states
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotation = useRef<{ x: number; y: number }>({ x: 0.15, y: -0.3 });
  const currentRotation = useRef<{ x: number; y: number }>({ x: 0.15, y: -0.3 });
  const targetParallax = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentParallax = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mutable refs to eliminate stale closures in 60fps render loop
  const featuresRef = useRef<AcousticFeatures | null>(features);
  const isObservingRef = useRef<boolean>(isObserving);
  const workflowStateRef = useRef<AppWorkflowState>(workflowState);
  featuresRef.current = features;
  isObservingRef.current = isObserving;
  workflowStateRef.current = workflowState;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c11);

    const gridHelper = new THREE.GridHelper(10, 20, 0x374151, 0x1f2937);
    gridHelper.position.y = -2.0;
    scene.add(gridHelper);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    camera.position.set(0, 0, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x2d323d, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4.0, 4.8, 3.8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9cb2d4, 1.8);
    fillLight.position.set(-4.0, 2.0, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xebb36a, 2.4);
    rimLight.position.set(-3.5, -2.5, -4.0);
    scene.add(rimLight);

    const corePointLight = new THREE.PointLight(0xff4500, 0, 8);
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    const sculpture = new ProceduralSculpture();
    const initialMaterial = createSculptureMaterial(materialType);
    sculpture.mesh.material = initialMaterial;
    scene.add(sculpture.mesh);
    sculptureRef.current = sculpture;
    onMeshReady(sculpture.mesh);

    // Particle silhouette
    const ashCount = 1400;
    const ashGeometry = new THREE.BufferGeometry();
    const ashPos = new Float32Array(ashCount * 3);
    const ashBase = new Float32Array(ashCount * 3);
    const ashVels = new Float32Array(ashCount * 3);
    const ashAlphas = new Float32Array(ashCount);

    for (let i = 0; i < ashCount; i++) {
      const idx = i * 3;
      let x = 0, y = 0, z = 0;
      const part = Math.random();

      if (part < 0.22) {
        // Head (sphere at y = 0.85)
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 0.26 * Math.cbrt(Math.random());
        x = r * Math.sin(phi) * Math.cos(theta);
        y = 0.85 + r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (part < 0.28) {
        // Neck
        x = (Math.random() - 0.5) * 0.18;
        y = 0.52 + Math.random() * 0.15;
        z = (Math.random() - 0.5) * 0.18;
      } else if (part < 0.65) {
        // Shoulders & Chest / Torso
        const ty = (Math.random() - 0.5) * 0.8; // -0.4 .. 0.4
        const shoulderWidth = ty > 0 ? 0.65 : 0.45;
        x = (Math.random() - 0.5) * shoulderWidth;
        y = 0.1 + ty;
        z = (Math.random() - 0.5) * 0.28;
      } else {
        // Arms / hips
        const side = Math.random() > 0.5 ? 1 : -1;
        x = side * (0.35 + Math.random() * 0.2);
        y = -0.35 + Math.random() * 0.7;
        z = (Math.random() - 0.5) * 0.22;
      }

      ashPos[idx] = x;
      ashPos[idx + 1] = y;
      ashPos[idx + 2] = z;
      ashBase[idx] = x;
      ashBase[idx + 1] = y;
      ashBase[idx + 2] = z;

      ashVels[idx] = (Math.random() - 0.5) * 0.08;
      ashVels[idx + 1] = -0.05 - Math.random() * 0.08;
      ashVels[idx + 2] = (Math.random() - 0.5) * 0.08;

      ashAlphas[i] = 0.4 + Math.random() * 0.6;
    }

    ashGeometry.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));

    const ashMaterial = new THREE.PointsMaterial({
      color: 0x9ca3af,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ashPoints = new THREE.Points(ashGeometry, ashMaterial);
    scene.add(ashPoints);

    // Solidification sparks
    const sparkCount = 300;
    const sparkGeometry = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVels = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      const idx = i * 3;
      sparkPos[idx] = 0;
      sparkPos[idx + 1] = 0;
      sparkPos[idx + 2] = 0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.0;
      sparkVels[idx] = Math.cos(angle) * speed;
      sparkVels[idx + 1] = (Math.random() - 0.3) * speed;
      sparkVels[idx + 2] = Math.sin(angle) * speed;
    }
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMaterial = new THREE.PointsMaterial({
      color: 0xff6b35,
      size: 0.06,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkPoints = new THREE.Points(sparkGeometry, sparkMaterial);
    scene.add(sparkPoints);

    // Floor contact shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const radGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    sCtx.fillStyle = radGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.45;
    scene.add(shadowPlane);

    // Ambient dust particles
    const sandCount = 450;
    const sandGeo = new THREE.BufferGeometry();
    const sandPos = new Float32Array(sandCount * 3);
    for (let i = 0; i < sandCount; i++) {
      const idx = i * 3;
      sandPos[idx] = (Math.random() - 0.5) * 0.8;
      sandPos[idx + 1] = -0.5 - Math.random() * 0.9;
      sandPos[idx + 2] = (Math.random() - 0.5) * 0.8;
    }
    sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPos, 3));
    const sandMat = new THREE.PointsMaterial({
      color: 0xc0c0c0,
      size: 0.028,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sandPoints = new THREE.Points(sandGeo, sandMat);
    scene.add(sandPoints);

    // Distant background field
    const starsCount = 280;
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(starsCount * 3);
    const starsLife = new Float32Array(starsCount);
    for (let i = 0; i < starsCount; i++) {
      const idx = i * 3;
      starsPos[idx] = (Math.random() - 0.5) * 35;
      starsPos[idx + 1] = (Math.random() - 0.5) * 35;
      starsPos[idx + 2] = -15 - Math.random() * 15;
      starsLife[i] = Math.random(); // 0..1 fade phase
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const starsPoints = new THREE.Points(starsGeo, starsMat);
    scene.add(starsPoints);

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (isDraggingRef.current) {
        const deltaX = clientX - previousMousePosition.current.x;
        const deltaY = clientY - previousMousePosition.current.y;
        targetRotation.current.y += deltaX * 0.007;
        targetRotation.current.x += deltaY * 0.007;
        previousMousePosition.current = { x: clientX, y: clientY };
      } else {
        const normX = (clientX / window.innerWidth) * 2 - 1;
        const normY = -(clientY / window.innerHeight) * 2 + 1;
        targetParallax.current = { x: normX * 0.2, y: normY * 0.15 };
      }
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

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
    let elapsedTime = 0;
    let animId: number;
    let agonyTimer = 0;
    let shadowScale = 1.0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsedTime += delta;
      const state = workflowStateRef.current;
      const liveFeat = featuresRef.current;

      currentParallax.current.x += (targetParallax.current.x - currentParallax.current.x) * 0.05;
      currentParallax.current.y += (targetParallax.current.y - currentParallax.current.y) * 0.05;
      camera.position.x = currentParallax.current.x;
      camera.position.y = currentParallax.current.y;
      camera.lookAt(0, 0, 0);

      if (!isDraggingRef.current) {
        targetRotation.current.y += delta * (state === 'artefact' ? 0.03 : 0.05);
      }
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.08;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.08;

      sculpture.mesh.rotation.x = currentRotation.current.x;
      sculpture.mesh.rotation.y = currentRotation.current.y;

      if (state === 'dormant') {
        sculpture.mesh.visible = true;
        ashPoints.visible = true;
        sparkMaterial.opacity = 0;
        shadowMat.opacity = 0;
        sandMat.opacity = 0;
        ashMaterial.opacity = 0.85;
        corePointLight.intensity = 0;

        const posArr = ashGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < ashCount; i++) {
          const idx = i * 3;
          posArr[idx] += Math.sin(elapsedTime * 0.8 + i) * 0.0012 + ashVels[idx] * delta * 0.2;
          posArr[idx + 1] += ashVels[idx + 1] * delta * 0.35;
          posArr[idx + 2] += Math.cos(elapsedTime * 0.8 + i) * 0.0012 + ashVels[idx + 2] * delta * 0.2;

          if (posArr[idx + 1] < -1.6) {
            posArr[idx] = ashBase[idx] + (Math.random() - 0.5) * 0.05;
            posArr[idx + 1] = ashBase[idx + 1];
            posArr[idx + 2] = ashBase[idx + 2] + (Math.random() - 0.5) * 0.05;
          }
        }
        ashGeometry.attributes.position.needsUpdate = true;
        ashPoints.rotation.y += delta * 0.02;
      } else if (state === 'observing') {
        sculpture.mesh.visible = true;
        ashPoints.visible = true;
        sparkMaterial.opacity = 0;
        shadowMat.opacity = 0;
        sandMat.opacity = 0;

        ashMaterial.opacity = Math.max(0, ashMaterial.opacity - delta * 0.4);

        const rms = liveFeat ? liveFeat.rms : 0.2;
        const pulse = 1.2 + Math.sin(elapsedTime * 8) * 0.8 + rms * 6.5;
        corePointLight.color.setHex(0xff4500);
        corePointLight.intensity = pulse;

        sculpture.update(delta, liveFeat, true);
      } else if (state === 'solidifying') {
        sculpture.mesh.visible = true;
        ashPoints.visible = false;
        agonyTimer += delta;

        sparkMaterial.opacity = Math.min(0.9, Math.max(0, 1.0 - (agonyTimer / 3.5)));
        const sArr = sparkGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < sparkCount; i++) {
          const idx = i * 3;
          sArr[idx] += sparkVels[idx] * delta;
          sArr[idx + 1] += sparkVels[idx + 1] * delta - 0.8 * delta;
          sArr[idx + 2] += sparkVels[idx + 2] * delta;
        }
        sparkGeometry.attributes.position.needsUpdate = true;

        const coolProgress = Math.min(1.0, agonyTimer / 3.2);
        corePointLight.color.setHex(coolProgress > 0.5 ? 0x2f4f4f : 0x8b0000);
        corePointLight.intensity = (1.0 - coolProgress) * 3.0;

        sculpture.update(delta, liveFeat, false);
      } else if (state === 'artefact') {
        sculpture.mesh.visible = true;
        ashPoints.visible = false;
        sparkMaterial.opacity = 0;
        corePointLight.intensity = 0;

        shadowMat.opacity = Math.min(0.85, shadowMat.opacity + delta * 0.35);
        shadowScale = Math.min(2.1, shadowScale + delta * 0.08);
        shadowPlane.scale.set(shadowScale, shadowScale, 1);

        sandMat.opacity = Math.min(0.65, sandMat.opacity + delta * 0.3);
        const sandPosArr = sandGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < sandCount; i++) {
          const idx = i * 3;
          sandPosArr[idx + 1] -= (0.25 + (i % 5) * 0.08) * delta;
          if (sandPosArr[idx + 1] < -1.45) {
            sandPosArr[idx] = (Math.random() - 0.5) * 0.75;
            sandPosArr[idx + 1] = -0.5 - Math.random() * 0.2;
            sandPosArr[idx + 2] = (Math.random() - 0.5) * 0.75;
          }
        }
        sandGeo.attributes.position.needsUpdate = true;

        starsPoints.visible = true;
        starsPoints.rotation.y += delta * 0.005;

        sculpture.update(delta, liveFeat, false);
      }

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
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update material preset dynamically
  useEffect(() => {
    if (sculptureRef.current && sculptureRef.current.mesh) {
      const newMaterial = createSculptureMaterial(materialType);
      sculptureRef.current.mesh.material = newMaterial;
    }
  }, [materialType, sculptureRef]);

  return <div ref={mountRef} className="canvas-wrapper" />;
};

