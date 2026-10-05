import type { ArtefactProfile, MaterialPresetType, MoodProfile } from '../types';

export interface HallSpecimen {
  id: string;
  name: string;
  property: string;
  poeticDescription: string;
  createdAt: string;
  material: MaterialPresetType;
  material2?: MaterialPresetType;
  tactileTags: string[];
  dominantMood: MoodProfile;
  audioBlobUrl?: string;
  authorName: string;
  exhibitedAt: string;
  avgPitch: number;
  macroType: 'spire' | 'disc' | 'monolith' | 'teardrop' | 'crescent' | 'spiral';

  uniqueSeed: number;
  survivalYears: number;
  thumbnailUrl?: string;
  isCouples?: boolean;
  couplesArchetype?: 'dyad' | 'helix';
  partner1Name?: string;
  partner2Name?: string;
  partner1Pitch?: number;
  partner2Pitch?: number;
}


const STORAGE_KEY = 'thought_sculptor_hall_v3';

const INITIAL_EXHIBITS: HallSpecimen[] = [
  {
    id: 'SPECIMEN #DUET-01',
    name: '«Сопряжение двух начал: Роман & София»',
    property: 'Бинарный монолит • Слияние тембров [125 Гц & 245 Гц]',
    poeticDescription: 'Диалог двух голосов: бархатный мужской баритон (125 Гц, Мрамор) и теплое женское сопрано (245 Гц, Бронза) встретились в неразрывном слиянии монолитов.',
    createdAt: '08 сентября 2026 г.',
    material: 'basalt',
    material2: 'graphite',
    tactileTags: ['диптих', 'пара', 'слияние монолитов', 'мрамор', 'бронза'],
    dominantMood: {
      mood: 'joyful',
      label: 'Союз / Любовь',
      description: 'Союз двух любящих голосов',
      colorHex: '#e11d48',
    },
    authorName: 'Роман & София',
    exhibitedAt: '08.09.2026',
    avgPitch: 185,
    macroType: 'monolith',
    uniqueSeed: 99401,
    survivalYears: 1200,
    isCouples: true,
    couplesArchetype: 'dyad',
    partner1Name: 'Роман (Баритон)',
    partner2Name: 'София (Сопрано)',
    partner1Pitch: 125,
    partner2Pitch: 245,
  },
  {
    id: 'SPECIMEN #DUET-02',
    name: '«Голосовое сплетение: Артур & Мила»',
    property: 'Двойная спираль • Геликоидное сплетение [140 Гц & 265 Гц]',
    poeticDescription: 'Пластическое сплетение двух голосов в форме двойной спирали. Две ветви из терракоты и оникса обвивают друг друга в бесконечном гармоническом танце.',
    createdAt: '08 сентября 2026 г.',
    material: 'ceramic',
    material2: 'obsidian',
    tactileTags: ['диптих', 'пара', 'двойная спираль', 'терракота', 'оникс'],
    dominantMood: {
      mood: 'mysterious',
      label: 'Гармония / Страсть',
      description: 'Гармоничное сплетение тембров',
      colorHex: '#8b5cf6',
    },
    authorName: 'Артур & Мила',
    exhibitedAt: '08.09.2026',
    avgPitch: 202,
    macroType: 'spiral',
    uniqueSeed: 66209,
    survivalYears: 1500,
    isCouples: true,
    couplesArchetype: 'helix',
    partner1Name: 'Артур',
    partner2Name: 'Мила',
    partner1Pitch: 140,
    partner2Pitch: 265,
  },
  {
    id: 'SPECIMEN #14-7A9B',
    name: 'Кристаллический шпиль эйфории',

    property: 'излучает резонанс восходящей октавы',
    poeticDescription: 'Высокий звонкий тембр вытянул породу в стройный вертикальный кристалл с сияющими янтарными плоскостями. Форма держит вектор чистого устремления.',
    createdAt: '06 сентября 2026 г.',
    material: 'graphite',
    tactileTags: ['воодушевление', 'шпиль', 'золото', 'высокий тон'],
    dominantMood: {
      mood: 'joyful',
      label: 'Воодушевление / Радость',
      description: 'Воодушевлённый звонкий голос',
      colorHex: '#d4af37',
    },
    authorName: 'Елена В. // Сопрано',
    exhibitedAt: '06.09.2026',
    avgPitch: 245,
    macroType: 'spire',
    uniqueSeed: 88412,
    survivalYears: 540,
  },
  {
    id: 'SPECIMEN #08-2F1C',
    name: 'Базальтовая плита безмолвия',
    property: 'заземляет любую вибрацию пространства',
    poeticDescription: 'Низкий грудной бас расплющил породу в массивный горизонтальный тектонический срез. Сланцевая гладь впитала мшистый покой древних русел.',
    createdAt: '07 сентября 2026 г.',
    material: 'basalt',
    tactileTags: ['спокойствие', 'плита', 'диск', 'базальт', 'бас'],
    dominantMood: {
      mood: 'calm',
      label: 'Спокойствие / Баланс',
      description: 'Спокойный размеренный голос',
      colorHex: '#4ade80',
    },
    authorName: 'Михаил К. // Бас-профундо',
    exhibitedAt: '07.09.2026',
    avgPitch: 108,
    macroType: 'disc',
    uniqueSeed: 34102,
    survivalYears: 720,
  },
  {
    id: 'SPECIMEN #92-E410',
    name: 'Разломная магма крика',
    property: 'сохраняет кинетический импульс ярости',
    poeticDescription: 'Взрывной эмоциональный выплеск предельной громкости рассек породу на граненые полигональные пики с острыми кинетическими кромками.',
    createdAt: '07 сентября 2026 г.',
    material: 'obsidian',
    tactileTags: ['ярость', 'разлом', 'магма', 'острый', 'крик'],
    dominantMood: {
      mood: 'angry',
      label: 'Злость / Напряжение',
      description: 'Яростный напряжённый голос',
      colorHex: '#ef4444',
    },
    authorName: 'Даниил Р. // Экспрессия',
    exhibitedAt: '07.09.2026',
    avgPitch: 195,
    macroType: 'monolith',
    uniqueSeed: 91440,
    survivalYears: 610,
  },
  {
    id: 'SPECIMEN #41-6C7D',
    name: 'Лазурная слеза заката',
    property: 'тяжелеет в моменты дыхания',
    poeticDescription: 'Тихий задумчивый шёпот сместил центр тяжести книзу, образовав каплевидную форму тающего сталактита с глубоким сапфировым свечением.',
    createdAt: '08 сентября 2026 г.',
    material: 'obsidian',
    tactileTags: ['меланхолия', 'капля', 'синий', 'тишина'],
    dominantMood: {
      mood: 'sad',
      label: 'Грусть / Меланхолия',
      description: 'Грустный меланхоличный голос',
      colorHex: '#3b82f6',
    },
    authorName: 'Алиса С. // Монолог',
    exhibitedAt: '08.09.2026',
    avgPitch: 165,
    macroType: 'teardrop',
    uniqueSeed: 56123,
    survivalYears: 480,
  },
  {
    id: 'SPECIMEN #33-8B04',
    name: 'Пепельный серп шёпота',
    property: 'внутри всегда слышится лёгкое шуршание',
    poeticDescription: 'Воздушное приглушенное дыхание скрутило минерал в асимметричный дугообразный монолит пепельно-пурпурного оттенка.',
    createdAt: '08 сентября 2026 г.',
    material: 'ceramic',
    tactileTags: ['шёпот', 'серп', 'аметист', 'тайна'],
    dominantMood: {
      mood: 'mysterious',
      label: 'Таинственность / Загадка',
      description: 'Таинственный тихий шёпот',
      colorHex: '#a855f7',
    },
    authorName: 'Странник #09',
    exhibitedAt: '08.09.2026',
    avgPitch: 185,
    macroType: 'crescent',
    uniqueSeed: 71209,
    survivalYears: 437,
  },
];

export function getHallSpecimens(): HallSpecimen[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EXHIBITS));
      return INITIAL_EXHIBITS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].macroType || !parsed[0].survivalYears) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EXHIBITS));
      return INITIAL_EXHIBITS;
    }
    return parsed;
  } catch {
    return INITIAL_EXHIBITS;
  }
}

export function addHallSpecimen(
  artefact: ArtefactProfile,
  authorName: string = 'Авторский слепок',
  thumbnailUrl?: string
): HallSpecimen {
  const all = getHallSpecimens();

  const existing = all.find((s) => s.id === artefact.id);
  if (existing) return existing;

  const pitch = artefact.voiceDNA?.avgPitch || 170;
  let macroType: 'spire' | 'disc' | 'monolith' | 'teardrop' | 'crescent' = 'monolith';
  const mood = artefact.dominantMood?.mood || 'calm';

  if (pitch > 190) {
    macroType = 'spire';
  } else if (pitch < 140) {
    macroType = 'disc';
  } else if (mood === 'angry') {
    macroType = 'monolith';
  } else if (mood === 'sad') {
    macroType = 'teardrop';
  } else if (mood === 'mysterious') {
    macroType = 'crescent';
  }

  const dateNow = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const newExhibit: HallSpecimen = {
    id: artefact.id,
    name: artefact.name,
    property: artefact.property,
    poeticDescription: artefact.poeticDescription,
    createdAt: artefact.createdAt,
    material: artefact.material,
    tactileTags: artefact.tactileTags,
    dominantMood: {
      mood: artefact.dominantMood?.mood || 'calm',
      label: artefact.dominantMood?.label || 'Спокойствие / Баланс',
      description: artefact.dominantMood?.description || 'Спокойный голос',
      colorHex: artefact.dominantMood?.colorHex || '#4ade80',
    },
    audioBlobUrl: artefact.audioBlobUrl,
    authorName,
    exhibitedAt: dateNow,
    avgPitch: pitch,
    macroType,
    uniqueSeed: artefact.voiceDNA?.uniqueSeed || 12345,
    survivalYears: artefact.survivalYears || 437,
    thumbnailUrl,
    isCouples: artefact.isCouples,
    couplesArchetype: artefact.couplesArchetype,
    material2: artefact.material2,
    partner1Name: artefact.partner1?.name,
    partner2Name: artefact.partner2?.name,
    partner1Pitch: artefact.partner1 ? Math.round(artefact.partner1.features.pitch) : undefined,
    partner2Pitch: artefact.partner2 ? Math.round(artefact.partner2.features.pitch) : undefined,
  };


  const updated = [newExhibit, ...all];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }

  return newExhibit;
}

export function isSpecimenInHall(id: string): boolean {
  const all = getHallSpecimens();
  return all.some((s) => s.id === id);
}

export function updateHallSpecimen(
  id: string,
  updates: { name?: string; authorName?: string; property?: string }
): HallSpecimen[] {
  const all = getHallSpecimens();
  const updated = all.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
      };
    }
    return item;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update specimen in localStorage:', e);
  }
  return updated;
}
