import React, { useState, useEffect } from 'react';

export const SolidificationMoment: React.FC = () => {
  const [logLines, setLogLines] = useState<string[]>([]);

  const fullLogs = [
    '[0.12s] Инициализация базового сферического каркаса (2562V / 5120F)...',
    '[0.58s] FFT дескрипторы: зафиксировано 18 временных срезов частотного спектра.',
    '[1.24s] Модуляция вершин: 3D-шум Перлина модулирован по F0 и спектральному центроиду.',
    '[1.92s] Сглаживание: локальный перегиб на полигоне #1420 нивелирован нормалями.',
    '[2.65s] Верификация замкнутости сетки (Manifold topology check: PASS).',
    '[3.20s] Запекание полигональной геометрии. Формирование лабораторного паспорта...',
  ];

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < fullLogs.length) {
        const nextLine = fullLogs[currentIdx];
        setLogLines((prev) => [...prev, nextLine]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 550);

    return () => clearInterval(interval);
  }, [fullLogs.length]);

  return (
    <div className="screen-solidifying">
      <div className="terminal-calc-panel">
        <div className="terminal-top-bar">
          <span className="term-indicator" />
          <span className="term-title">DSP-CALC // МАТЕМАТИЧЕСКАЯ ТРИАНГУЛЯЦИЯ</span>
          <span className="term-pid">PID: 4182</span>
        </div>

        <div className="terminal-log-body">
          {logLines.map((line, idx) => (
            <div key={idx} className="terminal-log-row">
              <span className="log-arrow">&gt;</span>
              <span className="log-text">{line}</span>
            </div>
          ))}
          <div className="terminal-cursor-row">
            <span className="log-arrow">&gt;</span>
            <span className="cursor-blink">█</span>
          </div>
        </div>

        <div className="term-progress-track">
          <div
            className="term-progress-fill"
            style={{ width: `${(logLines.length / fullLogs.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
