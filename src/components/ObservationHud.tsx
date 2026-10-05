import React, { useEffect, useRef } from 'react';
import type { AcousticFeatures } from '../types';

interface ObservationHudProps {
  features: AcousticFeatures | null;
  elapsedSeconds: number;
  onStopRecording: () => void;
  recordingLabel?: string;
}

export const ObservationHud: React.FC<ObservationHudProps> = ({
  features,
  elapsedSeconds,
  onStopRecording,
  recordingLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  const maxDuration = 30;
  const progressPercent = Math.min(100, (elapsedSeconds / maxDuration) * 100);

  const rms = features?.rms || 0;
  const isClipping = rms > 0.82;

  // Real-time acoustic ink-stroke waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const renderWave = () => {
      if (!running) return;
      phaseRef.current += 0.06;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Warm parchment background
      ctx.fillStyle = '#faf8f2';
      ctx.fillRect(0, 0, width, height);

      // Fine architectural datum line
      ctx.strokeStyle = '#e6e1d5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const signalAmp = features ? Math.max(0.04, features.rms) : 0.03;
      const pitch = features?.pitch || 140;
      const freqFactor = Math.max(1, pitch / 85);

      const centerY = height / 2;
      const amplitude = Math.min(height * 0.42, signalAmp * height * 0.95);

      // Primary ink stroke (terracotta or charcoal ink)
      ctx.beginPath();
      ctx.strokeStyle = isClipping ? '#c23b22' : '#c06846';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let x = 0; x < width; x += 2) {
        const normX = x / width;
        const envelope = Math.sin(normX * Math.PI);
        const y =
          centerY +
          Math.sin(normX * freqFactor * 14 + phaseRef.current) * amplitude * envelope +
          Math.cos(normX * freqFactor * 24 - phaseRef.current * 1.2) * (amplitude * 0.35) * envelope;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Delicate secondary harmonic echo
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(192, 104, 70, 0.25)';
      ctx.lineWidth = 1.2;
      for (let x = 0; x < width; x += 3) {
        const normX = x / width;
        const envelope = Math.sin(normX * Math.PI);
        const y =
          centerY +
          Math.sin(normX * freqFactor * 8 - phaseRef.current * 0.8) * (amplitude * 0.55) * envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [features, isClipping]);

  const pitchVal = features && features.pitch > 30 ? Math.round(features.pitch) : null;
  const rmsPercent = Math.round(rms * 100);
  const centroidVal = features ? Math.round(features.spectralCentroid * 4000) : null;

  return (
    <div className="gallery-recording-hud">
      {/* Top Banner: Time & Acoustic Inscription Status */}
      <div className="hud-status-strip">
        <div className="hud-session-info">
          <span className="hud-pulse-ring" />
          <span className="hud-session-title">{recordingLabel || 'Запись звука'}</span>
          <span className="hud-time-tag">

            00:{elapsedSeconds < 10 ? '0' : ''}{elapsedSeconds} / 00:30 с
          </span>
        </div>

        {/* Progress Line */}
        <div className="hud-timeline-bar">
          <div className="hud-timeline-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Acoustic Resonance Metrics */}
      <div className="hud-resonance-cards">
        <div className="resonance-card">
          <span className="card-kicker">ОСНОВНОЙ ТОН</span>
          <strong className="card-metric">{pitchVal ? `${pitchVal} Гц` : '—'}</strong>
          <span className="card-interpretation">
            {pitchVal
              ? pitchVal < 120
                ? 'Глубокий регистр'
                : pitchVal > 220
                ? 'Высокий обертон'
                : 'Разговорный диапазон'
              : 'Ожидание голоса...'}
          </span>
        </div>

        <div className="resonance-card">
          <span className="card-kicker">ЭНЕРГИЯ ВЫДОХА</span>
          <strong className="card-metric">{rmsPercent}%</strong>
          <span className="card-interpretation">Плотность звукового напора</span>
        </div>

        <div className="resonance-card">
          <span className="card-kicker">ЯРКОСТЬ СПЕКТРА</span>
          <strong className="card-metric">{centroidVal ? `${centroidVal} Гц` : '—'}</strong>
          <span className="card-interpretation">Частотный центроид</span>
        </div>

        {features?.mood && (
          <div className="resonance-card">
            <span className="card-kicker">ХАРАКТЕР ЗВУЧАНИЯ</span>
            <strong className="card-metric" style={{ color: features.mood.colorHex }}>
              {features.mood.label}
            </strong>
            <span className="card-interpretation">Гармонический профиль</span>
          </div>
        )}
      </div>

      {/* Waveform & Finalize Button */}
      <div className="hud-bottom-row">
        <div className="hud-waveform-frame">
          <canvas ref={canvasRef} width={640} height={60} className="hud-ink-canvas" />
        </div>

        <button
          id="stop-recording-btn"
          className="hud-finalize-btn"
          onClick={onStopRecording}
          title="Зафиксировать геометрию и перейти к осмотру готовой скульптуры"
        >
          <span className="finalize-icon">■</span>
          <span>Готово • Построить 3D</span>
        </button>
      </div>
    </div>
  );
};
