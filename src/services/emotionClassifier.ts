import type { MoodProfile, VoiceMood } from '../types';

export const MOOD_PROFILES: Record<VoiceMood, MoodProfile> = {
  angry: {
    mood: 'angry',
    label: 'крик / разлом / перегруз',
    colorHex: '#e11d48',
    description: 'Акустический выброс высокой амплитуды. Резкий скачок энергии и гармонический срыв породы.',
  },
  sad: {
    mood: 'sad',
    label: 'тяжёлый низ / суббас / затухание',
    colorHex: '#38bdf8',
    description: 'Голос с завалом в нижний регистр (<140 Гц). Центр тяжести опущен к основанию, пологие эрозионные линии.',
  },
  mysterious: {
    mood: 'mysterious',
    label: 'шелест / шум / фальцет',
    colorHex: '#c084fc',
    description: 'Негармонический спектр с высокой долей шума дыхания (flatness > 0.25). Зернистая кавернозная текстура.',
  },
  joyful: {
    mood: 'joyful',
    label: 'звонкий верх / всплеск',
    colorHex: '#f59e0b',
    description: 'Острые высокочастотные форманты и повышенный F0 (>200 Гц). Вытянутые ступенчатые гребни.',
  },
  calm: {
    mood: 'calm',
    label: 'ровный гул / монотон',
    colorHex: '#34d399',
    description: 'Стабильный разговорный диапазон без резких градиентов. Равномерное радиальное распределение вершин.',
  },
};

export function getMoodProfile(mood: VoiceMood): MoodProfile {
  return MOOD_PROFILES[mood] || MOOD_PROFILES.calm;
}

export function classifyVoiceEmotion(
  rms: number,
  pitch: number,
  normalizedPitch: number,
  spectralCentroid: number,
  spectralFlatness: number,
  spectralFlux: number
): MoodProfile {
  if (rms < 0.04) {
    return { ...MOOD_PROFILES.calm, label: 'порог тишины / фоновый шум' };
  }

  if (rms > 0.36 || (rms > 0.28 && spectralFlux > 0.12)) {
    return MOOD_PROFILES.angry;
  }

  if (
    (normalizedPitch > 0.34 && rms > 0.14) ||
    (pitch > 195 && rms > 0.12) ||
    (spectralCentroid > 0.36 && rms > 0.16)
  ) {
    return MOOD_PROFILES.joyful;
  }

  if (spectralFlatness > 0.24 && rms < 0.30) {
    return MOOD_PROFILES.mysterious;
  }

  if (rms < 0.22 && (normalizedPitch < 0.28 || pitch < 160)) {
    return MOOD_PROFILES.sad;
  }

  return MOOD_PROFILES.calm;
}
