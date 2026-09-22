import React from 'react';

interface HeroControlsProps {
  isRecording: boolean;
  onToggleRecord: () => void;
  onTriggerSynthetic: () => void;
  elapsedSeconds: number;
}

export const HeroControls: React.FC<HeroControlsProps> = ({
  isRecording,
  onToggleRecord,
  onTriggerSynthetic,
}) => {
  if (isRecording) {
    return null;
  }

  return (
    <div className="hero-controls-wrap screen-dormant">
      <div className="instrument-rack-panel">
        <div className="rack-header-strip">
          <span className="rack-id">МОДУЛЬ ДЕФОРМАЦИИ // СЕКЦИЯ-A</span>
          <span className="rack-status">КАЛИБРОВКА В НОРМЕ</span>
        </div>

        <h2 className="instrument-main-title">
          Преобразование акустического спектра в 3D-топологию
        </h2>

        <p className="instrument-desc">
          Стенд фиксирует частотно-динамический профиль фразы и смещает вершины полигональной сферы по нормалям с использованием шума Перлина. Результат экспортируется в бинарный 3D-STL для прямой печати.
        </p>

        {/* Real researcher lab note */}
        <div className="lab-sticky-note">
          <div className="sticky-header">
            <span className="sticky-pin" />
            <span className="sticky-tag">ПОЛЕВАЯ ЗАМЕТКА ЛАБОРАНТА</span>
          </div>
          <p className="sticky-text">
            «Держите дистанцию до микрофона ~15–20 см. При резком срыве в крик верхи выбивают острые артефакты, а низкие частоты (&lt;120 Гц) утяжеляют нижний фланец. Лучше произнести одну связную мысль с выраженной интонацией.»
          </p>
        </div>

        <div className="hardware-metrics-row">
          <div className="hw-metric">
            <span className="hw-label">ВХОД</span>
            <span className="hw-val">MIC CH-1</span>
          </div>
          <div className="hw-metric">
            <span className="hw-label">ОКНО FFT</span>
            <span className="hw-val">2048 pts</span>
          </div>
          <div className="hw-metric">
            <span className="hw-label">ЧАСТОТА ОПРОСА</span>
            <span className="hw-val">48 кГц</span>
          </div>
          <div className="hw-metric">
            <span className="hw-label">СЕТКА</span>
            <span className="hw-val">2562V / STL</span>
          </div>
        </div>

        <div className="hero-action-container">
          <button
            id="speak-trigger-btn"
            className="action-btn-primary"
            onClick={onToggleRecord}
            title="Запустить захват микрофонного сигнала"
          >
            <span className="rec-light" />
            <span className="btn-main-label">Начать захват голоса [REC]</span>
          </button>

          <button
            id="demo-synth-btn"
            className="action-btn-secondary"
            onClick={onTriggerSynthetic}
            title="Запустить генератор тестовых гармоник 175 Гц"
          >
            <span className="hw-btn-prefix">~ ТЕСТ:</span>
            <span>Генератор гармоник</span>
          </button>
        </div>
      </div>
    </div>
  );
};
