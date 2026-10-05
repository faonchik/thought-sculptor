import React from 'react';


interface EditorialHeaderProps {
  activeView: 'studio' | 'archive';
  onSelectView: (view: 'studio' | 'archive') => void;
  hallCount: number;
  isRecording: boolean;
  onSwitchToV1: () => void;
}

export const EditorialHeader: React.FC<EditorialHeaderProps> = ({
  activeView,
  onSelectView,
  hallCount,
  isRecording,
  onSwitchToV1,
}) => {
  return (
    <header className="ed-header" role="banner">
      {/* Brand Identity */}
      <div className="ed-header-brand" onClick={() => onSelectView('studio')}>
        <span className="ed-monogram">TS</span>
        <h1 className="ed-brand-title">Thought Sculptor</h1>
        <span className="ed-brand-thesis">Acoustic Morphogenesis</span>
      </div>

      {/* Navigation Tabs */}
      <nav className="ed-header-center" aria-label="Разделы издания">
        <button
          type="button"
          className={`ed-nav-link ${activeView === 'studio' ? 'active' : ''}`}
          onClick={() => onSelectView('studio')}
        >
          <span>Atelier [Студия]</span>
        </button>

        <button
          type="button"
          className={`ed-nav-link ${activeView === 'archive' ? 'active' : ''}`}
          onClick={() => onSelectView('archive')}
        >
          <span>Archive [Каталог]</span>
          <span className="ed-nav-count">({hallCount})</span>
        </button>
      </nav>

      {/* Telemetry Status Strip */}
      <div className="ed-header-right">
        <div className="ed-telemetry-badge">
          <span className={`ed-status-dot ${isRecording ? 'active' : ''}`} />
          <span>{isRecording ? 'STREAMING // FFT ACTIVE' : 'SYSTEM // ARMED READY'}</span>
        </div>
      </div>

      {/* Parallel Version Switcher Pill */}
      <div className="version-switcher-pill" title="Переключить вариант дизайна">
        <span className="version-label">Дизайн:</span>
        <button
          type="button"
          className="version-toggle-btn"
          onClick={onSwitchToV1}
          title="Вернуться к классической галерее V1"
        >
          V1 Галерея
        </button>
        <button
          type="button"
          className="version-toggle-btn active"
          title="Текущая научная монография V2"
        >
          V2 Монография
        </button>
      </div>
    </header>
  );
};
