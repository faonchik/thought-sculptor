export type VoiceMood = 'angry' | 'sad' | 'calm' | 'joyful' | 'mysterious';

export interface MoodProfile {
  mood: VoiceMood;
  label: string;
  colorHex: string;
  description: string;
}

export type MorphStrategy = 'spire' | 'monolith' | 'spiral' | 'crest' | 'organic' | 'asymmetric';

export interface AcousticFeatures {
  rms: number;                   // 0..1 — громкость / динамика
  pitch: number;                 // Hz — высота основного тона
  normalizedPitch: number;       // 0..1 — нормализованная высота
  spectralCentroid: number;      // 0..1 — спектральная яркость / центр тяжести частот
  spectralSpread: number;        // 0..1 — спектральный разброс (гладкость vs рваность спектра)
  spectralFlatness: number;      // 0..1 — воздушность / шумность / дыхание
  spectralRolloff: number;       // 0..1 — частотный порог 85% энергии (высота кроны)
  spectralFlux: number;          // 0..1 — скорость изменения спектра / динамика
  zeroCrossingRate: number;      // 0..1 — частота пересечения нуля (острота граней / атака)
  harmonicRatio: number;         // 0..1 — гармоничность vs шумовая составляющая
  temporalVariability: number;   // 0..1 — динамическая изменчивость во времени
  lowEnergy: number;             // 0..1 — низкие частоты (база / основание)
  midEnergy: number;             // 0..1 — средние частоты (тело формы)
  highEnergy: number;            // 0..1 — высокие частоты (шпили и микро-гребни)
  isSilent: boolean;             // пауза в речи
  speechRate: number;            // 0..1 — темп речи
  mood: MoodProfile;             // распознанный эмоциональный характер
}

export interface VoiceDNA {
  avgPitch: number;
  avgCentroid: number;
  avgSpread: number;
  avgFlatness: number;
  avgRolloff: number;
  avgZcr: number;
  avgHarmonicRatio: number;
  temporalVariability: number;
  lowBandRatio: number;
  midBandRatio: number;
  highBandRatio: number;
  peakRms: number;
  avgFlux: number;
  uniqueSeed: number;
  signatureHash: number;
  dominantMood: MoodProfile;
  morphStrategy: MorphStrategy;
  expressionScale: number;       // 0.8 (мягкая) | 1.0 (средняя) | 1.4 (выраженная)
}

export interface AcousticTraceSnapshot {
  index: number;
  timeOffset: number;
  features: AcousticFeatures;
  deformationSeed: number;
  annotation: string;
}

export type MaterialPresetType = 'basalt' | 'graphite' | 'obsidian' | 'ceramic';

export type AppMode = 'solo' | 'couples';
export type CouplesArchetype = 'dyad' | 'helix';

export interface PartnerVoiceProfile {
  name: string;
  material: MaterialPresetType;
  voiceDNA: VoiceDNA;
  features: AcousticFeatures;
  duration: number;
  audioBlobUrl?: string;
}

export interface ArtefactProfile {
  id: string;
  name: string;
  property: string;
  poeticDescription: string;
  createdAt: string;
  duration: number;
  material: MaterialPresetType;
  material2?: MaterialPresetType;
  tactileTags: string[];
  finalFeatures: AcousticFeatures;
  voiceDNA: VoiceDNA;
  dominantMood: MoodProfile;
  snapshots: AcousticTraceSnapshot[];
  survivalYears: number;
  customSignature?: string;
  audioBlobUrl?: string;
  audioDuration: number;
  isCouples?: boolean;
  couplesArchetype?: CouplesArchetype;
  partner1?: PartnerVoiceProfile;
  partner2?: PartnerVoiceProfile;
}

export type AppWorkflowState = 'dormant' | 'observing' | 'solidifying' | 'artefact';

