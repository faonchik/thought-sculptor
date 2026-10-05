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
  isWireframe?: boolean;
  isAutoRotate?: boolean;
  showGrid?: boolean;
  zoomDistance?: number;
  resetTrigger?: number;
}

export const SculptureScene: React.FC<SculptureSceneProps> = ({
  features,
  isObserving,
  workflowState,
  materialType,
  onMeshReady,
  sculptureRef,
  isWireframe = false,
  isAutoRotate = true,
  showGrid = true,
  zoomDistance = 6.2,
  resetTrigger = 0,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Interaction / Rotation states
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotation = useRef<{ x: number; y: number }>({ x: 0.15, y: -0.3 });
  const currentRotation = useRef<{ x: number; y: number }>({ x: 0.15, y: -0.3 });
  const targetParallax = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentParallax = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera zoom distance ref
  const targetDistance = useRef<number>(zoomDistance);
  const currentDistance = useRef<number>(zoomDistance);

  // Mutable refs to eliminate stale closures in 60fps render loop
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

  // React to zoomDistance prop changes
  useEffect(() => {
    targetDistance.current = zoomDistance;
  }, [zoomDistance]);

  // React to reset camera trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      targetRotation.current = { x: 0.15, y: -0.3 };
      targetDistance.current = 6.2;
      targetParallax.current = { x: 0, y: 0 };
    }
  }, [resetTrigger]);

  // Wireframe updates
  useEffect(() => {
    if (sculptureRef.current?.mesh?.material) {
      const mat = sculptureRef.current.mesh.material as THREE.MeshStandardMaterial;
      mat.wireframe = isWireframe;
      mat.needsUpdate = true;
    }
    if (sculptureRef.current?.mesh2?.material) {
      const mat2 = sculptureRef.current.mesh2.material as THREE.MeshStandardMaterial;
      mat2.wireframe = isWireframe;
      mat2.needsUpdate = true;
    }
  }, [isWireframe, sculptureRef]);


  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5F3EC);
    scene.fog = new THREE.Fog(0xF5F3EC, 8, 22);

    // Architectural Gallery Plinth & Subtle Datum Grid
    const gridGroup = new THREE.Group();
    const gridHelper = new THREE.GridHelper(12, 24, 0xD4CFBF, 0xE5E0D5);
    gridHelper.position.y = -1.98;
    gridGroup.add(gridHelper);

    // Refined stone pedestal base
    const pedestalGeo = new THREE.CylinderGeometry(2.1, 2.2, 0.08, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xE8E4DA,
      roughness: 0.88,
      metalness: 0.02,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -2.02;
    pedestal.receiveShadow = true;
    gridGroup.add(pedestal);

    // Fine concentric ring marker on plinth
    const ringGeo = new THREE.RingGeometry(1.8, 1.815, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xD0CBBF, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -1.97;
    gridGroup.add(ringMesh);

    scene.add(gridGroup);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 60);
    camera.position.set(0, 0, currentDistance.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // Sculptural chiaroscuro lighting (dramatic facets and deep shadows)
    const ambientLight = new THREE.AmbientLight(0xFFF7EC, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xFFFDF6, 3.4);
    keyLight.position.set(4.5, 5.8, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xD6E4F0, 0.6);
    fillLight.position.set(-4.0, 2.0, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xEFE4D4, 2.0);
    rimLight.position.set(-3.2, 3.2, -3.8);
    scene.add(rimLight);

    const corePointLight = new THREE.PointLight(0xC25E38, 0, 8);
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    const sculpture = new ProceduralSculpture();
    const initialMaterial = createSculptureMaterial(materialType);
    initialMaterial.wireframe = isWireframeRef.current;
    sculpture.mesh.material = initialMaterial;
    scene.add(sculpture.rootGroup);
    sculptureRef.current = sculpture;
    onMeshReady(sculpture.rootGroup as any);


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
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 0.26 * Math.cbrt(Math.random());
        x = r * Math.sin(phi) * Math.cos(theta);
        y = 0.85 + r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (part < 0.28) {
        x = (Math.random() - 0.5) * 0.18;
        y = 0.52 + Math.random() * 0.15;
        z = (Math.random() - 0.5) * 0.18;
      } else if (part < 0.65) {
        const ty = (Math.random() - 0.5) * 0.8;
        const shoulderWidth = ty > 0 ? 0.65 : 0.45;
        x = (Math.random() - 0.5) * shoulderWidth;
        y = 0.1 + ty;
        z = (Math.random() - 0.5) * 0.28;
      } else {
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
      color: 0x8c8273,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
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
      color: 0xc25e38,
      size: 0.05,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
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

    // Distant stars background
    const starsCount = 280;
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const idx = i * 3;
      starsPos[idx] = (Math.random() - 0.5) * 35;
      starsPos[idx + 1] = (Math.random() - 0.5) * 35;
      starsPos[idx + 2] = -15 - Math.random() * 15;
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

    // Mouse wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDistance.current = Math.max(3.0, Math.min(10.0, targetDistance.current + e.deltaY * 0.004));
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

      // Update grid visibility
      gridGroup.visible = showGridRef.current;

      // Smooth camera parallax & zoom
      currentParallax.current.x += (targetParallax.current.x - currentParallax.current.x) * 0.05;
      currentParallax.current.y += (targetParallax.current.y - currentParallax.current.y) * 0.05;
      currentDistance.current += (targetDistance.current - currentDistance.current) * 0.08;

      camera.position.x = currentParallax.current.x;
      camera.position.y = currentParallax.current.y;
      camera.position.z = currentDistance.current;
      camera.lookAt(0, 0, 0);

      // Rotation handling with auto-rotate toggle
      if (!isDraggingRef.current && isAutoRotateRef.current) {
        targetRotation.current.y += delta * (state === 'artefact' ? 0.03 : 0.05);
      }
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.08;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.08;

      sculpture.rootGroup.rotation.x = currentRotation.current.x;
      sculpture.rootGroup.rotation.y = currentRotation.current.y;


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

      // Smooth return to base scale if pulsed
      if (sculpture.mesh.scale.x > 1.001) {
        sculpture.mesh.scale.x += (1.0 - sculpture.mesh.scale.x) * 0.12;
        sculpture.mesh.scale.y += (1.0 - sculpture.mesh.scale.y) * 0.12;
        sculpture.mesh.scale.z += (1.0 - sculpture.mesh.scale.z) * 0.12;
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
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update material preset dynamically with tactile pulse
  useEffect(() => {
    if (sculptureRef.current && sculptureRef.current.mesh && !sculptureRef.current.isCouples) {
      const newMaterial = createSculptureMaterial(materialType);
      newMaterial.wireframe = isWireframeRef.current;
      sculptureRef.current.mesh.material = newMaterial;
      sculptureRef.current.mesh.scale.set(1.05, 1.05, 1.05);
    }
  }, [materialType, sculptureRef]);


  return <div ref={mountRef} className="canvas-wrapper" />;
};
