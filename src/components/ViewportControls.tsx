import React from 'react';
import { RotateCw, Eye, Grid3X3, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface ViewportControlsProps {
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  isWireframe: boolean;
  onToggleWireframe: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  isAutoRotate,
  onToggleAutoRotate,
  isWireframe,
  onToggleWireframe,
  showGrid,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onResetCamera,
}) => {
  return (
    <nav className="gallery-camera-bar" aria-label="Панель ракурса и осмотра модели">
      <div className="camera-bar-capsule">
        <span className="camera-bar-label">
          <Compass size={13} className="camera-label-icon" />
          <span>ОБЗОР</span>
        </span>

        <div className="camera-bar-divider" aria-hidden="true" />

        <button
          type="button"
          className={`camera-tool-btn ${isAutoRotate ? 'active' : ''}`}
          onClick={onToggleAutoRotate}
          title={isAutoRotate ? 'Остановить вращение' : 'Вращать подиум со скульптурой'}
          aria-pressed={isAutoRotate}
        >
          <RotateCw size={13} />
          <span>Вращение</span>
        </button>

        <button
          type="button"
          className={`camera-tool-btn ${isWireframe ? 'active' : ''}`}
          onClick={onToggleWireframe}
          title="Сетка полигонов (клавиша W)"
          aria-pressed={isWireframe}
        >
          <Eye size={13} />
          <span>{isWireframe ? 'Каркас' : 'Объем'}</span>
          <kbd className="camera-keycap">W</kbd>
        </button>

        <button
          type="button"
          className={`camera-tool-btn ${showGrid ? 'active' : ''}`}
          onClick={onToggleGrid}
          title="Подиум и разметка (клавиша G)"
          aria-pressed={showGrid}
        >
          <Grid3X3 size={13} />
          <span>Подиум</span>
          <kbd className="camera-keycap">G</kbd>
        </button>

        <div className="camera-bar-divider" aria-hidden="true" />

        <button
          type="button"
          className="camera-tool-btn icon-only"
          onClick={onZoomIn}
          title="Приблизить масштаб (+)"
          aria-label="Приблизить масштаб"
        >
          <ZoomIn size={14} />
        </button>

        <button
          type="button"
          className="camera-tool-btn icon-only"
          onClick={onZoomOut}
          title="Отдалить масштаб (-)"
          aria-label="Отдалить масштаб"
        >
          <ZoomOut size={14} />
        </button>

        <button
          type="button"
          className="camera-tool-btn"
          onClick={onResetCamera}
          title="Сбросить ракурс камеры в центр (клавиша R)"
        >
          <span>Центр</span>
          <kbd className="camera-keycap">R</kbd>
        </button>
      </div>
    </nav>
  );
};
