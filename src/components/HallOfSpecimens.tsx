import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Volume2, VolumeX, ArrowUpRight, Edit2, Check, X, FolderOpen, RotateCcw } from 'lucide-react';
import { getHallSpecimens, updateHallSpecimen, type HallSpecimen } from '../services/hallStorage';
import { SpecimenThumbnail } from './SpecimenThumbnail';

interface HallOfSpecimensProps {
  onClose: () => void;
  onInspectSpecimen: (specimen: HallSpecimen) => void;
  onNewMeasurement?: () => void;
}

type SortOption = 'newest' | 'pitch-asc' | 'pitch-desc' | 'name';

export const HallOfSpecimens: React.FC<HallOfSpecimensProps> = ({
  onClose,
  onInspectSpecimen,
  onNewMeasurement,
}) => {
  const [specimens, setSpecimens] = useState<HallSpecimen[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMoodFilter, setActiveMoodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSpecimens(getHallSpecimens());
  }, []);

  const handleToggleAudio = (specimen: HallSpecimen) => {
    if (!specimen.audioBlobUrl) return;

    if (playingAudioId === specimen.id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(specimen.audioBlobUrl);
      audioRef.current.onended = () => setPlayingAudioId(null);
      audioRef.current.play();
      setPlayingAudioId(specimen.id);
    }
  };

  const handleStartEdit = (specimen: HallSpecimen) => {
    setEditingId(specimen.id);
    setEditTitle(specimen.name);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      const updated = updateHallSpecimen(id, { name: trimmed });
      setSpecimens(updated);
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Filter & Search Logic
  const filtered = specimens.filter((s) => {
    const matchesMood = activeMoodFilter === 'all'
      ? true
      : activeMoodFilter === 'couples'
      ? !!s.isCouples
      : s.dominantMood.mood === activeMoodFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesMood;

    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.property && s.property.toLowerCase().includes(q)) ||
      s.dominantMood.label.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q);

    return matchesMood && matchesSearch;
  });

  // Sorting logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'ru');
    }
    if (sortBy === 'pitch-asc') {
      return (a.avgPitch || 0) - (b.avgPitch || 0);
    }
    if (sortBy === 'pitch-desc') {
      return (b.avgPitch || 0) - (a.avgPitch || 0);
    }
    return b.id.localeCompare(a.id);
  });

  const moodFilters: { id: string; label: string; color: string }[] = [
    { id: 'all', label: `Все модели (${specimens.length})`, color: '#1a1a1c' },
    { id: 'couples', label: 'Парные союзы ♡', color: '#e11d48' },
    { id: 'angry', label: 'Экспрессивный', color: '#c06846' },
    { id: 'calm', label: 'Спокойный тон', color: '#52796f' },
    { id: 'sad', label: 'Глубокий регистр', color: '#4a6b82' },
    { id: 'joyful', label: 'Светлый тон', color: '#b5843a' },
    { id: 'mysterious', label: 'Сложный тембр', color: '#7a5c88' },
  ];


  const getMacroLabel = (type: HallSpecimen['macroType']): string => {
    switch (type) {
      case 'spire': return 'Вертикальный шпиль (F0 peak)';
      case 'disc': return 'Дискоидная форма';
      case 'monolith': return 'Анизотропный монолит';
      case 'teardrop': return 'Каплевидная форма';
      case 'crescent': return 'Серповидная кривизна';
      default: return 'Икосаэдрический меш';
    }
  };

  return (
    <div className="gallery-archive-overlay" role="dialog" aria-modal="true" aria-labelledby="archive-title">
      <div className="gallery-archive-container">
        {/* 1. Header Bar */}
        <div className="gallery-archive-header">
          <div className="archive-title-meta">
            <span className="archive-curation-tag">АРХИВ СКУЛЬПТУР</span>
            <h2 id="archive-title" className="archive-main-heading">Каталог 3D-моделей</h2>
            <p className="archive-subheading">
              Трехмерные скульптурные формы, созданные на основе частотного анализа речи.
            </p>
          </div>
          <button
            type="button"
            className="archive-close-btn"
            onClick={onClose}
            title="Вернуться в студию (Esc)"
          >
            <X size={16} />
            <span>Вернуться в студию</span>
          </button>
        </div>

        {/* 2. Controls Toolbar: Search & Sort */}
        <div className="archive-toolbar">
          <div className="archive-search-box">
            <Search size={15} className="search-adornment" />
            <input
              type="text"
              className="archive-search-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, номеру или регистру голоса..."
              aria-label="Поиск по архиву"
            />
            {searchQuery && (
              <button
                type="button"
                className="archive-search-clear"
                onClick={() => setSearchQuery('')}
                title="Очистить"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="archive-sort-box">
            <SlidersHorizontal size={14} className="sort-adornment" />
            <select
              className="archive-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Сортировка коллекции"
            >
              <option value="newest">Сначала недавние</option>
              <option value="pitch-desc">По высоте тона (F0 ↓)</option>
              <option value="pitch-asc">По высоте тона (F0 ↑)</option>
              <option value="name">По названию (А–Я)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="archive-filter-row">
          {moodFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`archive-filter-pill ${activeMoodFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveMoodFilter(f.id)}
            >
              <span className="filter-dot" style={{ backgroundColor: f.color }} />
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* 3. Cards Grid: Gallery Pedestals */}
        <div className="archive-pedestals-grid">
          {sorted.length === 0 ? (
            <div className="archive-empty-state">
              <FolderOpen size={42} className="empty-icon" />
              <h3 className="empty-heading">
                {specimens.length === 0
                  ? 'В постоянной экспозиции пока нет монолитов'
                  : 'По данному запросу экспонатов не обнаружено'}
              </h3>
              <p className="empty-text">
                {specimens.length === 0
                  ? 'Произнесите фразу в студии и внесите первый акустический слепок в архив.'
                  : 'Попробуйте сбросить параметры фильтрации или поисковый запрос.'}
              </p>
              {specimens.length === 0 && onNewMeasurement ? (
                <button
                  type="button"
                  className="archive-empty-btn"
                  onClick={() => {
                    onClose();
                    onNewMeasurement();
                  }}
                >
                  + Запечатлеть первый монолит
                </button>
              ) : (
                <button
                  type="button"
                  className="archive-empty-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveMoodFilter('all');
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Сбросить фильтры</span>
                </button>
              )}
            </div>
          ) : (
            sorted.map((item) => (
              <article key={item.id} className="gallery-pedestal-card">
                {/* Header Meta */}
                <div className="pedestal-card-header">
                  <span className="pedestal-accession-id">№ {item.id.slice(0, 8)}</span>
                  <span
                    className="pedestal-mood-badge"
                    style={{
                      color: item.dominantMood.colorHex,
                      borderColor: `${item.dominantMood.colorHex}40`,
                    }}
                  >
                    <span
                      className="mood-badge-dot"
                      style={{ backgroundColor: item.dominantMood.colorHex }}
                    />
                    <span>{item.dominantMood.label.split('/')[0].trim()}</span>
                  </span>
                </div>

                {/* 3D Model Pedestal Stage */}
                <div className="pedestal-3d-stage">
                  <SpecimenThumbnail specimen={item} />
                  <span className="pedestal-type-tag">
                    {item.isCouples
                      ? item.couplesArchetype === 'dyad'
                        ? 'Слияние монолитов'
                        : 'Спиральное обвивание'
                      : getMacroLabel(item.macroType)}
                  </span>

                </div>

                {/* Body Content */}
                <div className="pedestal-body">
                  {editingId === item.id ? (
                    <div className="pedestal-edit-box">
                      <input
                        type="text"
                        className="pedestal-title-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(item.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="pedestal-confirm-btn"
                        onClick={() => handleSaveEdit(item.id)}
                        title="Сохранить"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        className="pedestal-cancel-btn"
                        onClick={handleCancelEdit}
                        title="Отмена"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="pedestal-title-line">
                      <h3
                        className="pedestal-title"
                        onClick={() => handleStartEdit(item)}
                        title="Нажмите для переименования"
                      >
                        {item.name}
                      </h3>
                      <button
                        type="button"
                        className="pedestal-rename-btn"
                        onClick={() => handleStartEdit(item)}
                        title="Переименовать"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}

                  {item.property && (
                    <p className="pedestal-statement">{item.property}</p>
                  )}

                  <div className="pedestal-specs-row">
                    <span>F0: {item.avgPitch ? `${Math.round(item.avgPitch)} Гц` : '175 Гц'}</span>
                    <span className="dot-sep">•</span>
                    <span>2562V / 5120F</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pedestal-actions">
                  {item.audioBlobUrl && (
                    <button
                      type="button"
                      className={`pedestal-audio-btn ${playingAudioId === item.id ? 'active' : ''}`}
                      onClick={() => handleToggleAudio(item)}
                      title="Прослушать голос"
                    >
                      {playingAudioId === item.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{playingAudioId === item.id ? 'Стоп' : 'Аудио'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="pedestal-inspect-btn"
                    onClick={() => {
                      onInspectSpecimen(item);
                      onClose();
                    }}
                    title="Открыть в открытой студии 3D"
                  >
                    <span>Осмотреть в 3D</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
