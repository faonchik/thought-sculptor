import type { AcousticFeatures, AcousticTraceSnapshot, ArtefactProfile, MaterialPresetType, VoiceDNA } from '../types';

export function generateArtefactProfile(
  duration: number,
  finalFeatures: AcousticFeatures,
  voiceDNA: VoiceDNA,
  snapshots: AcousticTraceSnapshot[],
  audioBlobUrl?: string
): ArtefactProfile {
  const dominantMood = voiceDNA.dominantMood;
  const mood = dominantMood.mood;

  const sampleNum = Math.floor(10 + (voiceDNA.uniqueSeed % 89));
  const hexCode = (voiceDNA.uniqueSeed % 65535).toString(16).toUpperCase().padStart(4, '0');
  const id = `LAB-SPECIMEN // S-${sampleNum}-${hexCode}`;

  let name = `ОБРАЗЕЦ #${sampleNum} / монотонный срез`;
  let property = 'радиальная плотность, центр массы сбалансирован';
  let poeticDescription = 'Заметка лаборанта: Ровный тембр без срывов. Сетка распределена симметрично, деформации в пределах 12–18%. Идеально для прямого слайсинга без поддержек.';
  let dominantMaterial: MaterialPresetType = 'basalt';
  const tactileTags: string[] = [];

  if (mood === 'angry') {
    name = `ОБРАЗЕЦ #${sampleNum} / амплитудный разлом [${Math.round(finalFeatures.pitch)}Гц]`;
    property = 'пиковый разлёт вершин Z > 1.45, тонкие кромки';
    poeticDescription = 'Заметка лаборанта: Взрывной всплеск громкости на записи. Острые гребни на полигонах #840–#1120. Толщина стенки местами <0.8мм — при FDM-печати печатать соплом 0.25–0.4мм на малой скорости.';
    dominantMaterial = 'obsidian';
    tactileTags.push('перегруз', 'острые гребни', 'критичный рельеф');
  } else if (mood === 'sad') {
    name = `ОБРАЗЕЦ #${sampleNum} / низкочастотный завал [<140Гц]`;
    property = 'массивное ядро, центр тяжести смещён к подошве';
    poeticDescription = 'Заметка лаборанта: Низкий регистр дал тяжёлое основание со сглаженными плато. Модель устойчиво стоит на плоскости стола, постобработка шлифовкой не требуется.';
    dominantMaterial = 'basalt';
    tactileTags.push('суббас', 'массивный низ', 'пологий срез');
  } else if (mood === 'joyful') {
    name = `ОБРАЗЕЦ #${sampleNum} / формантный всплеск [${Math.round(finalFeatures.pitch)}Гц]`;
    property = 'вертикальный эксцентриситет, ступенчатые террасы';
    poeticDescription = 'Заметка лаборанта: Звонкий спектр вытянул форму вверх вдоль нормалей. Рельеф напоминает кристаллическую друзу. Заполнение сетки рекомендуется от 20%.';
    dominantMaterial = 'graphite';
    tactileTags.push('высокий F0', 'террасы', 'осевой сдвиг');
  } else if (mood === 'mysterious') {
    name = `ОБРАЗЕЦ #${sampleNum} / шумовой шелест [диффузия]`;
    property = 'кавернозная шероховатость, шумность > 0.28';
    poeticDescription = 'Заметка лаборанта: Большой объём негармонического шума дыхания вызвал мелкую высокочастотную рябь на гранях. Для гладкости можно включить Laplasian smoothing.';
    dominantMaterial = 'ceramic';
    tactileTags.push('шум дыхания', 'пористость', 'микрорябь');
  } else {
    tactileTags.push('стабильный тон', 'квазисфера', 'проверен');
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} // ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const survivalYears = Math.round(320 + ((voiceDNA.uniqueSeed % 380) + (finalFeatures.lowEnergy || 0.4) * 220));

  return {
    id,
    name,
    property,
    poeticDescription,
    createdAt: dateStr,
    duration,
    material: dominantMaterial,
    tactileTags,
    finalFeatures,
    voiceDNA,
    dominantMood,
    snapshots,
    survivalYears,
    audioBlobUrl,
    audioDuration: duration,
  };
}
