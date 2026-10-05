import * as THREE from 'three';
import type { AcousticFeatures, MaterialPresetType } from '../../types';

// Deterministic fast noise & pseudo-random utilities
function pseudoNoise(x: number, y: number, z: number, seed: number = 42): number {
  const p1 = Math.sin(x * 1.7 + y * 2.3 + z * 1.1 + seed) * 43758.5453;
  const p2 = Math.cos(x * 3.1 - y * 1.9 + z * 2.7 - seed * 0.5) * 23421.6312;
  return ((p1 + p2) % 1 + 1) % 1;
}

// Multi-octave continuous organic noise
function multiOctaveFractal(
  x: number,
  y: number,
  z: number,
  octaves: number = 4,
  lacunarity: number = 2.1,
  gain: number = 0.5
): number {
  let total = 0;
  let frequency = 1.2;
  let amplitude = 1.0;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    // 3D trigonometric pseudo-simplex noise approximation
    const n =
      Math.sin(x * frequency + Math.cos(z * frequency * 0.7)) *
      Math.cos(y * frequency + Math.sin(x * frequency * 0.8)) *
      Math.sin(z * frequency * 0.9 + y * 0.5);

    // Diagonal mineral fissure cross-term
    const shear = Math.sin((x + y + z) * frequency * 1.4) * 0.4;

    total += (n + shear) * amplitude;
    maxAmp += amplitude * 1.4;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return total / (maxAmp || 1.0);
}

// Generate high-resolution procedural micro-relief and roughness bump textures
export function generateProceduralMineralTextures(type: MaterialPresetType): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const bImg = bCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;

      // Micro-grain base
      const grain = (Math.random() - 0.5) * 35;

      // Porous pits & mineral fissures
      const f1 = Math.sin(u * 28 + Math.cos(v * 36) * 2.5);
      const f2 = Math.cos(v * 42 + Math.sin(u * 24) * 3.0);
      const fissure = Math.abs(f1 + f2) < 0.22 ? 65 : 0;

      // Fine mineral strata
      const strata = Math.sin(v * 64 + u * 12) * 20;

      let bumpVal = 128 + grain * 0.8 + strata * 0.4 - fissure;
      let roughVal = 140;

      if (type === 'ceramic') {
        // Baked Terracotta: coarse porous grain, clay dust, matte pits
        const clayGrit = (Math.random() - 0.5) * 55;
        const pore = Math.random() > 0.96 ? -70 : 0;
        bumpVal = Math.max(0, Math.min(255, 130 + clayGrit + strata * 0.3 + pore));
        roughVal = Math.max(0, Math.min(255, 215 + (Math.random() - 0.5) * 30));
      } else if (type === 'basalt') {
        // Carrara Marble: subtle mineral veining, fine calcite micro-pores, smooth patches
        const marbleVein = Math.sin(u * 14 + Math.sin(v * 16) * 4.0);
        const isVein = Math.abs(marbleVein) < 0.18 ? 45 : 0;
        bumpVal = Math.max(0, Math.min(255, 128 + grain * 0.5 + isVein - fissure * 0.4));
        roughVal = Math.max(0, Math.min(255, 105 + grain * 0.4 + (isVein ? 35 : 0)));
      } else if (type === 'graphite') {
        // Patinated Bronze: hammered micro-facets, dark patinated crevices
        const hammer = Math.sin(u * 32) * Math.cos(v * 32) * 30;
        bumpVal = Math.max(0, Math.min(255, 128 + hammer + grain * 0.7 - fissure * 0.8));
        roughVal = Math.max(0, Math.min(255, 120 + hammer * 0.5 + (fissure > 0 ? 60 : 0)));
      } else {
        // Polished Onyx: sharp fractures, mirror polish with subtle inclusions
        const inclusion = Math.random() > 0.985 ? 90 : 0;
        bumpVal = Math.max(0, Math.min(255, 128 + grain * 0.25 - fissure * 0.9 + inclusion));
        roughVal = Math.max(0, Math.min(255, 55 + (fissure > 0 ? 80 : 0)));
      }

      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }

  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);

  return { bumpMap, roughnessMap };
}

// Create dedicated PBR material for the museum monolith
export function createEditorialMaterial(type: MaterialPresetType): THREE.MeshStandardMaterial {
  const { bumpMap, roughnessMap } = generateProceduralMineralTextures(type);

  switch (type) {
    case 'ceramic': // Baked Terracotta
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xB55633), // Warm authentic terracotta
        roughness: 0.88,
        metalness: 0.02,
        bumpMap,
        bumpScale: 0.038,
        roughnessMap,
        flatShading: false,
      });

    case 'graphite': // Patinated Antique Bronze
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x6A5844),
        roughness: 0.44,
        metalness: 0.72,
        bumpMap,
        bumpScale: 0.032,
        roughnessMap,
        flatShading: false,
      });

    case 'obsidian': // Polished Onyx / Basalt
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x222428),
        roughness: 0.22,
        metalness: 0.15,
        bumpMap,
        bumpScale: 0.02,
        roughnessMap,
        flatShading: false,
      });

    case 'basalt': // Carrara Marble (default)
    default:
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xEDE9E1), // Warm translucent off-white marble
        roughness: 0.42,
        metalness: 0.04,
        bumpMap,
        bumpScale: 0.026,
        roughnessMap,
        flatShading: false,
      });
  }
}

/**
 * EditorialAcousticMonolith
 * Represents a museum-grade sculptural acoustic monolith with:
 * - Asymmetrical natural silhouette (tapered apex, weighted basal plinth, erosion shear)
 * - Multi-layered geological micro-relief (fissures, acoustic strata terraces, porous pitting)
 * - Live acoustic deformation that carves resonant strata into the solid
 * - Fine floating dust motes with Brownian drift
 */
export class EditorialAcousticMonolith {
  public rootGroup: THREE.Group;
  public mesh: THREE.Mesh;
  public particles: THREE.Points;

  private geometry: THREE.BufferGeometry;
  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private unitNormals: Float32Array;
  private acousticCarve: Float32Array;
  private vertexCount: number;

  // Particle dynamics
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private particleCount: number = 380;

  // Geological deformation parameters
  private timeElapsed: number = 0;
  private currentMaterialType: MaterialPresetType = 'basalt';

  constructor(materialType: MaterialPresetType = 'basalt') {
    this.rootGroup = new THREE.Group();
    this.currentMaterialType = materialType;

    // Use high-density icosahedron geometry (level 5 subdivision => 5120 faces, 2562 vertices)
    this.geometry = new THREE.IcosahedronGeometry(1.0, 5);
    this.vertexCount = this.geometry.attributes.position.count;

    const pos = this.geometry.attributes.position.array as Float32Array;
    this.basePositions = new Float32Array(pos.length);
    this.currentPositions = new Float32Array(pos.length);
    this.unitNormals = new Float32Array(pos.length);
    this.acousticCarve = new Float32Array(pos.length);

    // Sculpt asymmetrical geological monolithic base
    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const x = pos[idx];
      const y = pos[idx + 1];
      const z = pos[idx + 2];

      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      this.unitNormals[idx] = nx;
      this.unitNormals[idx + 1] = ny;
      this.unitNormals[idx + 2] = nz;

      // 1. Asymmetrical Monolithic Profile (Geological Form)
      // Slight vertical elongation + tapered crown (apex) + grounded sturdy base
      let rx = nx;
      let ry = ny * 1.14; // Slightly taller
      let rz = nz * 0.94; // Compressed depth

      // Taper toward apex (narrow top, wider stable foundation)
      const taperFactor = 1.0 - (ny * 0.16);
      rx *= taperFactor;
      rz *= taperFactor;

      // Subtle geological axial shear / tilt (natural stone formation, not mechanical sphere)
      rx += Math.sin(ny * 2.2) * 0.08;
      rz += Math.cos(ny * 1.8) * 0.06;

      // 2. Multi-Octave Geological Micro-Relief & Varied Density
      // Macro erosion (low-frequency rock faceting)
      const macroErosion = multiOctaveFractal(rx * 1.4, ry * 1.4, rz * 1.4, 3, 2.0, 0.55) * 0.14;

      // Lateral acoustic strata terraces (horizontal layered sediment bands)
      const strataBands = Math.sin(ry * 14.0 + rx * 2.5) * 0.035;

      // Deep mineral fissures (eroded crags on one side, smooth worn stone on the other)
      const fissureSide = (rx * 0.6 + rz * 0.4);
      const mineralFissure = Math.pow(Math.abs(multiOctaveFractal(rx * 3.8, ry * 3.8, rz * 3.8, 3, 2.2, 0.45)), 1.8) * 0.09 * (fissureSide > -0.2 ? 1.0 : 0.25);

      // Micro-porous texture
      const microPorous = (pseudoNoise(rx * 18, ry * 18, rz * 18) - 0.5) * 0.022;

      // Base radius calculation
      const radius = 0.88 + macroErosion + strataBands - mineralFissure + microPorous;

      const finalX = rx * radius;
      const finalY = ry * radius;
      const finalZ = rz * radius;

      this.basePositions[idx] = finalX;
      this.basePositions[idx + 1] = finalY;
      this.basePositions[idx + 2] = finalZ;

      this.currentPositions[idx] = finalX;
      this.currentPositions[idx + 1] = finalY;
      this.currentPositions[idx + 2] = finalZ;

      pos[idx] = finalX;
      pos[idx + 1] = finalY;
      pos[idx + 2] = finalZ;
    }

    this.geometry.computeVertexNormals();

    const mat = createEditorialMaterial(materialType);
    this.mesh = new THREE.Mesh(this.geometry, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.rootGroup.add(this.mesh);

    // -------------------------------------------------------------------------
    // FLOATING MICRO-DUST PARTICLES
    // -------------------------------------------------------------------------
    const pGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleVelocities = new Float32Array(this.particleCount * 3);

    for (let p = 0; p < this.particleCount; p++) {
      const pIdx = p * 3;
      // Distribute in a delicate orbital envelope around the monolith
      const radius = 1.35 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.85;

      this.particlePositions[pIdx] = radius * Math.cos(phi) * Math.cos(theta);
      this.particlePositions[pIdx + 1] = radius * Math.sin(phi);
      this.particlePositions[pIdx + 2] = radius * Math.cos(phi) * Math.sin(theta);

      // Slow gentle floating drift
      this.particleVelocities[pIdx] = (Math.random() - 0.5) * 0.012;
      this.particleVelocities[pIdx + 1] = 0.004 + Math.random() * 0.015;
      this.particleVelocities[pIdx + 2] = (Math.random() - 0.5) * 0.012;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    // Delicate warm dust point material
    const pMat = new THREE.PointsMaterial({
      color: 0xBA5D38, // Warm terracotta mote tint
      size: 0.024,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(pGeo, pMat);
    this.rootGroup.add(this.particles);
  }

  public updateMaterial(type: MaterialPresetType) {
    if (this.currentMaterialType === type) return;
    this.currentMaterialType = type;
    const isWire = (this.mesh.material as THREE.MeshStandardMaterial).wireframe;
    const newMat = createEditorialMaterial(type);
    newMat.wireframe = isWire;
    this.mesh.material = newMat;
  }

  public setWireframe(wire: boolean) {
    if (this.mesh.material) {
      (this.mesh.material as THREE.MeshStandardMaterial).wireframe = wire;
      (this.mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  }

  /**
   * Update live deformation and particle float
   */
  public update(delta: number, features: AcousticFeatures | null, isObserving: boolean) {
    this.timeElapsed += delta;

    // 1. Update Floating Dust Particles
    const pPos = this.particles.geometry.attributes.position.array as Float32Array;
    for (let p = 0; p < this.particleCount; p++) {
      const idx = p * 3;
      pPos[idx] += this.particleVelocities[idx];
      pPos[idx + 1] += this.particleVelocities[idx + 1];
      pPos[idx + 2] += this.particleVelocities[idx + 2];

      // Subtle spiral orbital drift
      pPos[idx] += -pPos[idx + 2] * 0.0008;
      pPos[idx + 2] += pPos[idx] * 0.0008;

      // Wrap if drifted too high
      if (pPos[idx + 1] > 2.2) {
        pPos[idx + 1] = -1.6;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // 2. Real-time Acoustic Carving / Morphing
    const pos = this.geometry.attributes.position.array as Float32Array;
    const isCarving = isObserving && features !== null && features.rms > 0.02;

    if (isCarving && features) {
      const pitchNorm = Math.min(1.0, Math.max(0.0, (features.pitch - 80) / 400));
      const energy = features.rms;
      const centroid = features.spectralCentroid;
      const flux = features.spectralFlux;

      for (let i = 0; i < this.vertexCount; i++) {
        const idx = i * 3;
        const ny = this.unitNormals[idx + 1];
        const nx = this.unitNormals[idx];
        const nz = this.unitNormals[idx + 2];

        // Apex acoustic fluting (high frequencies carve sharper ridges near apex)
        const apexFactor = Math.max(0, ny);
        const apexResonance = Math.sin(ny * (12 + pitchNorm * 24)) * apexFactor * energy * 0.08;

        // Lateral strata carving (mid-frequencies sculpt horizontal terraces)
        const lateralFactor = 1.0 - Math.abs(ny);
        const lateralStrata = Math.cos((nx + nz) * 8.0 + this.timeElapsed * 2.0) * lateralFactor * centroid * energy * 0.06;

        // Dynamic energy shear
        const carveDelta = (apexResonance + lateralStrata + flux * 0.02) * delta * 2.5;
        this.acousticCarve[idx] += carveDelta * this.unitNormals[idx];
        this.acousticCarve[idx + 1] += carveDelta * this.unitNormals[idx + 1];
        this.acousticCarve[idx + 2] += carveDelta * this.unitNormals[idx + 2];

        // Apply to position
        pos[idx] = this.basePositions[idx] + this.acousticCarve[idx];
        pos[idx + 1] = this.basePositions[idx + 1] + this.acousticCarve[idx + 1];
        pos[idx + 2] = this.basePositions[idx + 2] + this.acousticCarve[idx + 2];
      }

      this.geometry.computeVertexNormals();
      this.geometry.attributes.position.needsUpdate = true;
    } else if (!isObserving && this.timeElapsed % 2 < 0.04) {
      // Idle micro-breathing (imperceptible living stone presence)
      const breath = Math.sin(this.timeElapsed * 0.8) * 0.004;
      for (let i = 0; i < this.vertexCount; i++) {
        const idx = i * 3;
        pos[idx] = (this.basePositions[idx] + this.acousticCarve[idx]) * (1.0 + breath);
        pos[idx + 1] = (this.basePositions[idx + 1] + this.acousticCarve[idx + 1]) * (1.0 + breath * 0.8);
        pos[idx + 2] = (this.basePositions[idx + 2] + this.acousticCarve[idx + 2]) * (1.0 + breath);
      }
      this.geometry.attributes.position.needsUpdate = true;
    }
  }

  public resetCarve() {
    const pos = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      this.acousticCarve[idx] = 0;
      this.acousticCarve[idx + 1] = 0;
      this.acousticCarve[idx + 2] = 0;
      pos[idx] = this.basePositions[idx];
      pos[idx + 1] = this.basePositions[idx + 1];
      pos[idx + 2] = this.basePositions[idx + 2];
    }
    this.geometry.computeVertexNormals();
    this.geometry.attributes.position.needsUpdate = true;
  }
}
