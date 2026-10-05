import React from 'react';
import { Plus, Database, HelpCircle, Compass, Mic } from 'lucide-react';
import type { AppWorkflowState } from '../types';

export type AppViewMode = 'studio' | 'catalog';

interface HeaderProps {
  workflowState: AppWorkflowState;
  activeView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  onOpenAbout: () => void;
  hallCount: number;
  onReset: () => void;
  onStartRecord?: () => void;
  isCouples?: boolean;
  couplesStep?: 1 | 2;
  partner1Captured?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  workflowState,
  activeView,
  onSelectView,
  onOpenAbout,
  hallCount,
  onReset,
  onStartRecord,
  isCouples = false,
  couplesStep: _couplesStep = 1,
  partner1Captured = false,
}) => {

  const getStatusLabel = () => {
    if (isCouples) {
      if (workflowState === 'observing') {
        return {
          text: !partner1Captured ? 'Запись Голоса I...' : 'Запись Голоса II (Отклик)...',
          stateClass: 'state-recording',
        };
      }
      if (workflowState === 'solidifying') {
        return { text: 'Слияние двух голосов...', stateClass: 'state-processing' };
      }
      if (workflowState === 'artefact') {
        return { text: 'Парный монумент готов', stateClass: 'state-artefact' };
      }
      if (partner1Captured) {
        return { text: 'Голос I зафиксирован • Ждем Голос II', stateClass: 'state-processing' };
      }
      return { text: 'Готов к записи дуэта', stateClass: 'state-idle' };
    }

    switch (workflowState) {
      case 'observing':
        return { text: 'Идёт запись звука...', stateClass: 'state-recording' };
      case 'solidifying':
        return { text: 'Генерация 3D-модели...', stateClass: 'state-processing' };
      case 'artefact':
        return { text: 'Скульптура готова', stateClass: 'state-artefact' };
      default:
        return { text: 'Готов к записи', stateClass: 'state-idle' };
    }
  };


  const status = getStatusLabel();

  return (
    <header className="gallery-header" role="banner">
      {/* Brand Identity */}
      <div className="gallery-brand" onClick={() => onSelectView('studio')}>
        <div className="brand-monogram">
          <span>TS</span>
        </div>
        <div className="brand-textual">
          <div className="brand-row">
            <h1 className="gallery-title">Thought Sculptor</h1>
            <span className={`curatorial-status ${status.stateClass}`}>
              <span className="curatorial-dot" />
              {status.text}
            </span>
          </div>
          <p className="gallery-curation-note">
            Преобразование звука и спектра голоса в 3D-скульптуру
          </p>
        </div>
      </div>

      {/* Navigation & Actions */}
      <nav className="gallery-nav" aria-label="Главная навигация">
        <div className="gallery-nav-pills" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'studio'}
            className={`gallery-nav-pill ${activeView === 'studio' ? 'active' : ''}`}
            onClick={() => onSelectView('studio')}
            title="Перейти в 3D-студию"
          >
            <Compass size={14} />
            <span>3D-Студия</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'catalog'}
            className={`gallery-nav-pill ${activeView === 'catalog' ? 'active' : ''}`}
            onClick={() => onSelectView('catalog')}
            title="Открыть каталог сохранённых моделей"
          >
            <Database size={14} />
            <span>Каталог моделей</span>
            <span className="gallery-count-tag">{hallCount}</span>
          </button>
        </div>

        {/* Primary Action Button */}
        <button
          id="global-new-specimen-btn"
          className="gallery-btn-primary"
          onClick={() => {
            onSelectView('studio');
            if (workflowState === 'artefact') {
              onReset();
            } else if (workflowState === 'dormant' && onStartRecord) {
              onStartRecord();
            }
          }}
          title={workflowState === 'artefact' ? 'Создать новую скульптуру' : 'Начать запись голоса'}
        >
          {workflowState === 'artefact' ? <Plus size={15} /> : <Mic size={15} />}
          <span>{workflowState === 'artefact' ? 'Новый замер' : 'Записать голос'}</span>
        </button>

        <button
          id="open-about-btn"
          className="gallery-btn-text"
          onClick={onOpenAbout}
          title="Как устроен алгоритм преобразования звука в 3D"
        >
          <HelpCircle size={14} />
          <span>О проекте</span>
        </button>
      </nav>
    </header>
  );
};
