import React, { useState, useEffect, useRef } from 'react';
import { getHallSpecimens, updateHallSpecimen, type HallSpecimen } from '../services/hallStorage';
import { SpecimenThumbnail } from './SpecimenThumbnail';

interface HallOfSpecimensProps {
  onClose: () => void;
  onInspectSpecimen: (specimen: HallSpecimen) => void;
}

export const HallOfSpecimens: React.FC<HallOfSpecimensProps> = ({
  onClose,
  onInspectSpecimen,
}) => {
  const [specimens, setSpecimens] = useState<HallSpecimen[]>([]);
  const [activeMoodFilter, setActiveMoodFilter] = useState<string>('all');
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

  const filtered = specimens.filter((s) => {
    if (activeMoodFilter === 'all') return true;
    return s.dominantMood.mood === activeMoodFilter;
  });

  const moodFilters: { id: string; label: string; color: string }[] = [
    { id: 'all', label: `Все (${specimens.length})`, color: 'var(--text-main)' },
    { id: 'angry', label: 'Экспрессивный', color: '#ef4444' },
    { id: 'calm', label: 'Спокойный', color: '#4ade80' },
    { id: 'sad', label: 'Низкочастотный', color: '#3b82f6' },
    { id: 'joyful', label: 'Светлый', color: '#d4af37' },
    { id: 'mysterious', label: 'Сложный тембр', color: '#a855f7' },
  ];

  const getMacroLabel = (type: HallSpecimen['macroType']): string => {
    switch (type) {
      case 'spire': return 'Высокий шпиль (F0 peak)';
      case 'disc': return 'Дискоидная форма';
      case 'monolith': return 'Анизотропный монолит';
      case 'teardrop': return 'Каплевидная форма';
      case 'crescent': return 'Серповидная кривизна';
      default: return 'Икосаэдрический меш';
    }
  };

  return (
    <div className="hall-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="hall-title">
      <div className="hall-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hall-header">
          <div className="hall-title-area">
            <span className="hall-kicker">РЕПОЗИТОРИЙ ГЕОМЕТРИИ</span>
            <h2 id="hall-title" className="hall-title">Архив 3D-образцов</h2>
            <p className="hall-subtitle">
              База параметрических 3D-моделей, сгенерированных на основе акустического анализа речи.
            </p>
          </div>
          <button className="hall-close-btn" onClick={onClose} title="Закрыть архив">
            ✕ Закрыть
          </button>
        </div>

        {/* Filters */}
        <div className="hall-filters-bar">
          {moodFilters.map((f) => (
            <button
              key={f.id}
              className={`hall-filter-chip ${activeMoodFilter === f.id ? 'active' : ''}`}
              style={{
                borderColor: activeMoodFilter === f.id ? f.color : undefined,
                color: activeMoodFilter === f.id ? f.color : undefined,
              }}
              onClick={() => setActiveMoodFilter(f.id)}
            >
              <span
                className="filter-dot"
                style={{ backgroundColor: f.color }}
              />
              {f.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="hall-grid">
          {filtered.length === 0 ? (
            <div className="hall-empty-state">
              <span className="empty-icon">📁</span>
              <p className="empty-title">В архиве пока нет сохранённых образцов</p>
              <p className="empty-hint">Запишите голос на главном экране и сохраните модель в архив.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="hall-card"
              >
                {/* Card Top Meta */}
                <div className="hall-card-top">
                  <span className="hall-specimen-id">{item.id}</span>
                  <div
                    className="hall-mood-tag"
                    style={{
                      color: item.dominantMood.colorHex,
                      borderColor: `${item.dominantMood.colorHex}50`,
                    }}
                  >
                    <span
                      className="hall-mood-dot"
                      style={{
                        backgroundColor: item.dominantMood.colorHex,
                      }}
                    />
                    {item.dominantMood.label.split('/')[0].trim()}
                  </div>
                </div>

                {/* 3D Visual Specimen Thumbnail Pedestal */}
                <div className="hall-card-visual-pedestal">
                  <SpecimenThumbnail specimen={item} />
                  <span className="hall-macro-badge">
                    {getMacroLabel(item.macroType)}
                  </span>
                </div>

                {/* Editable Title / Signature */}
                <div className="hall-signature-block">
                  {editingId === item.id ? (
                    <div className="hall-edit-row">
                      <input
                        type="text"
                        className="hall-signature-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(item.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                        placeholder="Название образца..."
                      />
                      <button
                        className="hall-edit-btn save"
                        onClick={() => handleSaveEdit(item.id)}
                        title="Сохранить"
                      >
                        ✓
                      </button>
                      <button
                        className="hall-edit-btn cancel"
                        onClick={handleCancelEdit}
                        title="Отмена"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="hall-name-display-row">
                      <h3
                        className="hall-card-name clickable"
                        onClick={() => handleStartEdit(item)}
                        title="Нажмите для редактирования"
                      >
                        {item.name}
                      </h3>
                      <button
                        className="hall-rename-icon-btn"
                        onClick={() => handleStartEdit(item)}
                        title="Редактировать название"
                      >
                        ✎
                      </button>
                    </div>
                  )}

                  <div className="hall-author-tag">
                    {item.exhibitedAt} // 3D Mesh
                  </div>

                  {item.property && (
                    <div className="hall-specimen-property">
                      ◈ {item.property}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="hall-card-actions">
                  {item.audioBlobUrl && (
                    <button
                      className="hall-audio-btn"
                      onClick={() => handleToggleAudio(item)}
                      title="Прослушать исходную аудиозапись"
                    >
                      {playingAudioId === item.id ? '■ Стоп' : '▶ Аудио'}
                    </button>
                  )}

                  <button
                    className="hall-inspect-btn"
                    onClick={() => {
                      onInspectSpecimen(item);
                      onClose();
                    }}
                    title="Загрузить в 3D сцену"
                  >
                    В сцену ↗
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
