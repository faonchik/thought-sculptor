import * as THREE from 'three';
import type { MaterialPresetType } from '../types';

function createProceduralPBRTextures(type: MaterialPresetType): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const canvasBump = document.createElement('canvas');
  canvasBump.width = size;
  canvasBump.height = size;
  const ctxBump = canvasBump.getContext('2d')!;

  const canvasRough = document.createElement('canvas');
  canvasRough.width = size;
  canvasRough.height = size;
  const ctxRough = canvasRough.getContext('2d')!;

  const bumpData = ctxBump.createImageData(size, size);
  const roughData = ctxRough.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const n1 = Math.sin(x * 0.04) * Math.cos(y * 0.04);
      const n2 = Math.sin(x * 0.12 + y * 0.09) * 0.5;
      const n3 = (Math.random() - 0.5) * 0.35;
      const combined = (n1 + n2 + n3 + 1.5) / 3;

      let bumpVal = 128;
      let roughVal = 180;

      if (type === 'basalt') {
        bumpVal = Math.floor(combined * 120 + 60);
        roughVal = Math.floor(180 + Math.random() * 20);
      } else if (type === 'obsidian') {
        bumpVal = 128;
        roughVal = 18;
      } else if (type === 'ceramic') {
        bumpVal = Math.floor(combined * 110 + 70);
        roughVal = Math.floor(210 + (Math.random() - 0.5) * 10);
      } else {
        const strata = Math.sin(y * 0.15) * 0.15;
        bumpVal = Math.floor((combined * 0.5 + strata + 0.5) * 140);
        roughVal = Math.floor(90 + combined * 40);
      }

      bumpVal = Math.max(0, Math.min(255, bumpVal));
      roughVal = Math.max(0, Math.min(255, roughVal));

      bumpData.data[idx] = bumpVal;
      bumpData.data[idx + 1] = bumpVal;
      bumpData.data[idx + 2] = bumpVal;
      bumpData.data[idx + 3] = 255;

      roughData.data[idx] = roughVal;
      roughData.data[idx + 1] = roughVal;
      roughData.data[idx + 2] = roughVal;
      roughData.data[idx + 3] = 255;
    }
  }

  ctxBump.putImageData(bumpData, 0, 0);
  ctxRough.putImageData(roughData, 0, 0);

  const bumpTex = new THREE.CanvasTexture(canvasBump);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(3, 3);

  const roughTex = new THREE.CanvasTexture(canvasRough);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(3, 3);

  return { bumpMap: bumpTex, roughnessMap: roughTex };
}

export function createSculptureMaterial(type: MaterialPresetType): THREE.MeshStandardMaterial {
  const textures = createProceduralPBRTextures(type);

  switch (type) {
    case 'obsidian':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x181f2b),
        roughness: 0.08,
        metalness: 0.15,
        bumpMap: textures.bumpMap,
        bumpScale: 0.015,
        roughnessMap: textures.roughnessMap,
        flatShading: false,
      });

    case 'graphite':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x4f5869),
        roughness: 0.28,
        metalness: 0.85,
        bumpMap: textures.bumpMap,
        bumpScale: 0.03,
        roughnessMap: textures.roughnessMap,
        flatShading: false,
      });

    case 'ceramic':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x8c634f),
        roughness: 0.92,
        metalness: 0.0,
        bumpMap: textures.bumpMap,
        bumpScale: 0.03,
        roughnessMap: textures.roughnessMap,
        flatShading: false,
      });

    case 'basalt':
    default:
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x4b525f),
        roughness: 0.80,
        metalness: 0.06,
        bumpMap: textures.bumpMap,
        bumpScale: 0.03,
        roughnessMap: textures.roughnessMap,
        flatShading: false,
      });
  }
}
