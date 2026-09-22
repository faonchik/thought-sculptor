import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { HallSpecimen } from '../services/hallStorage';

interface SpecimenThumbnailProps {
  specimen: HallSpecimen;
}

const thumbnailCache = new Map<string, string>();

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;
let sharedAmbientLight: THREE.AmbientLight | null = null;
let sharedKeyLight: THREE.DirectionalLight | null = null;
let sharedFillLight: THREE.DirectionalLight | null = null;

function getSharedRenderer(): { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null {
  try {
    if (!sharedRenderer) {
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 220;

      sharedRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power',
      });
      sharedRenderer.setSize(360, 220, false);
      sharedRenderer.setPixelRatio(1);
      sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      sharedRenderer.toneMappingExposure = 1.3;

      sharedScene = new THREE.Scene();
      sharedCamera = new THREE.PerspectiveCamera(36, 360 / 220, 0.1, 20);
      sharedCamera.position.set(0, 0, 4.3);

      sharedAmbientLight = new THREE.AmbientLight(0x404452, 2.2);
      sharedScene.add(sharedAmbientLight);

      sharedKeyLight = new THREE.DirectionalLight(0xffffff, 2.6);
      sharedKeyLight.position.set(3, 4, 3);
      sharedScene.add(sharedKeyLight);

      sharedFillLight = new THREE.DirectionalLight(0x8fa3c7, 1.5);
      sharedFillLight.position.set(-3, 1, 2);
      sharedScene.add(sharedFillLight);
    }
    return { renderer: sharedRenderer, scene: sharedScene!, camera: sharedCamera! };
  } catch (e) {
    console.warn('WebGL shared renderer init skipped, using procedural vector stone', e);
    return null;
  }
}

function render3DThumbnail(specimen: HallSpecimen): string | null {
  const shared = getSharedRenderer();
  if (!shared) return null;

  try {
    const { renderer, scene, camera } = shared;

    const rimLight = new THREE.DirectionalLight(new THREE.Color(specimen.dominantMood.colorHex), 2.5);
    rimLight.position.set(-2, -2, -3);
    scene.add(rimLight);

    const geometry = new THREE.IcosahedronGeometry(0.74, 4);
    const pos = geometry.attributes.position.array as Float32Array;
    const count = geometry.attributes.position.count;

    let scaleX = 1.0;
    let scaleY = 1.0;
    let scaleZ = 1.0;
    let taper = 0.0;
    let twist = 0.0;
    let bendX = 0.0;

    switch (specimen.macroType) {
      case 'spire':
        scaleY = 1.34;
        scaleX = 0.82;
        scaleZ = 0.82;
        taper = 0.36;
        twist = 0.28;
        break;
      case 'disc':
        scaleY = 0.68;
        scaleX = 1.28;
        scaleZ = 1.22;
        taper = -0.08;
        break;
      case 'monolith':
        scaleY = 1.18;
        scaleX = 1.02;
        scaleZ = 1.00;
        twist = 0.25;
        bendX = 0.14;
        break;
      case 'teardrop':
        scaleY = 1.25;
        scaleX = 0.86;
        scaleZ = 0.86;
        taper = -0.36;
        break;
      case 'crescent':
        scaleY = 1.18;
        scaleX = 0.88;
        scaleZ = 0.90;
        bendX = 0.36;
        taper = 0.16;
        break;
      default:
        scaleY = 1.08;
        scaleX = 1.0;
        scaleZ = 1.0;
    }

    const r = 0.74;
    const seed = specimen.uniqueSeed || 42;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let x = pos[idx];
      let y = pos[idx + 1];
      let z = pos[idx + 2];

      const len = Math.sqrt(x * x + y * y + z * z) || 1.0;
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      const noise = (Math.sin(nx * 3.4 + ny * 4.2 + seed * 0.1) + Math.cos(nz * 3.6 + seed * 0.05)) * 0.055;
      x = nx * (r + noise);
      y = ny * (r + noise);
      z = nz * (r + noise);

      const normY = y / r;
      const taperFactor = Math.max(0.18, 1.0 + normY * taper);
      x *= taperFactor;
      z *= taperFactor;

      x *= scaleX;
      y *= scaleY;
      z *= scaleZ;

      if (Math.abs(twist) > 0.01) {
        const angle = (y / (r * scaleY)) * twist;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const rx = x * cosA - z * sinA;
        const rz = x * sinA + z * cosA;
        x = rx;
        z = rz;
      }

      if (Math.abs(bendX) > 0.01) {
        const arch = 1.0 - Math.min(1.0, (y * y) / (scaleY * scaleY * r * r));
        x += bendX * arch;
      }

      pos[idx] = x;
      pos[idx + 1] = y;
      pos[idx + 2] = z;
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(specimen.dominantMood.colorHex),
      roughness: specimen.material === 'obsidian' ? 0.32 : specimen.material === 'graphite' ? 0.48 : 0.74,
      metalness: specimen.material === 'obsidian' ? 0.42 : specimen.material === 'graphite' ? 0.62 : 0.12,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = 0.22;
    mesh.rotation.y = -0.42;
    scene.add(mesh);

    const ringGeom = new THREE.RingGeometry(0.65, 0.72, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(specimen.dominantMood.colorHex),
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -1.15;
    scene.add(ringMesh);

    renderer.render(scene, camera);

    const dataUrl = renderer.domElement.toDataURL('image/webp', 0.92);

    scene.remove(mesh);
    scene.remove(ringMesh);
    scene.remove(rimLight);

    geometry.dispose();
    material.dispose();
    ringGeom.dispose();
    ringMat.dispose();

    return dataUrl;
  } catch (err) {
    console.warn('3D thumbnail generation failed', err);
    return null;
  }
}

function ProceduralStoneSvg({ specimen }: { specimen: HallSpecimen }) {
  const seed = specimen.uniqueSeed || 42;
  const moodColor = specimen.dominantMood.colorHex || '#4ade80';

  const pathD = useMemo(() => {
    let scaleX = 1.0;
    let scaleY = 1.0;
    let taper = 0.0;
    let shiftY = 0;

    switch (specimen.macroType) {
      case 'spire':
        scaleX = 0.68;
        scaleY = 1.25;
        taper = 0.25;
        shiftY = -4;
        break;
      case 'disc':
        scaleX = 1.30;
        scaleY = 0.64;
        shiftY = 6;
        break;
      case 'monolith':
        scaleX = 0.95;
        scaleY = 1.12;
        shiftY = -2;
        break;
      case 'teardrop':
        scaleX = 0.78;
        scaleY = 1.18;
        taper = -0.32;
        shiftY = 2;
        break;
      case 'crescent':
        scaleX = 0.85;
        scaleY = 1.10;
        shiftY = 0;
        break;
      default:
        scaleX = 1.0;
        scaleY = 0.92;
    }

    const nPoints = 16;
    const pts: [number, number][] = [];
    const cx = 100;
    const cy = 82 + shiftY;
    const baseR = 48;

    for (let i = 0; i < nPoints; i++) {
      const theta = (i / nPoints) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const noise =
        Math.sin(theta * 2 + seed * 0.12) * 0.06 +
        Math.cos(theta * 3 + seed * 0.08) * 0.04;

      const r = baseR * (1.0 + noise);
      let px = r * cosT * scaleX;
      let py = r * sinT * scaleY;

      const normY = py / (baseR * scaleY);
      const taperFactor = Math.max(0.2, 1.0 + normY * taper);
      px *= taperFactor;

      pts.push([cx + px, cy + py]);
    }

    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < nPoints; i++) {
      const p0 = pts[(i - 1 + nPoints) % nPoints];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % nPoints];
      const p3 = pts[(i + 2) % nPoints];

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    d += ' Z';
    return d;
  }, [specimen.macroType, seed]);

  const gradId = `stone-grad-${specimen.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const rimGradId = `stone-rim-${specimen.id.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      viewBox="0 0 200 160"
      className="hall-specimen-thumb-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Deep 3D radial shading giving river stone sphere volume */}
        <radialGradient id={gradId} cx="34%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.48" />
          <stop offset="28%" stopColor={moodColor} stopOpacity="0.95" />
          <stop offset="68%" stopColor="#12161f" stopOpacity="1" />
          <stop offset="100%" stopColor="#07080b" stopOpacity="1" />
        </radialGradient>

        {/* Dynamic mood rim glow */}
        <linearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={moodColor} stopOpacity="0.8" />
          <stop offset="50%" stopColor={moodColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
        </linearGradient>

        <filter id={`shadow-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.75" />
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={moodColor} floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Pedestal energy ring & contact shadow */}
      <ellipse cx="100" cy="144" rx="46" ry="8" fill="#000000" opacity="0.65" />
      <ellipse
        cx="100"
        cy="144"
        rx="48"
        ry="9"
        fill="none"
        stroke={moodColor}
        strokeWidth="1.2"
        opacity="0.35"
      />
      <ellipse cx="100" cy="144" rx="38" ry="6" fill={moodColor} opacity="0.12" />

      {/* Smooth river stone body */}
      <path
        d={pathD}
        fill={`url(#${gradId})`}
        stroke={`url(#${rimGradId})`}
        strokeWidth="1.4"
        filter={`url(#shadow-${gradId})`}
      />

      {/* Specular soft light crest (velvety reflection) */}
      <ellipse
        cx="82"
        cy="65"
        rx="18"
        ry="10"
        transform="rotate(-20 82 65)"
        fill="#ffffff"
        opacity="0.18"
        filter="blur(3px)"
      />
    </svg>
  );
}

export const SpecimenThumbnail: React.FC<SpecimenThumbnailProps> = ({ specimen }) => {
  const [imgUrl, setImgUrl] = useState<string>(() => {
    return specimen.thumbnailUrl || thumbnailCache.get(specimen.id) || '';
  });

  useEffect(() => {
    if (imgUrl) return;

    // Try 3D WebGL render
    const generated = render3DThumbnail(specimen);
    if (generated) {
      thumbnailCache.set(specimen.id, generated);
      setImgUrl(generated);
    }
  }, [specimen, imgUrl]);

  return (
    <div className="specimen-thumbnail-container">
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={specimen.name}
          className="hall-specimen-thumb-img"
          loading="lazy"
        />
      ) : (
        <ProceduralStoneSvg specimen={specimen} />
      )}
    </div>
  );
};
