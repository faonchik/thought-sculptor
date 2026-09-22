import React, { useEffect, useRef } from 'react';
import type { AcousticFeatures } from '../types';

interface ObservationHudProps {
  features: AcousticFeatures | null;
  elapsedSeconds: number;
  onStopRecording: () => void;
}

export const ObservationHud: React.FC<ObservationHudProps> = ({
  features,
  elapsedSeconds,
  onStopRecording,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  const maxDuration = 30;
  const remaining = Math.max(0, maxDuration - elapsedSeconds);
  const progressPercent = Math.min(100, (elapsedSeconds / maxDuration) * 100);

  const rms = features?.rms || 0;
  const isClipping = rms > 0.78;
  const isWeak = rms < 0.07;

  // Real-time oscilloscope with analog oscilloscope styling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const renderWave = () => {
      if (!running) return;
      phaseRef.current += 0.08;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // CRT phosphor dark background
      ctx.fillStyle = '#0a0d0b';
      ctx.fillRect(0, 0, width, height);

      // Oscilloscope laboratory graticule grid
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Center axes
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      // Grid lines
      for (let x = 40; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 15; y < height; y += 15) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      const signalAmp = features ? Math.max(0.04, features.rms) : 0.03;
      const pitch = features?.pitch || 140;
      const freqFactor = Math.max(1, pitch / 80);

      const centerY = height / 2;
      const amplitude = Math.min(height * 0.44, signalAmp * height * 0.95);

      // Primary trace — phosphor green / lab amber
      ctx.beginPath();
      ctx.strokeStyle = isClipping ? '#f43f5e' : '#34d399';
      ctx.lineWidth = 1.6;

      for (let x = 0; x < width; x += 2) {
        const normX = x / width;
        const envelope = Math.sin(normX * Math.PI);
        const y =
          centerY +
          Math.sin(normX * freqFactor * 14 + phaseRef.current) * amplitude * envelope +
          Math.cos(normX * freqFactor * 26 - phaseRef.current * 1.3) * (amplitude * 0.38) * envelope;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Subtle phosphor afterglow line
      ctx.beginPath();
      ctx.strokeStyle = isClipping ? 'rgba(244, 63, 94, 0.25)' : 'rgba(52, 211, 153, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 3) {
        const normX = x / width;
        const envelope = Math.sin(normX * Math.PI);
        const y =
          centerY +
          Math.sin(normX * freqFactor * 9 - phaseRef.current * 0.9) * (amplitude * 0.6) * envelope;
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
  const dbEstimate = rms > 0.01 ? Math.round(20 * Math.log10(rms)) : -60;
  const centroidVal = features ? Math.round(features.spectralCentroid * 4000) : null;
  const fluxVal = features ? (features.spectralFlux * 100).toFixed(0) : '0';

  return (
    <div className="observation-screen-wrap">
      {/* 1. TOP: Rack Telemetry Header */}
      <div className="telemetry-top-bar">
        <div className="telemetry-channel-status">
          <span className="live-rec-dot" />
          <span className="channel-id">CH-1 [AUDIO IN]</span>
          <span className="status-separator">|</span>
          <span className="time-counter">
            00:{elapsedSeconds < 10 ? '0' : ''}{elapsedSeconds}
            <span className="time-max"> / 00:30 с</span>
          </span>
          <span className="status-separator">|</span>
          <span className="remaining-badge">ОСТАТОК: {remaining}с</span>
        </div>

        <div className="signal-warning-slot">
          {isClipping && (
            <span className="warning-chip clip-warning">
              ⚠ ПЕРЕГРУЗКА ВХОДА (CLIP &gt; -3dB)
            </span>
          )}
          {isWeak && (
            <span className="warning-chip weak-warning">
              ℹ СИГНАЛ СЛАБЫЙ // ШУМОВОЙ ПОРОГ
            </span>
          )}
        </div>

        <div className="hardware-progress-track">
          <div
            className="hardware-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. REAL-TIME RAW SENSOR READOUTS */}
      <div className="live-telemetry-grid">
        <div className="telemetry-card">
          <div className="card-top-id">F0_PITCH</div>
          <div className="telemetry-param-value">
            {pitchVal ? `${pitchVal} Гц` : '—'}
          </div>
          <div className="telemetry-note">
            {pitchVal
              ? pitchVal < 120
                ? 'глубокий бас'
                : pitchVal > 220
                ? 'высокий фальцет'
                : 'разговорный регистр'
              : 'тишина / пауза'}
          </div>
        </div>

        <div className="telemetry-card">
          <div className="card-top-id">RMS_LEVEL</div>
          <div className="telemetry-param-value">
            {rmsPercent}%
            <span className="sub-unit">({dbEstimate} dB)</span>
          </div>
          <div className="telemetry-note">амплитудный напор</div>
        </div>

        <div className="telemetry-card">
          <div className="card-top-id">CENTROID</div>
          <div className="telemetry-param-value">
            {centroidVal ? `${centroidVal} Гц` : '—'}
          </div>
          <div className="telemetry-note">спектральная яркость</div>
        </div>

        <div className="telemetry-card">
          <div className="card-top-id">FLUX_RATE</div>
          <div className="telemetry-param-value">{fluxVal}%</div>
          <div className="telemetry-note">скорость мутации</div>
        </div>

        {features?.mood && (
          <div className="telemetry-card telemetry-card-mood">
            <div className="card-top-id">ТЕКУЩИЙ СРЕЗ</div>
            <div className="telemetry-param-value mood-val">
              <span
                className="mood-indicator-dot"
                style={{ backgroundColor: features.mood.colorHex }}
              />
              <span className="mood-text-label">{features.mood.label}</span>
            </div>
            <div className="telemetry-note">гармонический профиль</div>
          </div>
        )}
      </div>

      {/* 3. CRT OSCILLOSCOPE & CONTROLS */}
      <div className="obs-bottom-cluster">
        <div className="crt-oscilloscope-frame">
          <div className="crt-bezel-top">
            <span className="crt-title">АНАЛОГОВЫЙ МОНИТОР СИГНАЛА // OSC-48</span>
            <span className="crt-mode">GRID: 50ms/DIV • 0.2V/DIV</span>
          </div>
          <div className="canvas-crt-wrapper">
            <canvas
              ref={canvasRef}
              width={760}
              height={75}
              className="oscilloscope-canvas"
            />
            <div className="crt-scanlines" />
          </div>
        </div>

        <button
          id="stop-recording-btn"
          className="btn-finish-recording"
          onClick={onStopRecording}
          title="Завершить замер и запустить триангуляцию 3D-меша"
        >
          <span className="btn-stop-icon">■</span>
          <span className="btn-stop-text">Зафиксировать форму и запечь 3D</span>
        </button>
      </div>
    </div>
  );
};
