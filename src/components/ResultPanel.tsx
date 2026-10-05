import React, { useState, useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { Download, BookmarkCheck, BookmarkPlus, Copy, Check, Volume2, VolumeX, Edit2, Sparkles, Heart, Layers, Disc3 } from 'lucide-react';
import type { ArtefactProfile, MaterialPresetType, AcousticTraceSnapshot, CouplesArchetype } from '../types';
import { TimelineTrace } from './TimelineTrace';
import { exportSculptureToSTL } from '../services/stlExporter';

interface ResultPanelProps {
  artefact: ArtefactProfile;
  meshRef: React.RefObject<THREE.Object3D | null>;
  currentMaterial: MaterialPresetType;
  material2?: MaterialPresetType;
  onChangeMaterial: (mat: MaterialPresetType) => void;
  onChangeMaterial2?: (mat: MaterialPresetType) => void;
  onApplyMoodColor: () => void;
  onTimelineProgress: (progress: number) => void;
  onExhibitInHall?: () => void;
  isExhibitedInHall?: boolean;
  onSelectSnapshot?: (snapshot: AcousticTraceSnapshot) => void;
  onResetToFinal?: () => void;
  onResurrect?: () => void;
  couplesArchetype?: CouplesArchetype;
  onChangeCouplesArchetype?: (arch: CouplesArchetype) => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  artefact,
  meshRef,
  currentMaterial,
  material2 = 'graphite',
  onChangeMaterial,
  onChangeMaterial2,
  onApplyMoodColor,
  onTimelineProgress,
  onExhibitInHall,
  isExhibitedInHall = false,
  onResurrect,
  couplesArchetype = 'dyad',
  onChangeCouplesArchetype,
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
      const summary = `ЭКСПОНАТ: «${artefact.name}» [${artefact.id}]\nМатериал: ${currentMaterial}${artefact.isCouples ? ` & ${material2}` : ''}\nТон F0: ${Math.round(artefact.finalFeatures.pitch)} Гц | Спектральный характер: ${artefact.dominantMood?.label || 'нейтральный'}\n${artefact.poeticDescription}\nФормат: 3D STL`;
      navigator.clipboard.writeText(summary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  const materials: { id: MaterialPresetType; label: string }[] = [
    { id: 'basalt', label: 'Мрамор' },
    { id: 'ceramic', label: 'Терракота' },
    { id: 'graphite', label: 'Бронза' },
    { id: 'obsidian', label: 'Оникс' },
  ];

  const handleSelectMaterial = (mat: MaterialPresetType) => {
    setIsMoodColorActive(false);
    onChangeMaterial(mat);
  };

  const handleSelectMaterial2 = (mat: MaterialPresetType) => {
    if (onChangeMaterial2) {
      onChangeMaterial2(mat);
    }
  };

  const handleSelectMoodColor = () => {
    setIsMoodColorActive(true);
    onApplyMoodColor();
  };

  const pitchVal = Math.round(artefact.finalFeatures.pitch);
  const rolloffVal = Math.round(artefact.finalFeatures.spectralRolloff * 5500);
  const durationVal = artefact.duration.toFixed(1);
  const rmsVal = Math.round(artefact.finalFeatures.rms * 100);
  const strategy = artefact.voiceDNA?.morphStrategy || 'asymmetric';

  const getStrategyLabel = () => {
    if (artefact.isCouples) {
      return (artefact.couplesArchetype || couplesArchetype) === 'dyad'
        ? 'Слияние монолитов'
        : 'Спиральное обвивание';
    }
    switch (strategy) {
      case 'spire': return 'Вертикальный шпиль';
      case 'monolith': return 'Массивный монолит';
      case 'spiral': return 'Вихревая спираль';
      case 'crest': return 'Граненый кристалл';
      case 'organic': return 'Обтекаемая капля';
      default: return 'Асимметричный вектор';
    }
  };

  const getPitchCausality = () => {
    if (artefact.isCouples) {
      const p1 = artefact.partner1 ? Math.round(artefact.partner1.features.pitch) : 135;
      const p2 = artefact.partner2 ? Math.round(artefact.partner2.features.pitch) : 245;
      return `Сопряжение тембров: бас/баритон (${p1} Гц) дал основание, а светлый верх (${p2} Гц) — восходящее устремление`;
    }
    if (pitchVal > 220) return `Высокий регистр (${pitchVal} Гц) вытянул стройные вертикальные шпили кроны`;
    if (pitchVal > 110) return `Разговорный диапазон (${pitchVal} Гц) сохранил гармоническую симметрию`;
    return `Низкий регистр (${pitchVal > 30 ? `${pitchVal} Гц` : 'баритон'}) отлил устойчивое массивное основание`;
  };

  const getRmsCausality = () => {
    if (artefact.isCouples) {
      return `Два голоса сформировали непрерывный диалог плотности и динамики`;
    }
    if (rmsVal > 55) return `Интенсивная подача (${rmsVal}%) усилила радиальную рельефность граней`;
    return `Мягкая подача (${rmsVal}%) сформировала шелковистую непрерывность формы`;
  };

  const getSpectralCausality = () => {
    if (artefact.isCouples) {
      return (artefact.couplesArchetype || couplesArchetype) === 'dyad'
        ? `В месте контакта монолитов образована органическая перемычка взаимного тяготения`
        : `Геликоидные траектории двух частот закрутились в двойную гармоническую спираль`;
    }
    if (strategy === 'crest') {
      const zcr = Math.round((artefact.finalFeatures.zeroCrossingRate || 0.16) * 100);
      return `Резкость атаки ZCR (${zcr}%) огранила кристаллические рельефные ребра`;
    }
    if (strategy === 'spiral') {
      const vari = Math.round((artefact.voiceDNA?.temporalVariability || 0.25) * 100);
      return `Временная вариативность (${vari}%) скрутила ось монолита в вихревую спираль`;
    }
    if (strategy === 'organic') {
      const harm = Math.round((artefact.voiceDNA?.avgHarmonicRatio || 0.65) * 100);
      return `Гармоничность речи (${harm}%) обеспечила плавную непрерывную биоморфную пластику`;
    }
    return `Спектральный срез Rolloff (${rolloffVal} Гц) определил предел высотной деформации`;
  };

  return (
    <aside className="gallery-dossier screen-artefact" aria-label="Экспликация скульптуры">
      {/* 1. Header: Monograph Metadata & Title */}
      <div className="dossier-header">
        <div className="dossier-index-row">
          <span className="dossier-accession-num">№ {artefact.id}</span>
          <span className="dossier-divider">/</span>
          {artefact.isCouples ? (
            <span className="dossier-mood-chip" style={{ borderColor: '#e11d4850', color: '#e11d48' }}>
              <Heart size={11} className="mood-dot" style={{ backgroundColor: 'transparent' }} />
              Акустический диптих
            </span>
          ) : artefact.dominantMood ? (
            <span
              className="dossier-mood-chip"
              style={{
                borderColor: `${artefact.dominantMood.colorHex}50`,
                color: artefact.dominantMood.colorHex,
              }}
            >
              <span
                className="mood-dot"
                style={{ backgroundColor: artefact.dominantMood.colorHex }}
              />
              {artefact.dominantMood.label}
            </span>
          ) : null}
        </div>

        {isEditingTitle ? (
          <div className="dossier-title-edit-form">
            <input
              type="text"
              className="dossier-title-input"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
            />
            <button
              type="button"
              className="dossier-title-save-btn"
              onClick={handleSaveTitle}
              title="Сохранить название"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="dossier-title-row">
            <h2 className="dossier-work-title">{artefact.name}</h2>
            <button
              type="button"
              className="dossier-edit-title-btn"
              onClick={() => setIsEditingTitle(true)}
              title="Переименовать экспонат"
            >
              <Edit2 size={13} />
            </button>
          </div>
        )}

        <div className="dossier-curator-thesis">
          {artefact.property}
        </div>
      </div>

      {/* Couples Dual Partner Brief */}
      {artefact.isCouples && artefact.partner1 && artefact.partner2 && (
        <div className="result-couples-duo-grid">
          <div className="result-partner-card">
            <span className="result-partner-title">
              <span style={{ color: 'var(--accent-terracotta)' }}>●</span> {artefact.partner1.name}
            </span>
            <div className="result-partner-meta">
              Тон F0: {Math.round(artefact.partner1.features.pitch)} Гц
              <br />
              Материал: {materials.find((m) => m.id === currentMaterial)?.label}
            </div>
          </div>

          <div className="result-partner-card">
            <span className="result-partner-title">
              <span style={{ color: 'var(--accent-sage)' }}>●</span> {artefact.partner2.name}
            </span>
            <div className="result-partner-meta">
              Тон F0: {Math.round(artefact.partner2.features.pitch)} Гц
              <br />
              Материал: {materials.find((m) => m.id === (artefact.material2 || material2))?.label}
            </div>
          </div>
        </div>
      )}

      {/* Couples Union Geometry Switcher */}
      {artefact.isCouples && onChangeCouplesArchetype && (
        <div className="dossier-section" style={{ paddingTop: '0.4rem', paddingBottom: '0.6rem' }}>
          <div className="dossier-section-title">
            <span>Форма союза (Геометрия)</span>
          </div>
          <div className="dossier-material-pills">
            <button
              type="button"
              className={`dossier-mat-pill ${(artefact.couplesArchetype || couplesArchetype) === 'dyad' ? 'active' : ''}`}
              onClick={() => onChangeCouplesArchetype('dyad')}
            >
              <Layers size={12} style={{ display: 'inline', marginRight: 4 }} />
              Слияние монолитов
            </button>
            <button
              type="button"
              className={`dossier-mat-pill ${(artefact.couplesArchetype || couplesArchetype) === 'helix' ? 'active' : ''}`}
              onClick={() => onChangeCouplesArchetype('helix')}
            >
              <Disc3 size={12} style={{ display: 'inline', marginRight: 4 }} />
              Спиральное обвивание
            </button>
          </div>
        </div>
      )}

      {/* 2. Curatorial Monograph Note */}
      <div className="dossier-section">
        <div className="dossier-section-title">
          <span>Кураторское заключение</span>
        </div>
        <p className="dossier-essay">
          {artefact.poeticDescription}
        </p>
      </div>

      {/* 3. Acoustic Causality */}
      <div className="dossier-section">
        <div className="dossier-section-title">
          <Sparkles size={12} className="section-title-icon" />
          <span>Связь звука с формой</span>
        </div>
        <div className="causality-list">
          <div className="causality-item">
            <span className="causality-bullet" />
            <p className="causality-text">{getPitchCausality()}</p>
          </div>
          <div className="causality-item">
            <span className="causality-bullet" />
            <p className="causality-text">{getRmsCausality()}</p>
          </div>
          <div className="causality-item">
            <span className="causality-bullet" />
            <p className="causality-text">{getSpectralCausality()}</p>
          </div>
        </div>

        {/* Dense Acoustic Metrics Table */}
        <div className="dossier-metrics-grid">
          <div className="metric-cell">
            <span className="metric-tag">ОСНОВНОЙ ТОН F0</span>
            <span className="metric-num">{pitchVal > 30 ? `${pitchVal} Гц` : 'Бас'}</span>
          </div>
          <div className="metric-cell">
            <span className="metric-tag">ХРОНОМЕТРАЖ</span>
            <span className="metric-num">{durationVal} с</span>
          </div>
          <div className="metric-cell">
            <span className="metric-tag">СРЕЗ ROLLOFF</span>
            <span className="metric-num">{rolloffVal} Гц</span>
          </div>
          <div className="metric-cell">
            <span className="metric-tag">СТРАТЕГИЯ</span>
            <span className="metric-num" style={{ fontSize: '0.74rem' }}>{getStrategyLabel()}</span>
          </div>
        </div>
      </div>

      {/* 4. Audio Guide Playback & History */}
      {artefact.audioBlobUrl && (
        <div className="dossier-section audio-guide-box">
          <button
            type="button"
            className={`audio-guide-btn ${isPlayingAudio ? 'playing' : ''}`}
            onClick={toggleAudio}
            title={isPlayingAudio ? 'Пауза' : 'Воспроизвести запись голоса'}
          >
            {isPlayingAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isPlayingAudio ? 'Остановить аудио' : 'Прослушать запись голоса'}</span>
          </button>

          {!artefact.isCouples && (
            <TimelineTrace
              snapshots={artefact.snapshots}
              totalDuration={artefact.duration}
              onProgressChange={onTimelineProgress}
            />
          )}
        </div>
      )}

      {/* 5. Sculptor's Material Switcher */}
      <div className="dossier-section">
        <div className="dossier-section-title">
          <span>{artefact.isCouples ? 'Материал Голоса I' : 'Материал поверхности'}</span>
        </div>
        <div className="dossier-material-pills">
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`dossier-mat-pill ${!isMoodColorActive && currentMaterial === m.id ? 'active' : ''}`}
              onClick={() => handleSelectMaterial(m.id)}
            >
              {m.label}
            </button>
          ))}
          {!artefact.isCouples && (
            <button
              type="button"
              className={`dossier-mat-pill ${isMoodColorActive ? 'active' : ''}`}
              onClick={handleSelectMoodColor}
              title="Окрасить модель в спектральный тон"
            >
              Спектральный
            </button>
          )}
        </div>

        {artefact.isCouples && onChangeMaterial2 && (
          <>
            <div className="dossier-section-title" style={{ marginTop: '0.6rem' }}>
              <span>Материал Голоса II</span>
            </div>
            <div className="dossier-material-pills">
              {materials.map((m) => (
                <button
                  key={`p2_${m.id}`}
                  type="button"
                  className={`dossier-mat-pill ${(artefact.material2 || material2) === m.id ? 'active' : ''}`}
                  onClick={() => handleSelectMaterial2(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 6. Primary & Secondary Actions */}
      <div className="dossier-actions">
        <button
          id="download-stl-btn"
          className="dossier-btn-primary"
          onClick={handleExportSTL}
          title="Скачать файл STL для 3D-печати"
        >
          <Download size={16} />
          <span>Скачать STL {artefact.isCouples ? '(парный монумент)' : '(для 3D-печати)'}</span>
        </button>

        {onExhibitInHall && (
          <button
            id="exhibit-eternity-btn"
            className={`dossier-btn-secondary ${isExhibitedInHall ? 'saved' : ''}`}
            onClick={onExhibitInHall}
            disabled={isExhibitedInHall}
            title="Сохранить в каталог моделей"
          >
            {isExhibitedInHall ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}
            <span>{isExhibitedInHall ? 'Сохранено в каталоге' : 'Сохранить в каталог'}</span>
          </button>
        )}

        <div className="dossier-actions-sub">
          <button
            id="share-world-btn"
            className="dossier-btn-ghost"
            onClick={handleShare}
            title="Скопировать параметры модели"
          >
            {isCopied ? <Check size={13} /> : <Copy size={13} />}
            <span>{isCopied ? 'Скопировано' : 'Скопировать данные'}</span>
          </button>

          {onResurrect && (
            <button
              id="resurrect-btn"
              className="dossier-btn-ghost"
              onClick={onResurrect}
              title="Начать новый замер"
            >
              ↺ Новый замер
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
