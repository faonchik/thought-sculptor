import * as THREE from 'three';
import type { AcousticFeatures, VoiceDNA, MorphStrategy, CouplesArchetype, MaterialPresetType } from '../types';
import { createSculptureMaterial } from './materialPresets';

export interface MacroDeformation {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  taper: number;
  twist: number;
  bendX: number;
  bendZ: number;
  facetPower: number;
  gravitySag: number;
  expressionScale: number;
}

export const DEFAULT_MACRO: MacroDeformation = {
  scaleX: 1.0,
  scaleY: 1.04,
  scaleZ: 0.96,
  taper: 0.0,
  twist: 0.0,
  bendX: 0.0,
  bendZ: 0.0,
  facetPower: 1.0,
  gravitySag: 0.0,
  expressionScale: 1.0,
};

// Deterministic fast pseudo-random generator
function lcgRandom(seed: number): () => number {
  let s = (Math.abs(seed) ^ 0x6c62272e) + 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

// Seeded multi-octave 3D pseudo-noise with procedural rotation
export function seededMultiOctaveNoise(
  x: number,
  y: number,
  z: number,
  seed: number = 42,
  octaves: number = 3,
  roughness: number = 0.5
): number {
  const rng = lcgRandom(seed);
  const phaseX = rng() * 12.0;
  const phaseY = rng() * 12.0;
  const phaseZ = rng() * 12.0;
  const rotAngle = rng() * Math.PI * 2;
  const cosR = Math.cos(rotAngle);
  const sinR = Math.sin(rotAngle);

  // Rotate coordinate frame in XZ plane
  let rx = x * cosR - z * sinR + phaseX;
  let ry = y + phaseY;
  let rz = x * sinR + z * cosR + phaseZ;

  let total = 0;
  let amp = 1.0;
  let freq = 1.8;
  let maxAmp = 0;

  for (let o = 0; o < octaves; o++) {
    const s1 = Math.sin(rx * freq) * Math.cos(ry * freq * 1.15) * Math.sin(rz * freq * 0.95);
    const s2 = Math.cos((rx + ry) * freq * 0.75) * Math.sin((ry - rz) * freq * 0.85) * 0.5;
    total += (s1 + s2) * amp;
    maxAmp += amp * 1.5;
    amp *= roughness;
    freq *= 2.05;
  }

  return total / (maxAmp || 1.0);
}

interface SculptureSnapshot {
  carve: Float32Array;
  macro: MacroDeformation;
  color: THREE.Color;
}

export class ProceduralSculpture {
  public rootGroup: THREE.Group;
  public mesh: THREE.Mesh;
  public mesh2: THREE.Mesh | null = null;
  public isCouples: boolean = false;
  public couplesArchetype: CouplesArchetype = 'dyad';

  public geometry: THREE.BufferGeometry;
  private unitNormals: Float32Array;
  private currentPositions: Float32Array;
  private accumulatedCarve: Float32Array;
  private displayedCarve: Float32Array;
  private snapshotHistory: SculptureSnapshot[] = [];
  private vertexCount: number;

  private currentMacro: MacroDeformation = { ...DEFAULT_MACRO };
  private targetMacro: MacroDeformation = { ...DEFAULT_MACRO };
  private displayedMacro: MacroDeformation = { ...DEFAULT_MACRO };
  private finalMacro: MacroDeformation = { ...DEFAULT_MACRO };

  private breathingPhase: number = 0;
  private carvePhase: number = 0;
  private isFinalized: boolean = false;

  private currentColor: THREE.Color = new THREE.Color(0x454b56);
  private targetColor: THREE.Color = new THREE.Color(0x454b56);

  // Active voice morphology configuration
  public activeStrategy: MorphStrategy = 'asymmetric';
  public activeSeed: number = 42100;
  public activeExpressionScale: number = 1.0;
  public azimuthAngle: number = 0.45;

  constructor() {
    this.rootGroup = new THREE.Group();
    const baseIco = new THREE.IcosahedronGeometry(0.88, 5);
    this.geometry = baseIco;
    this.vertexCount = this.geometry.attributes.position.count;

    const pos = this.geometry.attributes.position.array as Float32Array;
    this.unitNormals = new Float32Array(pos.length);
    this.currentPositions = new Float32Array(pos.length);
    this.accumulatedCarve = new Float32Array(pos.length);
    this.displayedCarve = new Float32Array(pos.length);

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const x = pos[idx];
      const y = pos[idx + 1];
      const z = pos[idx + 2];

      const len = Math.sqrt(x * x + y * y + z * z);
      this.unitNormals[idx] = x / len;
      this.unitNormals[idx + 1] = y / len;
      this.unitNormals[idx + 2] = z / len;

      this.accumulatedCarve[idx] = 0;
      this.displayedCarve[idx] = 0;

      this.computeVertex(i, 0, DEFAULT_MACRO, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.computeVertexNormals();

    const initialMaterial = new THREE.MeshStandardMaterial({
      color: this.currentColor,
      roughness: 0.82,
      metalness: 0.08,
    });
    this.mesh = new THREE.Mesh(this.geometry, initialMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.rootGroup.add(this.mesh);
  }


  /**
   * Primary vertex deformation engine with 3-zone height stratification,
   * procedural noise, and morph strategy transformation
   */
  private computeVertex(
    i: number,
    carveAmount: number,
    macro: MacroDeformation,
    breathScale: number = 1.0
  ): void {
    const idx = i * 3;
    const nx = this.unitNormals[idx];
    const ny = this.unitNormals[idx + 1];
    const nz = this.unitNormals[idx + 2];

    const r = 0.74;

    let x = nx * (r + carveAmount);
    let y = ny * (r + carveAmount);
    let z = nz * (r + carveAmount);

    const normY = y / r;

    // 1. Zonal height stratification weights
    // Base zone: y < 0, peaks towards the bottom
    const wBase = Math.pow(Math.max(0, -normY), 1.35);
    // Mid zone: peaks at the waist (normY = 0)
    const wMid = Math.pow(Math.max(0, 1.0 - normY * normY), 1.2);
    // Crown zone: y > 0, peaks towards the top
    const wCrown = Math.pow(Math.max(0, normY), 1.35);

    // 2. Macro Taper & Base Flaring
    const taperFactor = Math.max(0.25, 1.0 + normY * macro.taper);
    x *= taperFactor;
    z *= taperFactor;

    // 3. Morphological Strategy Modulations
    if (this.activeStrategy === 'spire') {
      // Slender vertical apex with flute ridges
      y *= 1.0 + wCrown * 0.28 * macro.expressionScale;
      x *= 1.0 - wCrown * 0.15;
      z *= 1.0 - wCrown * 0.15;
    } else if (this.activeStrategy === 'monolith') {
      // Heavy flared plinth grounding
      const baseFlare = 1.0 + wBase * 0.35 * macro.expressionScale;
      x *= baseFlare;
      z *= baseFlare;
      y *= 1.0 - wBase * 0.10;
    } else if (this.activeStrategy === 'crest') {
      // Diagonal shear planes for crystalline facets
      const diagPlane = (nx + nz) * 0.5;
      x += Math.sin(diagPlane * 6.0) * 0.05 * macro.expressionScale;
      z += Math.cos(diagPlane * 6.0) * 0.05 * macro.expressionScale;
    } else if (this.activeStrategy === 'organic') {
      // Soft continuous droplet / pebble contours
      const organicWave = Math.sin(normY * 3.5 + nx * 2.0) * 0.04 * wMid;
      x += nx * organicWave;
      z += nz * organicWave;
    } else if (this.activeStrategy === 'asymmetric') {
      // Directional thrust along acoustic azimuth
      const azimuthCos = Math.cos(this.azimuthAngle);
      const azimuthSin = Math.sin(this.azimuthAngle);
      const proj = (nx * azimuthCos + nz * azimuthSin);
      const asymPush = proj * 0.12 * macro.expressionScale;
      x += azimuthCos * asymPush;
      z += azimuthSin * asymPush;
    }

    // 4. Macro Scales
    x *= macro.scaleX;
    y *= macro.scaleY;
    z *= macro.scaleZ;

    // 5. Helical Twist (with strategy amplification in 'spiral')
    const effectiveTwist = this.activeStrategy === 'spiral'
      ? macro.twist * 1.6 + 0.35 * macro.expressionScale
      : macro.twist;

    if (Math.abs(effectiveTwist) > 0.01) {
      const angle = (y / Math.max(0.2, r * macro.scaleY)) * effectiveTwist;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;
      x = rx;
      z = rz;
    }

    // 6. Curvature Arch Bend (X and Z)
    if (Math.abs(macro.bendX) > 0.01) {
      const archFactor = 1.0 - Math.min(1.0, (y * y) / Math.max(0.1, macro.scaleY * macro.scaleY * r * r));
      x += macro.bendX * archFactor;
    }
    if (Math.abs(macro.bendZ) > 0.01) {
      const archFactor = 1.0 - Math.min(1.0, (y * y) / Math.max(0.1, macro.scaleY * macro.scaleY * r * r));
      z += macro.bendZ * archFactor;
    }

    // 7. Gravity sag / bottom settling
    if (macro.gravitySag > 0.01 && ny < 0) {
      y -= -ny * macro.gravitySag * 0.25;
    }

    this.currentPositions[idx] = x * breathScale;
    this.currentPositions[idx + 1] = y * breathScale;
    this.currentPositions[idx + 2] = z * breathScale;
  }

  public recordCarveSnapshot(): void {
    this.snapshotHistory.push({
      carve: new Float32Array(this.accumulatedCarve),
      macro: { ...this.currentMacro },
      color: this.currentColor.clone(),
    });
  }

  /**
   * Real-time acoustic sculpting during voice recording
   */
  public update(delta: number, features: AcousticFeatures | null, isObserving: boolean): void {
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    if (material && material.color) {
      this.currentColor.lerp(this.targetColor, delta * 4.0);
      material.color.copy(this.currentColor);
    }

    if (this.isFinalized) {
      this.breathingPhase += delta * 0.5;
      const micro = 1.0 + Math.sin(this.breathingPhase) * 0.004;

      for (let i = 0; i < this.vertexCount; i++) {
        const idx = i * 3;
        this.computeVertex(i, this.displayedCarve[idx], this.displayedMacro, micro);
      }

      (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.computeVertexNormals();
      return;
    }

    if (!features || !isObserving) {
      this.breathingPhase += delta * 0.75;
      const breathScale = 1.0 + Math.sin(this.breathingPhase) * 0.015;

      for (let i = 0; i < this.vertexCount; i++) {
        this.computeVertex(i, 0, DEFAULT_MACRO, breathScale);
      }

      (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.computeVertexNormals();
      return;
    }

    if (features.mood && features.mood.colorHex) {
      this.targetColor.set(features.mood.colorHex);
    }

    this.breathingPhase += delta * (1.2 + features.speechRate * 3.5);
    this.carvePhase += delta * (0.6 + features.speechRate * 2.8);

    const carveSpeed = delta * (features.rms * 2.4 + 0.08);
    const pitchNorm = features.normalizedPitch;
    const isLoud = features.rms > 0.44;
    const isQuiet = features.rms < 0.20 && !features.isSilent;
    const shoutIntensity = Math.pow(features.rms, 1.25);
    const moodType = features.mood?.mood || 'calm';

    // Real-time macro adjustments based on pitch, loudness, and mood
    if (moodType === 'angry' || isLoud) {
      this.targetMacro.scaleY = 1.32;
      this.targetMacro.scaleX = 0.90;
      this.targetMacro.scaleZ = 0.90;
      this.targetMacro.taper = 0.28;
      this.targetMacro.twist = 0.35 * Math.sin(this.carvePhase * 0.9);
      this.targetMacro.bendX = 0.18;
      this.targetMacro.gravitySag = 0.02;
    } else if (moodType === 'joyful') {
      this.targetMacro.scaleY = 1.34;
      this.targetMacro.scaleX = 0.84;
      this.targetMacro.scaleZ = 0.84;
      this.targetMacro.taper = 0.35;
      this.targetMacro.twist = 0.28;
      this.targetMacro.bendX = 0.08;
      this.targetMacro.gravitySag = 0.04;
    } else if (moodType === 'sad') {
      this.targetMacro.scaleY = 1.22;
      this.targetMacro.scaleX = 0.88;
      this.targetMacro.scaleZ = 0.88;
      this.targetMacro.taper = -0.36;
      this.targetMacro.twist = 0.06;
      this.targetMacro.bendX = 0.06;
      this.targetMacro.gravitySag = 0.35;
    } else if (moodType === 'mysterious') {
      this.targetMacro.scaleY = 1.18;
      this.targetMacro.scaleX = 0.88;
      this.targetMacro.scaleZ = 0.90;
      this.targetMacro.bendX = 0.36;
      this.targetMacro.taper = 0.16;
      this.targetMacro.twist = 0.24;
      this.targetMacro.gravitySag = 0.10;
    } else {
      const pitchFactor = (pitchNorm - 0.5) * 2.0;
      if (pitchFactor < -0.25) {
        const bassIntensity = Math.min(1.0, -pitchFactor);
        this.targetMacro.scaleY = 0.84 - bassIntensity * 0.12;
        this.targetMacro.scaleX = 1.18 + bassIntensity * 0.12;
        this.targetMacro.scaleZ = 1.16 + bassIntensity * 0.10;
        this.targetMacro.taper = -0.10;
      } else {
        this.targetMacro.scaleY = 1.05 + pitchFactor * 0.18;
        this.targetMacro.scaleX = 1.0 - pitchFactor * 0.10;
        this.targetMacro.scaleZ = 1.0 - pitchFactor * 0.10;
        this.targetMacro.taper = pitchFactor * 0.12;
      }
      this.targetMacro.twist = 0.06;
      this.targetMacro.bendX = 0.04;
      this.targetMacro.gravitySag = 0.06;
    }

    const macroLerp = Math.min(1.0, delta * 3.5);
    this.currentMacro.scaleX += (this.targetMacro.scaleX - this.currentMacro.scaleX) * macroLerp;
    this.currentMacro.scaleY += (this.targetMacro.scaleY - this.currentMacro.scaleY) * macroLerp;
    this.currentMacro.scaleZ += (this.targetMacro.scaleZ - this.currentMacro.scaleZ) * macroLerp;
    this.currentMacro.taper += (this.targetMacro.taper - this.currentMacro.taper) * macroLerp;
    this.currentMacro.twist += (this.targetMacro.twist - this.currentMacro.twist) * macroLerp;
    this.currentMacro.bendX += (this.targetMacro.bendX - this.currentMacro.bendX) * macroLerp;
    this.currentMacro.gravitySag += (this.targetMacro.gravitySag - this.currentMacro.gravitySag) * macroLerp;

    const driftX = Math.sin(this.carvePhase * 0.7 + pitchNorm * 3.0);
    const driftY = Math.cos(this.carvePhase * 0.5 + features.spectralCentroid * 2.5);
    const driftZ = Math.sin(this.carvePhase * 0.9 + features.spectralFlux * 2.0);

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const nx = this.unitNormals[idx];
      const ny = this.unitNormals[idx + 1];
      const nz = this.unitNormals[idx + 2];

      const acousticDot = nx * driftX + ny * driftY + nz * driftZ;

      // Zonal height response in real-time
      const wBase = Math.pow(Math.max(0, -ny), 1.4);
      const wCrown = Math.pow(Math.max(0, ny), 1.4);

      // Low frequencies swell base, high frequencies sharpen crown
      const baseDisplacement = wBase * features.lowEnergy * 0.14;
      const crownDisplacement = wCrown * (features.highEnergy * 0.16 + features.spectralRolloff * 0.10);

      // Tone displacement
      let toneDisplacement = 0;
      if (pitchNorm > 0.55) {
        toneDisplacement = (ny > 0 ? ny * 0.22 * pitchNorm : 0) + Math.sin(acousticDot * 3.5) * 0.08;
      } else {
        const bass = 0.55 - pitchNorm;
        toneDisplacement = (ny < 0.1 ? (0.6 - ny) * bass * 0.45 : 0) + Math.sin(nx * 3.0 + nz * 3.0) * bass * 0.12;
      }

      // Dynamic loudness displacement
      let dynamicDisplacement = 0;
      if (isLoud) {
        const rift = seededMultiOctaveNoise(nx * 2.8 + driftX, ny * 2.8 + driftY, nz * 2.8 + driftZ, 37) * 0.35;
        dynamicDisplacement = rift * shoutIntensity * 0.65;
      } else {
        dynamicDisplacement = shoutIntensity * 0.10;
      }

      // Micro-texture from flatness & zero crossing rate
      const microDetail = features.spectralFlatness > 0.25
        ? Math.sin(nx * 6.0 + ny * 6.0) * (features.spectralFlatness * 0.06 + features.zeroCrossingRate * 0.04)
        : Math.sin(ny * 4.0 + acousticDot * 2.0) * 0.03;

      const totalTargetDelta = baseDisplacement + crownDisplacement + toneDisplacement + dynamicDisplacement + microDetail;

      if (!features.isSilent && features.rms > 0.03) {
        if (isLoud) {
          this.accumulatedCarve[idx] += totalTargetDelta * carveSpeed * 0.45;
        } else if (isQuiet) {
          const softRipples = Math.sin(ny * 8.0 + nx * 4.0) * 0.04;
          this.accumulatedCarve[idx] = this.accumulatedCarve[idx] * (1.0 - carveSpeed * 0.5) + softRipples * (carveSpeed * 0.5);
        } else {
          this.accumulatedCarve[idx] += totalTargetDelta * carveSpeed * 0.35;
        }
        this.accumulatedCarve[idx] = Math.max(-0.14, Math.min(0.22, this.accumulatedCarve[idx]));
      }

      const livePulse = isLoud ? Math.sin(this.breathingPhase + ny * 2) * shoutIntensity * 0.05 : 0;
      const netCarve = this.accumulatedCarve[idx] + livePulse;

      this.computeVertex(i, netCarve, this.currentMacro, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /**
   * Final crystallization of the permanent unique sculpture using
   * the full acoustic feature space, unique seed hash, and morph strategy
   */
  public crystallizeUniqueArtefact(
    voiceDNA: VoiceDNA,
    _finalFeatures: AcousticFeatures,
    macroTypeOverride?: 'spire' | 'disc' | 'monolith' | 'teardrop' | 'crescent' | 'spiral'
  ): void {
    this.isFinalized = true;
    const seed = voiceDNA.uniqueSeed || 42100;
    const mood = voiceDNA.dominantMood?.mood || 'calm';
    const peakRms = voiceDNA.peakRms || 0.45;
    const expression = voiceDNA.expressionScale || 1.0;

    this.activeSeed = seed;
    this.activeExpressionScale = expression;

    // Acoustic azimuth direction for asymmetric thrust derived from signatureHash
    const rng = lcgRandom(voiceDNA.signatureHash || seed);
    this.azimuthAngle = rng() * Math.PI * 2;

    // Resolve morph strategy
    if (macroTypeOverride) {
      if (macroTypeOverride === 'spire') this.activeStrategy = 'spire';
      else if (macroTypeOverride === 'spiral') this.activeStrategy = 'spiral';
      else if (macroTypeOverride === 'disc') this.activeStrategy = 'monolith';

      else if (macroTypeOverride === 'monolith') this.activeStrategy = 'monolith';
      else if (macroTypeOverride === 'teardrop') this.activeStrategy = 'organic';
      else if (macroTypeOverride === 'crescent') this.activeStrategy = 'crest';
    } else {
      this.activeStrategy = voiceDNA.morphStrategy || 'asymmetric';
    }

    // Set mood color
    if (voiceDNA.dominantMood && voiceDNA.dominantMood.colorHex) {
      this.targetColor.set(voiceDNA.dominantMood.colorHex);
      this.currentColor.set(voiceDNA.dominantMood.colorHex);
      const material = this.mesh.material as THREE.MeshStandardMaterial;
      if (material && material.color) {
        material.color.copy(this.currentColor);
      }
    }

    // Construct Macro archetype based on strategy & acoustic dimensions
    const archetype: MacroDeformation = { ...DEFAULT_MACRO, expressionScale: expression };

    if (this.activeStrategy === 'spire') {
      archetype.scaleY = 1.36;
      archetype.scaleX = 0.82;
      archetype.scaleZ = 0.82;
      archetype.taper = 0.42;
      archetype.twist = 0.38;
      archetype.bendX = 0.08;
    } else if (this.activeStrategy === 'monolith') {
      archetype.scaleY = 0.82;
      archetype.scaleX = 1.24;
      archetype.scaleZ = 1.20;
      archetype.taper = -0.14;
      archetype.gravitySag = 0.12;
      archetype.twist = 0.10;
    } else if (this.activeStrategy === 'spiral') {
      archetype.scaleY = 1.24;
      archetype.scaleX = 0.92;
      archetype.scaleZ = 0.92;
      archetype.twist = 0.55;
      archetype.taper = 0.18;
      archetype.bendX = 0.12;
    } else if (this.activeStrategy === 'crest') {
      archetype.scaleY = 1.20;
      archetype.scaleX = 0.94;
      archetype.scaleZ = 0.94;
      archetype.taper = 0.22;
      archetype.bendX = 0.25;
      archetype.bendZ = 0.15;
    } else if (this.activeStrategy === 'organic') {
      archetype.scaleY = 1.15;
      archetype.scaleX = 0.96;
      archetype.scaleZ = 0.96;
      archetype.taper = -0.22;
      archetype.gravitySag = 0.22;
      archetype.twist = 0.08;
    } else {
      // Asymmetric baseline
      archetype.scaleY = 1.12;
      archetype.scaleX = 0.98;
      archetype.scaleZ = 0.98;
      archetype.bendX = Math.cos(this.azimuthAngle) * 0.18;
      archetype.bendZ = Math.sin(this.azimuthAngle) * 0.18;
      archetype.twist = 0.18;
    }

    // Apply mood nuances
    if (mood === 'angry') {
      archetype.scaleY = Math.max(archetype.scaleY, 1.28);
      archetype.twist += 0.18;
      archetype.bendX += 0.10;
    } else if (mood === 'sad') {
      archetype.taper -= 0.18;
      archetype.gravitySag += 0.18;
    } else if (mood === 'joyful') {
      archetype.scaleY += 0.08;
      archetype.taper += 0.12;
    }

    this.finalMacro = { ...archetype };
    this.displayedMacro = { ...this.finalMacro };

    // Procedural multi-zone carving pass using full feature spectrum & seed
    const isQuiet = peakRms < 0.22 || mood === 'sad';

    const spreadFactor = voiceDNA.avgSpread || 0.35;
    const rolloffFactor = voiceDNA.avgRolloff || 0.42;
    const flatnessFactor = voiceDNA.avgFlatness || 0.22;
    const zcrFactor = voiceDNA.avgZcr || 0.16;
    const harmonicFactor = voiceDNA.avgHarmonicRatio || 0.65;
    const lowRatio = voiceDNA.lowBandRatio || 0.45;
    const midRatio = voiceDNA.midBandRatio || 0.40;
    const highRatio = voiceDNA.highBandRatio || 0.30;

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const nx = this.unitNormals[idx];
      const ny = this.unitNormals[idx + 1];
      const nz = this.unitNormals[idx + 2];

      const wBase = Math.pow(Math.max(0, -ny), 1.35);
      const wMid = Math.pow(Math.max(0, 1.0 - ny * ny), 1.2);
      const wCrown = Math.pow(Math.max(0, ny), 1.35);

      // Octave noise 1: broad structural landscape
      const noise1 = seededMultiOctaveNoise(nx * 2.2, ny * 2.2, nz * 2.2, seed, 2, 0.45);
      // Octave noise 2: intermediate mineral ridges
      const noise2 = seededMultiOctaveNoise(nx * 4.4, ny * 4.4, nz * 4.4, seed + 101, 2, 0.55);
      // Octave noise 3: micro-crystalline grain
      const noise3 = seededMultiOctaveNoise(nx * 8.2, ny * 8.2, nz * 8.2, seed + 203, 1, 0.6);

      // Zone 1: Base grounding
      const baseDetail = wBase * (lowRatio * 0.16 + (isQuiet ? 0.02 : 0.08)) * (1.0 + noise1 * 0.4);

      // Zone 2: Mid toroidal sculptural body
      const midDetail = wMid * midRatio * (noise1 * 0.12 + Math.sin(ny * 6.0 + nx * 3.0) * harmonicFactor * 0.05);

      // Zone 3: Crown spires & pinnacles
      const crownDetail = wCrown * (highRatio * 0.18 + rolloffFactor * 0.12) * (1.0 + noise2 * 0.5);

      // Sharp crystalline facets vs smooth laminar waves
      let microFaceting = 0;
      if (flatnessFactor > 0.26 || zcrFactor > 0.22) {
        // Crystalline fracture folds (powered noise)
        const crisp = Math.sign(noise2) * Math.pow(Math.abs(noise2), 0.65);
        microFaceting = crisp * (flatnessFactor * 0.12 + zcrFactor * 0.08) * expression;
      } else {
        // Polished, water-eroded continuous curves
        microFaceting = noise1 * (harmonicFactor * 0.07) * expression;
      }

      // Wide spectral spread adds secondary mineral texture
      const spreadTexture = spreadFactor > 0.35 ? noise3 * (spreadFactor * 0.05) * expression : 0;

      const totalSculpturalDisplacement = (baseDetail + midDetail + crownDetail + microFaceting + spreadTexture) * expression;

      // Integrate with live recording history
      this.accumulatedCarve[idx] = Math.max(-0.16, Math.min(0.24, this.accumulatedCarve[idx] * 0.35 + totalSculpturalDisplacement));
      this.displayedCarve[idx] = this.accumulatedCarve[idx];

      this.computeVertex(i, this.displayedCarve[idx], this.displayedMacro, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public setTimelineProgress(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));

    const defaultColor = new THREE.Color(0x454b56);
    const finalColor = this.currentColor.clone();

    const keyframes: { carve: Float32Array | null; macro: MacroDeformation; color: THREE.Color }[] = [
      { carve: null, macro: DEFAULT_MACRO, color: defaultColor },
      ...this.snapshotHistory,
      { carve: this.accumulatedCarve, macro: this.finalMacro, color: finalColor },
    ];

    let currentInterpMacro: MacroDeformation = { ...DEFAULT_MACRO };
    let interpColor: THREE.Color = finalColor;

    if (keyframes.length <= 2) {
      for (let i = 0; i < this.accumulatedCarve.length; i++) {
        this.displayedCarve[i] = this.accumulatedCarve[i] * p;
      }
      currentInterpMacro = this.lerpMacro(DEFAULT_MACRO, this.finalMacro, p);
      interpColor = defaultColor.clone().lerp(finalColor, p);
    } else {
      const floatIndex = p * (keyframes.length - 1);
      const idx0 = Math.floor(floatIndex);
      const idx1 = Math.min(keyframes.length - 1, idx0 + 1);
      const frac = floatIndex - idx0;

      const f0 = keyframes[idx0];
      const f1 = keyframes[idx1];

      for (let i = 0; i < this.accumulatedCarve.length; i++) {
        const val0 = f0.carve ? f0.carve[i] : 0;
        const val1 = f1.carve ? f1.carve[i] : 0;
        this.displayedCarve[i] = val0 * (1 - frac) + val1 * frac;
      }

      currentInterpMacro = this.lerpMacro(f0.macro, f1.macro, frac);
      interpColor = f0.color.clone().lerp(f1.color, frac);
    }

    this.displayedMacro = currentInterpMacro;

    const material = this.mesh.material as THREE.MeshStandardMaterial;
    if (material && material.color) {
      material.color.copy(interpColor);
    }

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      this.computeVertex(i, this.displayedCarve[idx], this.displayedMacro, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private lerpMacro(a: MacroDeformation, b: MacroDeformation, t: number): MacroDeformation {
    return {
      scaleX: a.scaleX * (1 - t) + b.scaleX * t,
      scaleY: a.scaleY * (1 - t) + b.scaleY * t,
      scaleZ: a.scaleZ * (1 - t) + b.scaleZ * t,
      taper: a.taper * (1 - t) + b.taper * t,
      twist: a.twist * (1 - t) + b.twist * t,
      bendX: a.bendX * (1 - t) + b.bendX * t,
      bendZ: (a.bendZ || 0) * (1 - t) + (b.bendZ || 0) * t,
      facetPower: a.facetPower * (1 - t) + b.facetPower * t,
      gravitySag: a.gravitySag * (1 - t) + b.gravitySag * t,
      expressionScale: a.expressionScale * (1 - t) + b.expressionScale * t,
    };
  }

  public showSnapshotByIndex(index: number): void {
    const historical = this.snapshotHistory[index];
    if (historical) {
      this.displayedCarve.set(historical.carve);
      this.displayedMacro = { ...historical.macro };
    } else {
      const ratio = Math.max(0, Math.min(1, index / Math.max(1, this.snapshotHistory.length)));
      for (let i = 0; i < this.accumulatedCarve.length; i++) {
        this.displayedCarve[i] = this.accumulatedCarve[i] * ratio;
      }
      this.displayedMacro = this.lerpMacro(DEFAULT_MACRO, this.finalMacro, ratio);
    }

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      this.computeVertex(i, this.displayedCarve[idx], this.displayedMacro, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public showFinalArtefact(): void {
    this.displayedCarve.set(this.accumulatedCarve);
    this.displayedMacro = { ...this.finalMacro };

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      this.computeVertex(i, this.displayedCarve[idx], this.displayedMacro, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /**
   * Crystallizes a couples sculpture: either "dyad" (two confluent monoliths)
   * or "helix" (two intertwined helical ribbons wrapping around each other).
   */
  public crystallizeCouplesArtefact(
    voiceDNA1: VoiceDNA,
    features1: AcousticFeatures,
    voiceDNA2: VoiceDNA,
    features2: AcousticFeatures,
    archetype: CouplesArchetype = 'dyad',
    mat1Type: MaterialPresetType = 'basalt',
    mat2Type: MaterialPresetType = 'graphite'
  ): void {
    this.isFinalized = true;
    this.isCouples = true;
    this.couplesArchetype = archetype;

    // Clean up any previous mesh2
    if (this.mesh2) {
      this.rootGroup.remove(this.mesh2);
      this.mesh2.geometry.dispose();
      this.mesh2 = null;
    }

    if (archetype === 'dyad') {
      // 1. CONFLUENT DYAD (ДВА СРАСТАЮЩИХСЯ КАМНЯ)
      const geo1 = this.createDyadHalfGeometry(voiceDNA1, features1, 'left');
      const geo2 = this.createDyadHalfGeometry(voiceDNA2, features2, 'right');

      this.geometry.dispose();
      this.geometry = geo1;
      this.mesh.geometry = geo1;
      this.mesh.material = createSculptureMaterial(mat1Type);
      this.mesh.position.set(-0.46, 0, 0);
      this.mesh.rotation.set(0.12, 0.18, -0.09);
      this.mesh.visible = true;

      const mat2 = createSculptureMaterial(mat2Type);
      this.mesh2 = new THREE.Mesh(geo2, mat2);
      this.mesh2.position.set(0.46, 0, 0);
      this.mesh2.rotation.set(0.12, -0.18, 0.09);
      this.mesh2.castShadow = true;
      this.mesh2.receiveShadow = true;
      this.rootGroup.add(this.mesh2);
    } else {
      // 2. TWIN HELIX ENTANGLEMENT (ДВОЙНАЯ СПИРАЛЬ ОБВИВАНИЯ)
      const { geo1, geo2 } = this.createTwinHelixGeometries(voiceDNA1, features1, voiceDNA2, features2);

      this.geometry.dispose();
      this.geometry = geo1;
      this.mesh.geometry = geo1;
      this.mesh.material = createSculptureMaterial(mat1Type);
      this.mesh.position.set(0, 0, 0);
      this.mesh.rotation.set(0, 0, 0);
      this.mesh.visible = true;

      const mat2 = createSculptureMaterial(mat2Type);
      this.mesh2 = new THREE.Mesh(geo2, mat2);
      this.mesh2.position.set(0, 0, 0);
      this.mesh2.rotation.set(0, 0, 0);
      this.mesh2.castShadow = true;
      this.mesh2.receiveShadow = true;
      this.rootGroup.add(this.mesh2);
    }
  }

  private createDyadHalfGeometry(
    dna: VoiceDNA,
    _features: AcousticFeatures,
    side: 'left' | 'right'
  ): THREE.BufferGeometry {
    const baseGeo = new THREE.IcosahedronGeometry(0.70, 5);
    const pos = baseGeo.attributes.position.array as Float32Array;
    const count = baseGeo.attributes.position.count;
    const seed = dna.uniqueSeed || 42100;
    const pitchVal = dna.avgPitch || 175;
    const pitchNorm = Math.max(0, Math.min(1, (pitchVal - 80) / 360));
    const bassRatio = dna.lowBandRatio || 0.45;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let x = pos[idx];
      let y = pos[idx + 1];
      let z = pos[idx + 2];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      const normY = ny;
      const wBase = Math.pow(Math.max(0, -normY), 1.3);
      const wCrown = Math.pow(Math.max(0, normY), 1.3);

      // Acoustic vertical scaling
      y *= (0.92 + pitchNorm * 0.35 + wCrown * 0.18);
      // Low energy flaring at base
      const flare = 1.0 + wBase * (bassRatio * 0.35);
      x *= flare;
      z *= flare;

      // Seeded procedural noise carving
      const n1 = seededMultiOctaveNoise(nx * 2.2, ny * 2.2, nz * 2.2, seed, 2, 0.45);
      const carve = n1 * 0.14 * (dna.expressionScale || 1.0);
      x += nx * carve;
      y += ny * carve;
      z += nz * carve;

      // Confluence Bridge: bridge where the two stones touch
      // For left stone, inner face is x > 0; for right stone, inner face is x < 0
      const innerFactor = side === 'left' ? nx : -nx;
      if (innerFactor > 0.05) {
        // Pull vertices inward towards the mutual seam plane with organic meniscus
        const bridgeStrength = Math.pow(innerFactor, 1.2) * 0.22 * Math.exp(-normY * normY * 1.5);
        if (side === 'left') {
          x += bridgeStrength;
        } else {
          x -= bridgeStrength;
        }
      }

      pos[idx] = x;
      pos[idx + 1] = y;
      pos[idx + 2] = z;
    }

    baseGeo.attributes.position.needsUpdate = true;
    baseGeo.computeVertexNormals();
    return baseGeo;
  }

  private createTwinHelixGeometries(
    dna1: VoiceDNA,
    features1: AcousticFeatures,
    dna2: VoiceDNA,
    features2: AcousticFeatures
  ): { geo1: THREE.BufferGeometry; geo2: THREE.BufferGeometry } {
    const pitch1 = dna1.avgPitch || 180;
    const pitch2 = dna2.avgPitch || 220;

    // Both partners share mutual turns and cadence
    const sharedTurns = 1.35 + Math.min(0.5, ((pitch1 + pitch2) * 0.5 - 120) / 400);

    class ParametricHelixCurve extends THREE.Curve<THREE.Vector3> {
      phaseOffset: number;
      height: number;
      turns: number;
      waveScale: number;

      constructor(
        phaseOffset: number,
        height: number,
        turns: number,
        waveScale: number
      ) {
        super();
        this.phaseOffset = phaseOffset;
        this.height = height;
        this.turns = turns;
        this.waveScale = waveScale;
      }

      getPoint(t: number, optionalTarget = new THREE.Vector3()) {
        const y = (t - 0.5) * this.height;
        const angle = this.phaseOffset + t * Math.PI * 2 * this.turns;
        // Natural swelling at the center where the lovers embrace
        const swell = Math.sin(t * Math.PI);
        const radius = 0.44 + swell * 0.22;
        const wave = Math.sin(t * 14 + this.phaseOffset) * this.waveScale;

        const x = Math.cos(angle) * (radius + wave);
        const z = Math.sin(angle) * (radius + wave);
        return optionalTarget.set(x, y, z);
      }
    }

    const curve1 = new ParametricHelixCurve(0, 2.7, sharedTurns, (features1.rms || 0.4) * 0.04);
    const curve2 = new ParametricHelixCurve(Math.PI, 2.7, sharedTurns, (features2.rms || 0.4) * 0.04);


    const radius1 = 0.17 + (dna1.lowBandRatio || 0.4) * 0.07;
    const radius2 = 0.17 + (dna2.lowBandRatio || 0.4) * 0.07;

    const geo1 = new THREE.TubeGeometry(curve1, 88, radius1, 20, false);
    const geo2 = new THREE.TubeGeometry(curve2, 88, radius2, 20, false);

    // Apply procedural faceted ripple to each tube geometry
    const sculptTube = (geo: THREE.BufferGeometry, seed: number) => {
      const pos = geo.attributes.position.array as Float32Array;
      const count = geo.attributes.position.count;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const x = pos[idx];
        const y = pos[idx + 1];
        const z = pos[idx + 2];
        const n = seededMultiOctaveNoise(x * 3.0, y * 3.0, z * 3.0, seed, 2, 0.4);
        const disp = n * 0.024;
        pos[idx] += x * disp;
        pos[idx + 2] += z * disp;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
    };

    sculptTube(geo1, dna1.uniqueSeed || 51234);
    sculptTube(geo2, dna2.uniqueSeed || 87654);

    return { geo1, geo2 };
  }

  public computeCompoundBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    if (this.isCouples && this.mesh2) {
      this.mesh.geometry.computeBoundingBox();
      this.mesh2.geometry.computeBoundingBox();
      if (this.mesh.geometry.boundingBox) {
        const b1 = this.mesh.geometry.boundingBox.clone();
        b1.applyMatrix4(this.mesh.matrixWorld);
        box.union(b1);
      }
      if (this.mesh2.geometry.boundingBox) {
        const b2 = this.mesh2.geometry.boundingBox.clone();
        b2.applyMatrix4(this.mesh2.matrixWorld);
        box.union(b2);
      }
    } else {
      this.mesh.geometry.computeBoundingBox();
      if (this.mesh.geometry.boundingBox) {
        box.copy(this.mesh.geometry.boundingBox);
        box.applyMatrix4(this.mesh.matrixWorld);
      }
    }
    return box;
  }

  public resetToDormant(): void {
    if (this.mesh2) {
      this.rootGroup.remove(this.mesh2);
      this.mesh2.geometry.dispose();
      this.mesh2 = null;
    }
    this.isCouples = false;
    this.couplesArchetype = 'dyad';
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);

    // Restore standard icosahedron if previously swapped for couples
    if (this.geometry.type !== 'IcosahedronGeometry') {
      this.geometry.dispose();
      this.geometry = new THREE.IcosahedronGeometry(0.88, 5);
      this.mesh.geometry = this.geometry;
      this.vertexCount = this.geometry.attributes.position.count;
    }

    this.isFinalized = false;
    this.snapshotHistory = [];
    this.currentMacro = { ...DEFAULT_MACRO };
    this.targetMacro = { ...DEFAULT_MACRO };
    this.displayedMacro = { ...DEFAULT_MACRO };
    this.finalMacro = { ...DEFAULT_MACRO };
    this.activeStrategy = 'asymmetric';
    this.activeSeed = 42100;
    this.activeExpressionScale = 1.0;

    this.targetColor.set(0x454b56);
    this.currentColor.set(0x454b56);
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    if (material && material.color) {
      material.color.copy(this.currentColor);
    }

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      this.accumulatedCarve[idx] = 0;
      this.displayedCarve[idx] = 0;
      this.computeVertex(i, 0, DEFAULT_MACRO, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

