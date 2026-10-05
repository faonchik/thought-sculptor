import React from 'react';
import { Palette, Box, Check, User, Heart, Layers, Disc3 } from 'lucide-react';
import type { MaterialPresetType, AppMode, CouplesArchetype } from '../types';

interface StudioPreflightPanelProps {
  appMode: AppMode;
  onChangeAppMode: (mode: AppMode) => void;
  couplesArchetype: CouplesArchetype;
  onChangeCouplesArchetype: (arch: CouplesArchetype) => void;
  currentMaterial: MaterialPresetType;
  onChangeMaterial: (mat: MaterialPresetType) => void;
  material2: MaterialPresetType;
  onChangeMaterial2: (mat: MaterialPresetType) => void;
  reliefScale?: '0.8' | '1.0' | '1.4';
  onChangeReliefScale?: (scale: '0.8' | '1.0' | '1.4') => void;
  onParamTweak?: () => void;
}

export const StudioPreflightPanel: React.FC<StudioPreflightPanelProps> = ({
  appMode,
  onChangeAppMode,
  couplesArchetype,
  onChangeCouplesArchetype,
  currentMaterial,
  onChangeMaterial,
  material2,
  onChangeMaterial2,
  reliefScale = '1.0',
  onChangeReliefScale,
  onParamTweak,
}) => {
  const materials: { id: MaterialPresetType; name: string; subtitle: string; swatchHex: string }[] = [
    { id: 'basalt', name: 'Каррарский мрамор', subtitle: 'Шелковистый светлый минерал', swatchHex: '#dfdad0' },
    { id: 'ceramic', name: 'Обожженная терракота', subtitle: 'Теплая пористая глина', swatchHex: '#b55633' },
    { id: 'graphite', name: 'Литейная бронза', subtitle: 'Патинированный теплый металл', swatchHex: '#6e5a44' },
    { id: 'obsidian', name: 'Полированный оникс', subtitle: 'Вулканическое стекло с бликами', swatchHex: '#32353c' },
  ];

  const handleSelectMaterial = (mat: MaterialPresetType) => {
    onChangeMaterial(mat);
    if (onParamTweak) onParamTweak();
  };

  const handleSelectMaterial2 = (mat: MaterialPresetType) => {
    onChangeMaterial2(mat);
    if (onParamTweak) onParamTweak();
  };

  const handleSetRelief = (val: '0.8' | '1.0' | '1.4') => {
    if (onChangeReliefScale) onChangeReliefScale(val);
    if (onParamTweak) onParamTweak();
  };

  return (
    <aside className="atelier-tray" aria-label="Параметры материала и формы">
      {/* Top Segmented Mode Selector: Solo vs Couples */}
      <div className="atelier-mode-selector" role="tablist" aria-label="Режим работы студии">
        <button
          type="button"
          role="tab"
          aria-selected={appMode === 'solo'}
          className={`atelier-mode-btn ${appMode === 'solo' ? 'active' : ''}`}
          onClick={() => onChangeAppMode('solo')}
        >
          <User size={13} />
          <span>Соло (1 голос)</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={appMode === 'couples'}
          className={`atelier-mode-btn ${appMode === 'couples' ? 'active' : ''}`}
          onClick={() => onChangeAppMode('couples')}
        >
          <Heart size={13} className="mode-heart-icon" />
          <span>Для пары (2 голоса)</span>
        </button>
      </div>

      <div className="atelier-header">
        <div className="atelier-title-group">
          <Palette size={15} className="atelier-icon" />
          <h3 className="atelier-heading">
            {appMode === 'couples' ? 'Материалы союза' : 'Материал и форма'}
          </h3>
        </div>
        <span className="atelier-spec-badge">
          <Box size={12} />
          <span>{appMode === 'couples' ? 'Бинарная сетка' : '2562 вершины'}</span>
        </span>
      </div>

      {appMode === 'couples' ? (
        <>
          {/* Couples Archetype Selection */}
          <div className="archetype-selector-group">
            <span className="atelier-section-label">Форма союза</span>
            <div className="archetype-cards-row">
              <button
                type="button"
                className={`archetype-card ${couplesArchetype === 'dyad' ? 'selected' : ''}`}
                onClick={() => {
                  onChangeCouplesArchetype('dyad');
                  if (onParamTweak) onParamTweak();
                }}
              >
                <div className="archetype-card-title">
                  <Layers size={13} />
                  <span>Слияние монолитов</span>
                </div>
                <span className="archetype-card-desc">
                  Два камня вырастают навстречу и срастаются в единое тело
                </span>
              </button>

              <button
                type="button"
                className={`archetype-card ${couplesArchetype === 'helix' ? 'selected' : ''}`}
                onClick={() => {
                  onChangeCouplesArchetype('helix');
                  if (onParamTweak) onParamTweak();
                }}
              >
                <div className="archetype-card-title">
                  <Disc3 size={13} />
                  <span>Спиральное обвивание</span>
                </div>
                <span className="archetype-card-desc">
                  Две изящные ветви обвивают друг друга в двойной спирали
                </span>
              </button>
            </div>
          </div>

          {/* Couples Materials (Partner 1 & Partner 2) */}
          <div className="couples-materials-group">
            <span className="atelier-section-label">Материалы партнёров</span>

            {/* Partner 1 Material */}
            <div className="couples-partner-block">
              <div className="partner-header">
                <span className="partner-tag">
                  <span style={{ color: 'var(--accent-terracotta)' }}>●</span> Голос I (Партнёр 1)
                </span>
                <span className="partner-current-mat">
                  {materials.find((m) => m.id === currentMaterial)?.name}
                </span>
              </div>
              <div className="partner-swatch-row">
                {materials.map((m) => {
                  const isSel = currentMaterial === m.id;
                  return (
                    <button
                      key={`p1_${m.id}`}
                      type="button"
                      className={`partner-swatch-btn ${isSel ? 'selected' : ''}`}
                      onClick={() => handleSelectMaterial(m.id)}
                      title={m.name}
                    >
                      <div className="partner-swatch-dot" style={{ backgroundColor: m.swatchHex }}>
                        {isSel && <Check size={10} color="#fff" />}
                      </div>
                      <span className="partner-swatch-label">{m.name.split(' ')[1] || m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Partner 2 Material */}
            <div className="couples-partner-block">
              <div className="partner-header">
                <span className="partner-tag">
                  <span style={{ color: 'var(--accent-sage)' }}>●</span> Голос II (Партнёр 2)
                </span>
                <span className="partner-current-mat">
                  {materials.find((m) => m.id === material2)?.name}
                </span>
              </div>
              <div className="partner-swatch-row">
                {materials.map((m) => {
                  const isSel = material2 === m.id;
                  return (
                    <button
                      key={`p2_${m.id}`}
                      type="button"
                      className={`partner-swatch-btn ${isSel ? 'selected' : ''}`}
                      onClick={() => handleSelectMaterial2(m.id)}
                      title={m.name}
                    >
                      <div className="partner-swatch-dot" style={{ backgroundColor: m.swatchHex }}>
                        {isSel && <Check size={10} color="#fff" />}
                      </div>
                      <span className="partner-swatch-label">{m.name.split(' ')[1] || m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Solo Material Selection */
        <div className="atelier-mediums">
          <span className="atelier-section-label">Выбор материала</span>
          <div className="atelier-medium-list">
            {materials.map((m) => {
              const isSelected = currentMaterial === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`atelier-medium-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectMaterial(m.id)}
                >
                  <div
                    className="medium-swatch"
                    style={{ backgroundColor: m.swatchHex }}
                  >
                    {isSelected && <Check size={12} className="swatch-check" />}
                  </div>
                  <div className="medium-text">
                    <span className="medium-title">{m.name}</span>
                    <span className="medium-subtitle">{m.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Deformation Strength */}
      <div className="atelier-slider-group">
        <div className="atelier-slider-header">
          <span className="atelier-section-label">Сила деформации</span>
          <span className="atelier-slider-val">{reliefScale}×</span>
        </div>
        <div className="atelier-pills-row" role="group" aria-label="Масштаб рельефа">
          <button
            type="button"
            className={`atelier-pill ${reliefScale === '0.8' ? 'active' : ''}`}
            onClick={() => handleSetRelief('0.8')}
          >
            Мягкая
          </button>
          <button
            type="button"
            className={`atelier-pill ${reliefScale === '1.0' ? 'active' : ''}`}
            onClick={() => handleSetRelief('1.0')}
          >
            Средняя
          </button>
          <button
            type="button"
            className={`atelier-pill ${reliefScale === '1.4' ? 'active' : ''}`}
            onClick={() => handleSetRelief('1.4')}
          >
            Выраженная
          </button>
        </div>
      </div>

      {/* Bottom Specs */}
      <div className="atelier-footer-specs">
        <span className="spec-tag">
          {appMode === 'couples'
            ? couplesArchetype === 'dyad'
              ? 'Бинарный монолит'
              : 'Двойная спираль'
            : 'Икосаэдр • Порядок V'}
        </span>
        <span className="spec-tag">Единый STL для 3D-печати</span>
      </div>
    </aside>
  );
};
