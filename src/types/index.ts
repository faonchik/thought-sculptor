export type VoiceMood = 'angry' | 'sad' | 'calm' | 'joyful' | 'mysterious';

export interface MoodProfile {
  mood: VoiceMood;
  label: string;
  colorHex: string;
  description: string;
}

export interface AcousticFeatures {
  rms: number;               // 0..1 — громкость / динамика
  pitch: number;             // Hz — высота основного тона
  normalizedPitch: number;   // 0..1 — нормализованная высота
  spectralCentroid: number;  // 0..1 — спектральная яркость
  spectralFlatness: number;  // 0..1 — воздушность / шумность / дыхание
  spectralFlux: number;      // 0..1 — скорость изменения спектра / шероховатость
  lowEnergy: number;         // 0..1 — низкие частоты (массивность основания)
  midEnergy: number;         // 0..1 — средние частоты (тело формы)
  highEnergy: number;        // 0..1 — высокие частоты (микро-гребни)
  isSilent: boolean;         // пауза в речи (замирание формы)
  speechRate: number;        // 0..1 — темп речи
  mood: MoodProfile;         // текущее распознанное настроение по голосу
}

export interface VoiceDNA {
  avgPitch: number;
  avgCentroid: number;
  peakRms: number;
  avgFlux: number;
  uniqueSeed: number;
  dominantMood: MoodProfile;
}

export interface AcousticTraceSnapshot {
  index: number;
  timeOffset: number;
  features: AcousticFeatures;
  deformationSeed: number;
  annotation: string;
}

export type MaterialPresetType = 'basalt' | 'graphite' | 'obsidian' | 'ceramic';

export interface ArtefactProfile {
  id: string;
  name: string;
  property: string;
  poeticDescription: string;
  createdAt: string;
  duration: number;
  material: MaterialPresetType;
  tactileTags: string[];
  finalFeatures: AcousticFeatures;
  voiceDNA: VoiceDNA;
  dominantMood: MoodProfile;
  snapshots: AcousticTraceSnapshot[];
  survivalYears: number;
  customSignature?: string;
  audioBlobUrl?: string;
  audioDuration: number;
}

export type AppWorkflowState = 'dormant' | 'observing' | 'solidifying' | 'artefact';
