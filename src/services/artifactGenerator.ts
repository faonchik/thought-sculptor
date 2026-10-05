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
  const strategy = voiceDNA.morphStrategy || 'asymmetric';

  const sampleNum = Math.floor(10 + ((voiceDNA.signatureHash || voiceDNA.uniqueSeed) % 89));
  const hexCode = ((voiceDNA.signatureHash || voiceDNA.uniqueSeed) % 65535).toString(16).toUpperCase().padStart(4, '0');
  const id = `EXP-${sampleNum}-${hexCode}`;

  let name = `Монолит «Сбалансированная гармония»`;
  let property = `Акустический слепок речи • Равномерная полигональная плотность`;
  let poeticDescription = 'Кураторская заметка: Гармоничный голосовой спектр без резких скачков. Вершины монолита распределены симметрично, создавая сбалансированную непрерывную поверхность.';
  let dominantMaterial: MaterialPresetType = 'basalt';
  const tactileTags: string[] = [];

  const pitchInt = Math.round(finalFeatures.pitch);

  if (strategy === 'spire') {
    name = `Монолит «Кристаллический шпиль»`;
    property = `Вертикальный рост • Частотный срез Rolloff ${(finalFeatures.spectralRolloff * 5500).toFixed(0)} Гц [${pitchInt} Гц]`;
    poeticDescription = 'Кураторская заметка: Доминирование высоких обертонов и вытянутый спектральный срез сформировали вертикальные восходящие пики и шпили в кроне формы.';
    dominantMaterial = 'graphite';
    tactileTags.push('вертикальный рост', 'шпили', 'высокий регистр', 'бронза');
  } else if (strategy === 'monolith') {
    name = `Монолит «Тектоническое основание»`;
    property = `Низкочастотная опора • Плотность баса ${(finalFeatures.lowEnergy * 100).toFixed(0)}% [${pitchInt > 30 ? `${pitchInt} Гц` : 'бас'}]`;
    poeticDescription = 'Кураторская заметка: Мощное низкочастотное основание вызвало радиальное расширение подошвы монолита. Центр тяжести смещен вниз с глубокой устойчивостью.';
    dominantMaterial = 'basalt';
    tactileTags.push('массивное основание', 'бас', 'тектоника', 'мрамор');
  } else if (strategy === 'spiral') {
    name = `Монолит «Вихревой срез»`;
    property = `Динамическая спираль • Временная вариативность ${(voiceDNA.temporalVariability * 100).toFixed(0)}%`;
    poeticDescription = 'Кураторская заметка: Нестационарная динамика речи и перепады звукового напора скрутили ось монолита в восходящую геликоидную спираль.';
    dominantMaterial = 'obsidian';
    tactileTags.push('спираль', 'динамический вихрь', 'оникс');
  } else if (strategy === 'crest') {
    name = `Монолит «Граненый излом»`;
    property = `Кристаллические гребни • Острота атаки ZCR ${(finalFeatures.zeroCrossingRate * 100).toFixed(0)}%`;
    poeticDescription = 'Кураторская заметка: Резкие транзиенты и высокая диффузность звука вызвали кристаллическую фрагментацию с выраженными рельефными гранями.';
    dominantMaterial = 'obsidian';
    tactileTags.push('острые грани', 'кристаллизация', 'транзиенты');
  } else if (strategy === 'organic') {
    name = `Монолит «Пластическая капля»`;
    property = `Плавная биоморфика • Гармоничность ${(voiceDNA.avgHarmonicRatio * 100).toFixed(0)}%`;
    poeticDescription = 'Кураторская заметка: Чистый тональный резонанс и минимальный шумовой фон сформировали шелковистую обтекаемую форму без изломов.';
    dominantMaterial = 'ceramic';
    tactileTags.push('обтекаемость', 'органика', 'чистый тон', 'терракота');
  } else {
    name = `Монолит «Асимметричный вектор»`;
    property = `Направленный импульс • Спектральный разброс ${(finalFeatures.spectralSpread * 100).toFixed(0)}%`;
    poeticDescription = 'Кураторская заметка: Однонаправленный вектор речевой атаки придал скульптуре выраженную динамическую асимметрию и живой кинетический наклон.';
    dominantMaterial = mood === 'angry' ? 'obsidian' : mood === 'sad' ? 'basalt' : 'ceramic';
    tactileTags.push('асимметрия', 'живой наклон', 'спектральный разброс');
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  const survivalYears = Math.round(340 + (((voiceDNA.signatureHash || voiceDNA.uniqueSeed) % 380) + (finalFeatures.lowEnergy || 0.4) * 220));

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

export function generateCouplesArtefactProfile(
  dur1: number,
  feat1: AcousticFeatures,
  dna1: VoiceDNA,
  mat1: MaterialPresetType,
  name1: string,
  blob1: string | undefined,
  dur2: number,
  feat2: AcousticFeatures,
  dna2: VoiceDNA,
  mat2: MaterialPresetType,
  name2: string,
  blob2: string | undefined,
  archetype: 'dyad' | 'helix' = 'dyad'
): ArtefactProfile {
  const seedCombined = ((dna1.uniqueSeed || 11111) ^ (dna2.uniqueSeed || 22222)) >>> 0;
  const sampleNum = Math.floor(10 + (seedCombined % 89));
  const hexCode = (seedCombined % 65535).toString(16).toUpperCase().padStart(4, '0');
  const id = `EXP-DUET-${sampleNum}-${hexCode}`;

  const p1 = Math.round(feat1.pitch || 180);
  const p2 = Math.round(feat2.pitch || 220);

  const matNames: Record<MaterialPresetType, string> = {
    basalt: 'Каррарский мрамор',
    ceramic: 'Обожженная терракота',
    graphite: 'Литейная бронза',
    obsidian: 'Полированный оникс',
  };

  const mat1Label = matNames[mat1] || mat1;
  const mat2Label = matNames[mat2] || mat2;

  const isDyad = archetype === 'dyad';
  const name = isDyad
    ? `«Слияние двух начал: ${name1} & ${name2}»`
    : `«Голосовое сплетение: ${name1} & ${name2}»`;

  const property = isDyad
    ? `Бинарный акустический монолит • Сопряжение тембров [${p1} Гц & ${p2} Гц]`
    : `Двойная гармоническая спираль • Обвивание частот [${p1} Гц & ${p2} Гц]`;

  const poeticDescription = isDyad
    ? `Кураторская заметка: Парный монолит двух голосов. Тембр первого голоса (${name1}, ${p1} Гц, ${mat1Label}) и отклик второго (${name2}, ${p2} Гц, ${mat2Label}) встретились в точке соприкосновения, образовав цельную пространственную связку. Основание хранит устойчивость взаимного доверия.`
    : `Кураторская заметка: Пластическое сплетение двух голосов в форме двойной спирали. Волна интонации (${name1}, ${p1} Гц, ${mat1Label}) грациозно обвивает восходящую ветвь партнера (${name2}, ${p2} Гц, ${mat2Label}), рождая кинетическую гармонию союза.`;

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  const dominantMood = dna1.dominantMood || {
    mood: 'joyful',
    label: 'Любовь / Союз',
    colorHex: '#e11d48',
    description: 'Гармоничный союз двух любящих голосов',
  };

  const tactileTags = [
    'парная скульптура',
    isDyad ? 'слияние монолитов' : 'спиральное обвивание',
    'союз двух душ',
    mat1Label,
    mat2Label,
  ];

  return {
    id,
    name,
    property,
    poeticDescription,
    createdAt: dateStr,
    duration: dur1 + dur2,
    material: mat1,
    material2: mat2,
    tactileTags,
    finalFeatures: feat1,
    voiceDNA: dna1,
    dominantMood,
    snapshots: [],
    survivalYears: 1200,
    audioBlobUrl: blob1,
    audioDuration: dur1 + dur2,
    isCouples: true,
    couplesArchetype: archetype,
    partner1: {
      name: name1,
      material: mat1,
      voiceDNA: dna1,
      features: feat1,
      duration: dur1,
      audioBlobUrl: blob1,
    },
    partner2: {
      name: name2,
      material: mat2,
      voiceDNA: dna2,
      features: feat2,
      duration: dur2,
      audioBlobUrl: blob2,
    },
  };
}


