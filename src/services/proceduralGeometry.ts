import * as THREE from 'three';
import type { AcousticFeatures, VoiceDNA } from '../types';

export interface MacroDeformation {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  taper: number;
  twist: number;
  bendX: number;
  facetPower: number;
  gravitySag: number;
}

export const DEFAULT_MACRO: MacroDeformation = {
  scaleX: 1.0,
  scaleY: 1.04,
  scaleZ: 0.96,
  taper: 0.0,
  twist: 0.0,
  bendX: 0.0,
  facetPower: 1.0,
  gravitySag: 0.0,
};

function pseudoNoise3D(x: number, y: number, z: number, seed: number = 42): number {
  const s = Math.sin(x * 1.8 + seed) * Math.cos(y * 2.4 + seed * 0.5) * Math.sin(z * 1.9 + seed * 1.3);
  const s2 = Math.sin(x * 3.6 - y * 3.2 + seed * 0.7) * 0.5;
  const s3 = Math.cos(y * 6.0 + z * 5.4) * 0.25;
  return s + s2 + s3;
}

interface SculptureSnapshot {
  carve: Float32Array;
  macro: MacroDeformation;
  color: THREE.Color;
}

export class ProceduralSculpture {
  public mesh: THREE.Mesh;
  public geometry: THREE.IcosahedronGeometry;
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

  constructor() {
    this.geometry = new THREE.IcosahedronGeometry(0.88, 5);
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
  }

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
    const taperFactor = Math.max(0.25, 1.0 + normY * macro.taper);
    x *= taperFactor;
    z *= taperFactor;

    x *= macro.scaleX;
    y *= macro.scaleY;
    z *= macro.scaleZ;

    if (Math.abs(macro.twist) > 0.01) {
      const angle = (y / Math.max(0.2, r * macro.scaleY)) * macro.twist;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;
      x = rx;
      z = rz;
    }

    if (Math.abs(macro.bendX) > 0.01) {
      const archFactor = 1.0 - Math.min(1.0, (y * y) / Math.max(0.1, macro.scaleY * macro.scaleY * r * r));
      x += macro.bendX * archFactor;
    }

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

  public update(delta: number, features: AcousticFeatures | null, isObserving: boolean): void {
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    if (material && material.color) {
      this.currentColor.lerp(this.targetColor, delta * 4.0);
      material.color.copy(this.currentColor);
    }

    if (this.isFinalized) {
      this.breathingPhase += delta * 0.5;
      const micro = 1.0 + Math.sin(this.breathingPhase) * 0.005;

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

    const carveSpeed = delta * (features.rms * 2.2 + 0.06);
    const pitchNorm = features.normalizedPitch;
    const isLoud = features.rms > 0.44;
    const isQuiet = features.rms < 0.20 && !features.isSilent;
    const shoutIntensity = Math.pow(features.rms, 1.3);
    const fluxRate = features.spectralFlux;
    const moodType = features.mood?.mood || 'calm';

    if (moodType === 'angry' || isLoud) {
      this.targetMacro.scaleY = 1.32;
      this.targetMacro.scaleX = 0.90;
      this.targetMacro.scaleZ = 0.90;
      this.targetMacro.taper = 0.28;
      this.targetMacro.facetPower = 1.0;
      this.targetMacro.twist = 0.35 * Math.sin(this.carvePhase * 0.9);
      this.targetMacro.bendX = 0.20;
      this.targetMacro.gravitySag = 0.02;
    } else if (moodType === 'joyful') {
      this.targetMacro.scaleY = 1.34;
      this.targetMacro.scaleX = 0.84;
      this.targetMacro.scaleZ = 0.84;
      this.targetMacro.taper = 0.35;
      this.targetMacro.facetPower = 1.0;
      this.targetMacro.twist = 0.28;
      this.targetMacro.bendX = 0.08;
      this.targetMacro.gravitySag = 0.04;
    } else if (moodType === 'sad') {
      this.targetMacro.scaleY = 1.24;
      this.targetMacro.scaleX = 0.86;
      this.targetMacro.scaleZ = 0.86;
      this.targetMacro.taper = -0.36;
      this.targetMacro.facetPower = 1.0;
      this.targetMacro.twist = 0.06;
      this.targetMacro.bendX = 0.06;
      this.targetMacro.gravitySag = 0.35;
    } else if (moodType === 'mysterious') {
      this.targetMacro.scaleY = 1.18;
      this.targetMacro.scaleX = 0.88;
      this.targetMacro.scaleZ = 0.90;
      this.targetMacro.bendX = 0.36;
      this.targetMacro.taper = 0.16;
      this.targetMacro.facetPower = 1.0;
      this.targetMacro.twist = 0.22;
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
      this.targetMacro.facetPower = 1.0;
      this.targetMacro.twist = 0.05;
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
    this.currentMacro.facetPower += (this.targetMacro.facetPower - this.currentMacro.facetPower) * macroLerp;
    this.currentMacro.gravitySag += (this.targetMacro.gravitySag - this.currentMacro.gravitySag) * macroLerp;

    const driftX = Math.sin(this.carvePhase * 0.7 + pitchNorm * 3.0);
    const driftY = Math.cos(this.carvePhase * 0.5 + features.spectralCentroid * 2.5);
    const driftZ = Math.sin(this.carvePhase * 0.9 + fluxRate * 2.0);

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const nx = this.unitNormals[idx];
      const ny = this.unitNormals[idx + 1];
      const nz = this.unitNormals[idx + 2];

      const acousticDot = nx * driftX + ny * driftY + nz * driftZ;

      let toneDisplacement = 0;
      if (pitchNorm > 0.55) {
        const twist = Math.sin(acousticDot * 3.2 + ny * 3.5) * (pitchNorm - 0.5) * 0.45;
        toneDisplacement = twist + (ny > 0 ? ny * 0.25 * pitchNorm : 0);
      } else {
        const bass = 0.55 - pitchNorm;
        toneDisplacement = (ny < 0.1 ? (0.6 - ny) * bass * 0.5 : 0) + Math.sin(nx * 3.0 + nz * 3.0) * bass * 0.15;
      }

      let dynamicDisplacement = 0;
      if (isLoud) {
        const rift = pseudoNoise3D(nx * 3.2 + driftX, ny * 3.2 + driftY, nz * 3.2 + driftZ, 37.8) * 0.38;
        const crest = Math.sin(acousticDot * 4.0 + pseudoNoise3D(nx * 2.0, ny * 2.0, nz * 2.0, 19.4) * 2.0) * 0.28;
        dynamicDisplacement = (rift + crest) * shoutIntensity * 0.75;
      } else {
        dynamicDisplacement = shoutIntensity * 0.12;
      }

      let moodDisplacement = 0;
      if (moodType === 'angry') {
        const wave = pseudoNoise3D(nx * 3.5, ny * 3.5, nz * 3.5, 91.2) * 0.15;
        moodDisplacement = wave * shoutIntensity * 0.25;
      } else if (moodType === 'sad') {
        moodDisplacement = ny < 0 ? -ny * 0.18 : -ny * 0.08;
      } else if (moodType === 'joyful') {
        moodDisplacement = Math.sin(ny * 4.0 + acousticDot * 2.0) * 0.12;
      } else if (moodType === 'mysterious') {
        moodDisplacement = pseudoNoise3D(nx * 3.0, ny * 3.0, nz * 3.0, 55.5) * 0.10;
      }

      const strata = Math.sin(ny * 8.0 + acousticDot * 1.5) * features.spectralCentroid * 0.06;
      const microCleft = features.spectralFlux * pseudoNoise3D(nx * 4.0, ny * 4.0, nz * 4.0, 102.1) * 0.08;

      const totalTargetDelta = toneDisplacement + dynamicDisplacement + moodDisplacement + strata + microCleft;

      if (!features.isSilent && features.rms > 0.03) {
        if (isLoud) {
          this.accumulatedCarve[idx] += totalTargetDelta * carveSpeed * 0.45;
        } else if (isQuiet) {
          const softRipples = Math.sin(ny * 8.0 + nx * 4.0) * 0.04;
          this.accumulatedCarve[idx] = this.accumulatedCarve[idx] * (1.0 - carveSpeed * 0.5) + softRipples * (carveSpeed * 0.5);
        } else {
          this.accumulatedCarve[idx] += totalTargetDelta * carveSpeed * 0.35;
        }
        this.accumulatedCarve[idx] = Math.max(-0.12, Math.min(0.18, this.accumulatedCarve[idx]));
      }

      const livePulse = isLoud ? Math.sin(this.breathingPhase + ny * 2) * shoutIntensity * 0.05 : 0;
      const netCarve = this.accumulatedCarve[idx] + livePulse;

      this.computeVertex(i, netCarve, this.currentMacro, 1.0);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).copyArray(this.currentPositions);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public crystallizeUniqueArtefact(
    voiceDNA: VoiceDNA,
    _finalFeatures: AcousticFeatures,
    macroTypeOverride?: 'spire' | 'disc' | 'monolith' | 'teardrop' | 'crescent'
  ): void {
    this.isFinalized = true;
    const seed = voiceDNA.uniqueSeed;
    const pitch = voiceDNA.avgPitch;
    const mood = voiceDNA.dominantMood?.mood || 'calm';
    const peakRms = voiceDNA.peakRms;

    if (voiceDNA.dominantMood && voiceDNA.dominantMood.colorHex) {
      this.targetColor.set(voiceDNA.dominantMood.colorHex);
      this.currentColor.set(voiceDNA.dominantMood.colorHex);
      const material = this.mesh.material as THREE.MeshStandardMaterial;
      if (material && material.color) {
        material.color.copy(this.currentColor);
      }
    }

    const archetype: MacroDeformation = { ...DEFAULT_MACRO };

    if (macroTypeOverride === 'spire') {
      archetype.scaleY = 1.35;
      archetype.scaleX = 0.82;
      archetype.scaleZ = 0.82;
      archetype.taper = 0.40;
      archetype.facetPower = 1.0;
      archetype.twist = 0.40;
      archetype.bendX = 0.10;
    } else if (macroTypeOverride === 'disc') {
      archetype.scaleY = 0.65;
      archetype.scaleX = 1.28;
      archetype.scaleZ = 1.22;
      archetype.taper = -0.10;
      archetype.facetPower = 1.0;
      archetype.gravitySag = 0.06;
    } else if (macroTypeOverride === 'monolith') {
      archetype.scaleY = 1.18;
      archetype.scaleX = 1.02;
      archetype.scaleZ = 1.00;
      archetype.facetPower = 1.0;
      archetype.twist = 0.35;
      archetype.bendX = 0.15;
    } else if (macroTypeOverride === 'teardrop') {
      archetype.scaleY = 1.25;
      archetype.scaleX = 0.85;
      archetype.scaleZ = 0.85;
      archetype.taper = -0.40;
      archetype.gravitySag = 0.35;
      archetype.facetPower = 1.0;
    } else if (macroTypeOverride === 'crescent') {
      archetype.scaleY = 1.18;
      archetype.scaleX = 0.88;
      archetype.scaleZ = 0.90;
      archetype.bendX = 0.42;
      archetype.taper = 0.20;
      archetype.twist = 0.25;
      archetype.facetPower = 1.0;
    } else {
      if (pitch > 195) {
        const factor = Math.min(1.0, (pitch - 195) / 160);
        archetype.scaleY = 1.15 + factor * 0.20;
        archetype.scaleX = 0.86 - factor * 0.04;
        archetype.scaleZ = 0.86 - factor * 0.04;
        archetype.taper = 0.32 + factor * 0.10;
      } else if (pitch < 145) {
        const factor = Math.min(1.0, (145 - pitch) / 75);
        archetype.scaleY = 0.85 - factor * 0.15;
        archetype.scaleX = 1.18 + factor * 0.12;
        archetype.scaleZ = 1.14 + factor * 0.10;
        archetype.taper = -0.12;
      } else {
        archetype.scaleY = 1.06;
        archetype.scaleX = 1.0;
        archetype.scaleZ = 1.0;
      }

      archetype.facetPower = 1.0;

      if (mood === 'angry') {
        archetype.scaleY = 1.34;
        archetype.scaleX = 0.90;
        archetype.scaleZ = 0.90;
        archetype.taper = 0.32;
        archetype.twist = 0.45;
        archetype.bendX = 0.20;
        archetype.facetPower = 1.0;
      } else if (mood === 'joyful') {
        archetype.scaleY = 1.35;
        archetype.scaleX = 0.82;
        archetype.scaleZ = 0.82;
        archetype.taper = 0.38;
        archetype.twist = 0.35;
        archetype.bendX = 0.10;
        archetype.facetPower = 1.0;
      } else if (mood === 'sad') {
        archetype.scaleY = 1.25;
        archetype.scaleX = 0.86;
        archetype.scaleZ = 0.86;
        archetype.taper = -0.38;
        archetype.gravitySag = 0.35;
        archetype.twist = 0.08;
        archetype.facetPower = 1.0;
      } else if (mood === 'mysterious') {
        archetype.scaleY = 1.18;
        archetype.scaleX = 0.88;
        archetype.scaleZ = 0.90;
        archetype.bendX = 0.40;
        archetype.taper = 0.18;
        archetype.twist = 0.25;
        archetype.facetPower = 1.0;
      } else {
        archetype.scaleY = 1.06;
        archetype.scaleX = 1.02;
        archetype.scaleZ = 1.02;
        archetype.facetPower = 1.0;
      }
    }

    this.finalMacro = { ...archetype };
    this.displayedMacro = { ...this.finalMacro };

    const isLoud = peakRms > 0.38 || mood === 'angry';
    const isQuiet = peakRms < 0.22 || mood === 'sad';

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const nx = this.unitNormals[idx];
      const ny = this.unitNormals[idx + 1];
      const nz = this.unitNormals[idx + 2];

      let voiceDetail = 0;
      if (isLoud) {
        voiceDetail = pseudoNoise3D(nx * 3.0, ny * 3.0, nz * 3.0, seed) * 0.12;
      } else if (isQuiet) {
        voiceDetail = Math.sin(ny * 6.0 + nx * 3.0 + (seed % 10)) * 0.04;
      } else {
        voiceDetail = pseudoNoise3D(nx * 2.5, ny * 2.5, nz * 2.5, seed) * 0.06;
      }

      this.accumulatedCarve[idx] = Math.max(-0.12, Math.min(0.20, this.accumulatedCarve[idx] * 0.40 + voiceDetail));
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
      facetPower: a.facetPower * (1 - t) + b.facetPower * t,
      gravitySag: a.gravitySag * (1 - t) + b.gravitySag * t,
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

  public resetToDormant(): void {
    this.isFinalized = false;
    this.snapshotHistory = [];
    this.currentMacro = { ...DEFAULT_MACRO };
    this.targetMacro = { ...DEFAULT_MACRO };
    this.displayedMacro = { ...DEFAULT_MACRO };
    this.finalMacro = { ...DEFAULT_MACRO };

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
