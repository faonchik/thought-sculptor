import React, { useState, useEffect } from 'react';
import { Sparkles, Heart } from 'lucide-react';
import type { CouplesArchetype } from '../types';

interface SolidificationMomentProps {
  isCouples?: boolean;
  couplesArchetype?: CouplesArchetype;
}

export const SolidificationMoment: React.FC<SolidificationMomentProps> = ({
  isCouples = false,
  couplesArchetype = 'dyad',
}) => {
  const [stepIdx, setStepIdx] = useState<number>(0);

  const soloSteps = [
    'Анализ частотного спектра и динамики звука...',
    'Деформация 2562 вершин полигональной сетки...',
    'Сглаживание микрорельефа нормалей...',
    'Финальное запекание 3D-модели...',
  ];

  const couplesSteps = [
    'Анализ частотного резонанса двух голосов...',
    couplesArchetype === 'dyad'
      ? 'Построение сопряженного контакта двух монолитов...'
      : 'Сплетение парных ветвей в двойную гармоническую спираль...',
    'Согласование светотени и фактуры выбранных материалов...',
    'Финальное запекание парного монумента любви...',
  ];

  const steps = isCouples ? couplesSteps : soloSteps;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 750);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="screen-crystallization">
      <div className="crystallization-card">
        <div className="crystallization-icon-wrap">
          {isCouples ? (
            <Heart size={24} className="crystallization-sparkle" style={{ color: '#e11d48' }} />
          ) : (
            <Sparkles size={24} className="crystallization-sparkle" />
          )}
        </div>

        <h3 className="crystallization-title">
          {isCouples ? 'Рождение союза двух голосов' : 'Построение 3D-модели'}
        </h3>

        <p className="crystallization-current-step">
          {steps[stepIdx]}
        </p>

        {/* Minimalist progress line */}
        <div className="crystallization-progress-track">
          <div
            className="crystallization-progress-fill"
            style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="crystallization-curator-note">
          {isCouples
            ? 'Пожалуйста, подождите. Голоса соединяются в единое осязаемое произведение.'
            : 'Пожалуйста, подождите. Идет расчет смещения вершин и топологии.'}
        </div>
      </div>
    </div>
  );
};
