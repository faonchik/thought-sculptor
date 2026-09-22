import React, { useState, useEffect } from 'react';
import type { AcousticTraceSnapshot } from '../types';

interface TimelineTraceProps {
  snapshots: AcousticTraceSnapshot[];
  totalDuration: number;
  onProgressChange: (progress: number) => void;
}

export const TimelineTrace: React.FC<TimelineTraceProps> = ({
  snapshots,
  totalDuration,
  onProgressChange,
}) => {
  const [progressPercent, setProgressPercent] = useState<number>(100);

  useEffect(() => {
    setProgressPercent(100);
  }, [snapshots, totalDuration]);

  const handleUpdate = (valStr: string) => {
    const val = parseFloat(valStr);
    setProgressPercent(val);
    const normalizedProgress = Math.max(0, Math.min(1, val / 100));
    onProgressChange(normalizedProgress);
  };

  const currentSeconds = Math.round((progressPercent / 100) * Math.max(1, totalDuration));
  const timeStr = `00:${currentSeconds < 10 ? '0' : ''}${currentSeconds} с`;

  let phaseLabel = 'Финальная форма';
  if (progressPercent === 0) {
    phaseLabel = 'Изначальный гладкий камень';
  } else if (progressPercent < 30) {
    phaseLabel = 'Первые акустические борозды';
  } else if (progressPercent < 70) {
    phaseLabel = 'Тектонический сдвиг спектра';
  } else if (progressPercent < 95) {
    phaseLabel = 'Кристаллизация интонации';
  }
  if (snapshots.length > 0 && progressPercent > 0 && progressPercent < 100) {
    const snapIdx = Math.min(
      snapshots.length - 1,
      Math.floor((progressPercent / 100) * snapshots.length)
    );
    if (snapshots[snapIdx]?.annotation) {
      phaseLabel = snapshots[snapIdx].annotation;
    }
  }

  return (
    <div className="timeline-trace-container">
      <div className="timeline-trace-top">
        <span className="timeline-label">СЛЕПОК ВРЕМЕНИ // {timeStr}</span>
        <span className="timeline-time-val" title={phaseLabel}>
          {phaseLabel}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={progressPercent}
        onChange={(e) => handleUpdate(e.target.value)}
        onInput={(e) => handleUpdate((e.target as HTMLInputElement).value)}
        className="timeline-slider-input"
        title="Перемотка этапов формирования камня"
      />
    </div>
  );
};
