import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import type { HallSpecimen } from '../services/hallStorage';
import { ProceduralSculpture } from '../services/proceduralGeometry';
import { createSculptureMaterial } from '../services/materialPresets';
import type { VoiceDNA, AcousticFeatures } from '../types';

interface SpecimenThumbnailProps {
  specimen: HallSpecimen;
}

const thumbnailCache = new Map<string, string>();

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;

function getSharedRenderer(): { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null {
  try {
    if (!sharedRenderer) {
      const canvas = document.createElement('canvas');
      canvas.width = 440;
      canvas.height = 260;

      sharedRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      sharedRenderer.setSize(440, 260, false);
      sharedRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      sharedRenderer.toneMappingExposure = 1.05;

      sharedScene = new THREE.Scene();
      sharedCamera = new THREE.PerspectiveCamera(36, 440 / 260, 0.1, 20);
      sharedCamera.position.set(0, 0, 4.6);

      // Gallery studio lighting with hemisphere skylight and front fill so dark minerals reveal tactile facets
      const hemiLight = new THREE.HemisphereLight(0xFFFDF8, 0xD4C8B8, 1.3);
      sharedScene.add(hemiLight);

      const ambientLight = new THREE.AmbientLight(0xFFF7EC, 1.1);
      sharedScene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xFFFDF6, 3.6);
      keyLight.position.set(4.5, 5.8, 3.8);
      sharedScene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xD6E4F0, 1.2);
      fillLight.position.set(-4.0, 2.0, 2.8);
      sharedScene.add(fillLight);

      const frontLight = new THREE.DirectionalLight(0xFFFFFF, 1.3);
      frontLight.position.set(0.0, 0.8, 4.2);
      sharedScene.add(frontLight);

      const rimLight = new THREE.DirectionalLight(0xEFE4D4, 2.2);
      rimLight.position.set(-3.2, 3.2, -3.8);
      sharedScene.add(rimLight);
    }
    return { renderer: sharedRenderer, scene: sharedScene!, camera: sharedCamera! };
  } catch (e) {
    console.warn('WebGL shared thumbnail renderer error', e);
    return null;
  }
}

let sharedShadowTexture: THREE.CanvasTexture | null = null;

function getSharedShadowTexture(): THREE.CanvasTexture {
  if (!sharedShadowTexture) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(40, 32, 24, 0.18)');
    gradient.addColorStop(0.35, 'rgba(40, 32, 24, 0.08)');
    gradient.addColorStop(0.7, 'rgba(40, 32, 24, 0.02)');
    gradient.addColorStop(1, 'rgba(40, 32, 24, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    sharedShadowTexture = new THREE.CanvasTexture(canvas);
  }
  return sharedShadowTexture;
}

function render3DThumbnail(specimen: HallSpecimen): string | null {
  const shared = getSharedRenderer();
  if (!shared) return null;

  try {
    const { renderer, scene, camera } = shared;

    const pitchVal = specimen.avgPitch || (specimen.macroType === 'spire' ? 285 : specimen.macroType === 'disc' ? 95 : 175);
    const simulatedVoiceDNA: VoiceDNA = {
      avgPitch: pitchVal,
      avgCentroid: 0.38,
      avgSpread: 0.35,
      avgFlatness: specimen.dominantMood?.mood === 'mysterious' ? 0.38 : 0.22,
      avgRolloff: specimen.macroType === 'spire' ? 0.70 : 0.40,
      avgZcr: specimen.dominantMood?.mood === 'angry' ? 0.35 : 0.16,
      avgHarmonicRatio: specimen.macroType === 'teardrop' ? 0.80 : 0.65,
      temporalVariability: 0.25,
      lowBandRatio: specimen.macroType === 'disc' ? 0.65 : 0.40,
      midBandRatio: 0.40,
      highBandRatio: specimen.macroType === 'spire' ? 0.55 : 0.30,
      peakRms: specimen.dominantMood?.mood === 'angry' ? 0.85 : 0.45,
      avgFlux: 0.35,
      uniqueSeed: specimen.uniqueSeed || 42100,
      signatureHash: specimen.uniqueSeed || 42100,
      dominantMood: specimen.dominantMood,
      morphStrategy: specimen.macroType === 'spire'
        ? 'spire'
        : specimen.macroType === 'disc'
        ? 'monolith'
        : specimen.macroType === 'crescent'
        ? 'crest'
        : specimen.macroType === 'teardrop'
        ? 'organic'
        : 'asymmetric',
      expressionScale: 1.0,
    };

    const simulatedFeatures: AcousticFeatures = {
      rms: 0.5,
      pitch: pitchVal,
      normalizedPitch: Math.max(0, Math.min(1, (pitchVal - 80) / 360)),
      spectralCentroid: 0.4,
      spectralSpread: 0.35,
      spectralFlatness: 0.22,
      spectralRolloff: 0.42,
      spectralFlux: 0.35,
      zeroCrossingRate: 0.16,
      harmonicRatio: 0.65,
      temporalVariability: 0.25,
      lowEnergy: 0.5,
      midEnergy: 0.5,
      highEnergy: 0.3,
      isSilent: false,
      speechRate: 0.5,
      mood: specimen.dominantMood,
    };

    // Use identical ProceduralSculpture and material shaders
    const sculpture = new ProceduralSculpture();

    if (specimen.isCouples) {
      const p1 = specimen.partner1Pitch || 125;
      const p2 = specimen.partner2Pitch || 245;
      const dna1: VoiceDNA = { ...simulatedVoiceDNA, avgPitch: p1, lowBandRatio: 0.58, uniqueSeed: specimen.uniqueSeed || 33110 };
      const feat1: AcousticFeatures = { ...simulatedFeatures, pitch: p1 };
      const dna2: VoiceDNA = { ...simulatedVoiceDNA, avgPitch: p2, highBandRatio: 0.58, uniqueSeed: (specimen.uniqueSeed || 33110) + 99 };
      const feat2: AcousticFeatures = { ...simulatedFeatures, pitch: p2 };

      sculpture.crystallizeCouplesArtefact(
        dna1,
        feat1,
        dna2,
        feat2,
        specimen.couplesArchetype || 'dyad',
        specimen.material,
        specimen.material2 || 'graphite'
      );
    } else {
      sculpture.crystallizeUniqueArtefact(simulatedVoiceDNA, simulatedFeatures, specimen.macroType);
      const material = createSculptureMaterial(specimen.material);
      sculpture.mesh.material = material;
    }

    sculpture.rootGroup.rotation.set(0.15, -0.3, 0);

    // Auto-fit bounding box normalization so models NEVER clip or exceed thumbnail boundaries
    const bbox = sculpture.computeCompoundBoundingBox();
    let shadowY = -1.25;
    let shadowScale = 1.0;

    if (bbox && !bbox.isEmpty()) {
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      // Fit comfortably within 1.52 units with safe margins
      const fitScale = 1.52 / (maxDim || 1);
      sculpture.rootGroup.scale.setScalar(fitScale);

      // Center vertically so tall spires, wide discs and couples sit perfectly in frame
      sculpture.rootGroup.position.set(-center.x * fitScale, -center.y * fitScale + 0.05, -center.z * fitScale);

      // Place contact shadow exactly under the model base
      shadowY = (bbox.min.y - center.y) * fitScale + 0.05;
      shadowScale = Math.max(0.75, Math.min(1.45, size.x * fitScale * 1.15));
    }

    // Natural soft daylight ground contact shadow
    const shadowTex = getSharedShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = shadowY - 0.01;
    shadowMesh.scale.setScalar(shadowScale);

    scene.add(sculpture.rootGroup);
    scene.add(shadowMesh);

    renderer.render(scene, camera);

    const dataUrl = renderer.domElement.toDataURL('image/webp', 0.94);

    scene.remove(sculpture.rootGroup);
    scene.remove(shadowMesh);

    sculpture.resetToDormant();
    shadowGeo.dispose();
    shadowMat.dispose();

    return dataUrl;
  } catch (err) {
    console.warn('3D thumbnail generation failed', err);
    return null;
  }
}

export const SpecimenThumbnail: React.FC<SpecimenThumbnailProps> = ({ specimen }) => {
  const couplesSuffix = specimen.isCouples ? `_${specimen.couplesArchetype}_${specimen.material2}` : '';
  const cacheKey = `${specimen.id}_${specimen.material}${couplesSuffix}_v7_couples_pbr`;


  const [imgUrl, setImgUrl] = useState<string>(() => {
    return thumbnailCache.get(cacheKey) || '';
  });

  useEffect(() => {
    const cached = thumbnailCache.get(cacheKey);
    if (cached) {
      setImgUrl(cached);
      return;
    }

    const generated = render3DThumbnail(specimen);
    if (generated) {
      thumbnailCache.set(cacheKey, generated);
      setImgUrl(generated);
    }
  }, [specimen, cacheKey]);

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
        <div className="thumb-placeholder-spinner" />
      )}
    </div>
  );
};
