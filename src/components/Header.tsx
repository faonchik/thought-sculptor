import React from 'react';
import type { AppWorkflowState } from '../types';

interface HeaderProps {
  workflowState: AppWorkflowState;
  onOpenAbout: () => void;
  onOpenHall: () => void;
  hallCount: number;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workflowState,
  onOpenAbout,
  onOpenHall,
  hallCount,
  onReset,
}) => {
  const getStatusText = () => {
    switch (workflowState) {
      case 'observing':
        return 'ИДЁТ ЗАХВАТ СИГНАЛА [CH-A REC]';
      case 'solidifying':
        return 'ВЫЧИСЛЕНИЕ ДЕФОРМАЦИЙ МЕША...';
      case 'artefact':
        return 'ОБРАЗЕЦ СФОРМИРОВАН // ЗАПИСАНО В ПАСПОРТ';
      default:
        return 'СТЕНД ГОТОВ К ИЗМЕРЕНИЮ [STANDBY]';
    }
  };

  return (
    <header className="top-header" role="banner">
      <div className="brand-meta">
        <div className="hardware-tag-row">
          <span className="hardware-id">СТЕНД №4-АКУСТИКА</span>
          <span className="hardware-divider">/</span>
          <span className="hardware-spec">DSP-МОДУЛЬ v2.4</span>
          <span className="hardware-divider">/</span>
          <span className="hardware-status-live">{getStatusText()}</span>
        </div>
        <h1 className="brand-title">Thought Sculptor</h1>
        <div className="brand-subtitle">
          Процедурная литоморфология по акустическому спектру
        </div>
      </div>

      <nav className="nav-links" aria-label="Панель прибора">
        <button
          id="open-archive-btn"
          className="nav-btn nav-btn-hall"
          onClick={onOpenHall}
          title="Открыть журнал лабораторных образцов"
        >
          <span className="nav-icon">▤</span>
          <span>Журнал образцов</span>
          <span className="nav-badge" aria-label={`Зафиксировано: ${hallCount}`}>
            {hallCount}
          </span>
        </button>

        {workflowState === 'artefact' && (
          <button
            id="new-specimen-btn"
            className="nav-btn nav-btn-action"
            onClick={onReset}
            title="Сбросить стенд и начать новый замер"
          >
            ↺ Новый замер
          </button>
        )}

        <button
          id="open-about-btn"
          className="nav-btn"
          onClick={onOpenAbout}
          title="Техническая методика и математический аппарат"
        >
          [?] Методика
        </button>
      </nav>
    </header>
  );
};
