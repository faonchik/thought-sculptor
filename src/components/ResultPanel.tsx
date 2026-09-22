import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ArtefactProfile, MaterialPresetType, AcousticTraceSnapshot } from '../types';
import { TimelineTrace } from './TimelineTrace';
import { exportSculptureToSTL } from '../services/stlExporter';

interface ResultPanelProps {
  artefact: ArtefactProfile;
  meshRef: React.RefObject<THREE.Mesh | null>;
  currentMaterial: MaterialPresetType;
  onChangeMaterial: (mat: MaterialPresetType) => void;
  onApplyMoodColor: () => void;
  onTimelineProgress: (progress: number) => void;
  onExhibitInHall?: () => void;
  isExhibitedInHall?: boolean;
  onSelectSnapshot?: (snapshot: AcousticTraceSnapshot) => void;
  onResetToFinal?: () => void;
  onResurrect?: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  artefact,
  meshRef,
  currentMaterial,
  onChangeMaterial,
  onApplyMoodColor,
  onTimelineProgress,
  onExhibitInHall,
  isExhibitedInHall = false,
  onResurrect,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isMoodColorActive, setIsMoodColorActive] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>(artefact.name);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCurrentTitle(artefact.name);
  }, [artefact.name]);

  const handleSaveTitle = () => {
    const trimmed = currentTitle.trim();
    if (trimmed) {
      artefact.name = trimmed;
    }
    setIsEditingTitle(false);
  };

  const toggleAudio = () => {
    if (!audioRef.current && artefact.audioBlobUrl) {
      audioRef.current = new Audio(artefact.audioBlobUrl);
      audioRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleExportSTL = () => {
    if (meshRef.current) {
      const sanitized = artefact.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
      const fileName = `${sanitized}_${artefact.id.replace(/[^a-zA-Z0-9]/g, '')}.stl`;
      exportSculptureToSTL(meshRef.current, fileName);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      const summary = `ПАСПОРТ ОБРАЗЦА: «${artefact.name}» [${artefact.id}]\nПараметры: F0=${Math.round(artefact.finalFeatures.pitch)}Гц | Спектр: ${artefact.dominantMood?.label || 'нейтральный'}\n${artefact.poeticDescription}\nФормат: 3D STL (2562V / 5120F)`;
      navigator.clipboard.writeText(summary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  const materials: { id: MaterialPresetType; label: string }[] = [
    { id: 'basalt', label: 'Базальт' },
    { id: 'graphite', label: 'Графит' },
    { id: 'obsidian', label: 'Обсидиан' },
    { id: 'ceramic', label: 'Керамика' },
  ];

  const handleSelectMaterial = (mat: MaterialPresetType) => {
    setIsMoodColorActive(false);
    onChangeMaterial(mat);
  };

  const handleSelectMoodColor = () => {
    setIsMoodColorActive(true);
    onApplyMoodColor();
  };

  const pitchVal = Math.round(artefact.finalFeatures.pitch);
  const centroidVal = Math.round(artefact.finalFeatures.spectralCentroid * 4000);
  const durationVal = artefact.duration.toFixed(1);

  return (
    <div className="result-panel-drawer screen-artefact">
      {/* 1. Specimen Lab Passport */}
      <div className="artefact-passport">
        <div className="passport-header-bar">
          <div className="passport-id-badge">
            <span className="passport-badge-label">ПАСПОРТ ОБРАЗЦА //</span>
            <span className="passport-badge-code">{artefact.id}</span>
          </div>
          <span className="passport-timestamp">{artefact.createdAt}</span>
        </div>

        {/* Title area */}
        {isEditingTitle ? (
          <div className="passport-name-edit-row">
            <input
              type="text"
              className="passport-name-input"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
              placeholder="Маркировка образца..."
            />
            <button
              className="passport-name-save-btn"
              onClick={handleSaveTitle}
              title="Сохранить маркировку"
            >
              Сохранить
            </button>
          </div>
        ) : (
          <div className="passport-name-row">
            <h2
              className="passport-name"
              onClick={() => setIsEditingTitle(true)}
              title="Нажмите для редактирования маркировки"
            >
              {currentTitle}
            </h2>
            <button
              className="passport-name-edit-btn"
              onClick={() => setIsEditingTitle(true)}
              title="Переименовать образец"
            >
              ✎
            </button>
          </div>
        )}

        {/* Technical Parameters Grid */}
        <div className="passport-specs-grid">
          <div className="spec-metric-box">
            <span className="metric-label">ДЛИТЕЛЬНОСТЬ</span>
            <span className="metric-value">{durationVal} с</span>
          </div>
          <div className="spec-metric-box">
            <span className="metric-label">ТОН (F0)</span>
            <span className="metric-value">{pitchVal > 30 ? `${pitchVal} Гц` : 'Н/Д'}</span>
          </div>
          <div className="spec-metric-box">
            <span className="metric-label">ЦЕНТРОИД</span>
            <span className="metric-value">{centroidVal} Гц</span>
          </div>
          <div className="spec-metric-box">
            <span className="metric-label">СЕТКА</span>
            <span className="metric-value">2562V / 5120F</span>
          </div>
        </div>

        {/* Morphological Property & Acoustic Profile */}
        <div className="morphology-summary-box">
          <div className="morphology-row">
            <span className="morphology-tag">ТОПОЛОГИЯ:</span>
            <span className="morphology-desc">{artefact.property}</span>
          </div>
          {artefact.dominantMood && (
            <div className="morphology-row">
              <span className="morphology-tag">РЕГИСТР СИГНАЛА:</span>
              <span className="mood-chip-badge">
                <span
                  className="mood-chip-dot"
                  style={{ backgroundColor: artefact.dominantMood.colorHex }}
                />
                {artefact.dominantMood.label}
              </span>
            </div>
          )}
        </div>

        {/* Real human lab note / field observation */}
        {artefact.poeticDescription && (
          <div className="lab-field-note-box">
            <span className="field-note-prefix">ЖУРНАЛ ИСПЫТАНИЙ:</span>
            <p className="field-note-body">{artefact.poeticDescription}</p>
          </div>
        )}

        {/* Audio Playback Bar */}
        {artefact.audioBlobUrl && (
          <div className="audio-player-bar">
            <button
              className="play-audio-btn"
              onClick={toggleAudio}
              title={isPlayingAudio ? 'Остановить воспроизведение' : 'Воспроизвести запись'}
            >
              {isPlayingAudio ? '■ Стоп' : '▶ Прослушать захваченный сигнал'}
            </button>
            <span className="audio-meta-label">
              {isPlayingAudio ? 'Воспроизведение...' : `${durationVal} с (WAV 48kHz)`}
            </span>
          </div>
        )}

        {/* Timeline trace */}
        <TimelineTrace
          snapshots={artefact.snapshots}
          totalDuration={artefact.duration}
          onProgressChange={onTimelineProgress}
        />
      </div>

      {/* 2. Actions & Material Selection */}
      <div className="result-actions-cluster">
        <div className="material-selector-row">
          <span className="material-label">МАТЕРИАЛ РЕНДЕРА:</span>
          <div className="material-chip-group">
            {materials.map((m) => (
              <button
                key={m.id}
                className={`material-chip ${!isMoodColorActive && currentMaterial === m.id ? 'active' : ''}`}
                onClick={() => handleSelectMaterial(m.id)}
              >
                {m.label}
              </button>
            ))}
            <button
              className={`material-chip ${isMoodColorActive ? 'active' : ''}`}
              onClick={handleSelectMoodColor}
              title="Тонировать модель спектральным оттенком голоса"
            >
              Спектральный
            </button>
          </div>
        </div>

        <div className="action-buttons-group">
          <button
            id="download-stl-btn"
            className="btn-primary-stl"
            onClick={handleExportSTL}
            title="Экспорт полигональной 3D-модели в формате STL для 3D-печати"
          >
            <span>↓ Скачать STL (для 3D-печати)</span>
          </button>

          {onExhibitInHall && (
            <button
              id="exhibit-eternity-btn"
              className={`btn-exhibit-hall ${isExhibitedInHall ? 'exhibited' : ''}`}
              onClick={onExhibitInHall}
              disabled={isExhibitedInHall}
              title="Зафиксировать образец в журнале испытаний"
            >
              {isExhibitedInHall ? '✓ Занесено в журнал' : '+ В журнал образцов'}
            </button>
          )}

          <button
            id="share-world-btn"
            className="btn-secondary"
            onClick={handleShare}
            title="Скопировать протокол образца в буфер обмена"
          >
            {isCopied ? '✓ Скопировано' : 'Копировать протокол'}
          </button>

          {onResurrect && (
            <button
              id="resurrect-btn"
              className="btn-resurrect"
              onClick={onResurrect}
              title="Сбросить стенд и начать новый замер"
            >
              ↺ Новый замер
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
