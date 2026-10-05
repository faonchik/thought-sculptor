import React from 'react';
import { Mic, Play, Sparkles, Heart, Check, RotateCcw } from 'lucide-react';
import type { AppMode } from '../types';

interface HeroControlsProps {
  isRecording: boolean;
  onToggleRecord: () => void;
  onTriggerSynthetic: () => void;
  elapsedSeconds: number;
  appMode?: AppMode;
  couplesStep?: 1 | 2;
  partner1Captured?: boolean;
  partner1Pitch?: number;
  partner1MaterialName?: string;
  onResetPartner1?: () => void;
}

export const HeroControls: React.FC<HeroControlsProps> = ({
  isRecording,
  onToggleRecord,
  onTriggerSynthetic,
  appMode = 'solo',
  couplesStep: _couplesStep = 1,
  partner1Captured = false,

  partner1Pitch,
  partner1MaterialName = 'Мрамор',
  onResetPartner1,
}) => {
  if (isRecording) {
    return null;
  }

  const isCouples = appMode === 'couples';

  return (
    <aside className="gallery-plaque screen-dormant" aria-label="Панель записи">
      <div className="plaque-inner">
        {/* Curatorial Header */}
        <div className="plaque-curation-tag">
          <span className="hall-index">
            {isCouples ? 'АКУСТИЧЕСКИЙ ДИПТИХ' : 'ПАРАМЕТРИЧЕСКИЙ СИНТЕЗ'}
          </span>
          <span className="hall-divider">/</span>
          <span className="hall-subject">
            {isCouples ? 'СОЮЗ ДВУХ ГОЛОСОВ' : '3D-МОРФОГЕНЕЗ'}
          </span>
        </div>

        {/* Work Title & Concept */}
        <h2 className="plaque-title">
          {isCouples
            ? !partner1Captured
              ? 'Голос I — Первое дыхание'
              : 'Голос II — Искренний отклик'
            : 'Голос как осязаемая форма'}
        </h2>

        <p className="plaque-description">
          {isCouples
            ? !partner1Captured
              ? 'Произнесите фразу или признание от всего сердца. Алгоритм извлечет спектральный отпечаток вашего голоса и зафиксирует первое крыло союза.'
              : 'Теперь очередь второго партнера ответить взаимностью. Два голоса сольются в сопряженный монолит или сплетутся в двойную гармоническую спираль.'
            : 'Произнесите фразу с естественной интонацией. Спектральный анализ разложит частоты звука и деформирует 2562 вершины монолита в уникальную форму, готовую к экспорту и 3D-печати.'}
        </p>

        {/* Stepper for Couples */}
        {isCouples ? (
          <div className="couples-stepper" role="status" aria-label="Этапы записи пары">
            <div className={`step-node ${!partner1Captured ? 'active' : 'completed'}`}>
              <span className="step-bullet">{partner1Captured ? <Check size={11} /> : '1'}</span>
              <span>Голос I {partner1Captured ? '✓' : ''}</span>
            </div>
            <span className="step-arrow">⟶</span>
            <div className={`step-node ${partner1Captured ? 'active' : ''}`}>
              <span className="step-bullet">2</span>
              <span>Голос II (Отклик)</span>
            </div>
            <span className="step-arrow">⟶</span>
            <div className="step-node">
              <span className="step-bullet"><Heart size={10} /></span>
              <span>Союз</span>
            </div>
          </div>
        ) : (
          /* Process Manifest for Solo */
          <div className="plaque-morph-process">
            <div className="process-node">
              <span className="process-label">01. Вход</span>
              <span className="process-val">Голос и звук</span>
            </div>
            <span className="process-arrow">⟶</span>
            <div className="process-node">
              <span className="process-label">02. Анализ</span>
              <span className="process-val">FFT-спектр</span>
            </div>
            <span className="process-arrow">⟶</span>
            <div className="process-node">
              <span className="process-label">03. Модель</span>
              <span className="process-val">3D-скульптура</span>
            </div>
          </div>
        )}

        {/* Saved Partner 1 Banner if on Step 2 */}
        {isCouples && partner1Captured && (
          <div className="couples-voice1-saved-banner">
            <div className="saved-info-group">
              <Check size={14} />
              <span>Голос I зафиксирован • {partner1Pitch ? `${partner1Pitch} Гц` : 'тембр сохранен'} [{partner1MaterialName}]</span>
            </div>
            {onResetPartner1 && (
              <button
                type="button"
                className="btn-redo-partner1"
                onClick={onResetPartner1}
                title="Перезаписать первый голос заново"
              >
                <RotateCcw size={11} style={{ display: 'inline', marginRight: 3 }} />
                Перезаписать
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="plaque-actions">
          <button
            id="speak-trigger-btn"
            className="plaque-btn-record"
            onClick={onToggleRecord}
            title={
              isCouples
                ? !partner1Captured
                  ? 'Записать Голос 1'
                  : 'Записать Голос 2 (Отклик)'
                : 'Включить микрофон и записать голос'
            }
          >
            <span className="record-terracotta-orb" />
            <Mic size={18} />
            <span className="btn-title-text">
              {isCouples
                ? !partner1Captured
                  ? 'Записать Голос I'
                  : 'Записать Голос II (Отклик)'
                : 'Начать запись голоса'}
            </span>
          </button>

          <button
            id="demo-synth-btn"
            className="plaque-btn-secondary"
            onClick={onTriggerSynthetic}
            title="Создать 3D-модель из тестового звука без микрофона"
          >
            <Play size={14} />
            <span>
              {isCouples
                ? !partner1Captured
                  ? 'Тестовый Голос I (135 Гц • Баритон)'
                  : 'Тестовый Голос II (255 Гц • Сопрано)'
                : 'Тестовый замер (демо 175 Гц)'}
            </span>
          </button>
        </div>

        {/* Practical Hint */}
        <div className="plaque-footnote">
          <Sparkles size={14} className="footnote-icon" />
          <span>
            {isCouples
              ? 'Каждый голос получит свой материал и геометрию, сливаясь в единый монумент.'
              : 'Высокий регистр создает тонкие вертикальные гребни, низкий бас формирует широкое основание.'}
          </span>
        </div>
      </div>
    </aside>
  );
};
