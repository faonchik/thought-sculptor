import React from 'react';
import type * as THREE from 'three';
import { Download, BookmarkPlus, BookmarkCheck, Play, RotateCcw } from 'lucide-react';

import type { AcousticFeatures, MaterialPresetType, AppWorkflowState, ArtefactProfile } from '../../types';
import { ProceduralSculpture } from '../../services/proceduralGeometry';
import { EditorialScene3D } from './EditorialScene3D';
import { TechnicalAcousticOverlay } from './TechnicalAcousticOverlay';
import { exportSculptureToSTL } from '../../services/stlExporter';

interface EditorialStudioProps {
  features: AcousticFeatures | null;
  workflowState: AppWorkflowState;
  materialType: MaterialPresetType;
  onChangeMaterial: (mat: MaterialPresetType) => void;
  onToggleRecord: () => void;
  onTriggerSynthetic: () => void;
  sculptureRef: React.MutableRefObject<ProceduralSculpture | null>;
  meshRef: React.MutableRefObject<THREE.Object3D | null>;
  artefact: ArtefactProfile | null;
  onSaveToArchive: () => void;
  isSavedInArchive: boolean;
  onResetToDormant: () => void;
}

export const EditorialStudio: React.FC<EditorialStudioProps> = ({
  features,
  workflowState,
  materialType,
  onChangeMaterial,
  onToggleRecord,
  onTriggerSynthetic,
  sculptureRef: _sculptureRef,
  meshRef,
  artefact,
  onSaveToArchive,
  isSavedInArchive,
  onResetToDormant,
}) => {
  const [isWireframe, setIsWireframe] = React.useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = React.useState<boolean>(true);
  const [showGrid, setShowGrid] = React.useState<boolean>(true);
  const [zoomDistance, setZoomDistance] = React.useState<number>(5.8);
  const [resetTrigger, setResetTrigger] = React.useState<number>(0);

  const materials: { id: MaterialPresetType; name: string; hex: string; index: string }[] = [
    { id: 'basalt', name: 'Carrara Marble', hex: '#dfdad0', index: '01' },
    { id: 'graphite', name: 'Patinated Bronze', hex: '#6e5a44', index: '02' },
    { id: 'ceramic', name: 'Baked Terracotta', hex: '#b55633', index: '03' },
    { id: 'obsidian', name: 'Polished Onyx', hex: '#32353c', index: '04' },
  ];

  const handleExportSTL = () => {
    if (meshRef.current) {
      const name = artefact?.name || 'Thought_Sculptor_Strata';
      const cleanName = name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
      exportSculptureToSTL(meshRef.current, `${cleanName}_v2.stl`);
    }
  };

  const pitchVal = features && features.pitch > 30 ? Math.round(features.pitch) : 175;
  const rmsVal = features ? features.rms : 0.38;
  const centroidVal = features ? features.spectralCentroid : 0.42;
  const activeMaterialLabel = materials.find((m) => m.id === materialType)?.name || 'Carrara Marble';

  return (
    <main className="editorial-workspace" role="main">
      {/* --------------------------------------------------------------------
          LEFT COLUMN: Document Style Text, Process Wire, Primary Triggers
          -------------------------------------------------------------------- */}
      {/* --------------------------------------------------------------------
          LEFT COLUMN: Document Style Text, Process Wire, Primary Triggers
          -------------------------------------------------------------------- */}
      <section className="ed-column-left" aria-label="Экспликация издания">
        <div>
          {/* Scientific accession code */}
          <div className="ed-plate-meta">
            <span>PLATE N° 01 // ACOUSTIC STRATA</span>
            <span>•</span>
            <span>FIG. A-421</span>
          </div>

          <h2 className="ed-doc-title">
            Reality, <em>by design.</em>
          </h2>

          <p className="ed-doc-paragraph">
            Voice captured as permanent mineral matter. Harmonic spectra transformed into an acoustic monolith ready for stereolithography 3D print.
          </p>

          {/* 3-Step Process Wire Flow: ultra light */}
          <div className="ed-process-wire">
            <div className="ed-wire-item">
              <span className="ed-wire-num">01</span>
              <span className="ed-wire-text">Acoustic Intake</span>
              <span className="ed-wire-sub">Microphone / 48kHz</span>
            </div>
            <div className="ed-wire-item">
              <span className="ed-wire-num">02</span>
              <span className="ed-wire-text">Tensor Morph</span>
              <span className="ed-wire-sub">2562 Vertices</span>
            </div>
            <div className="ed-wire-item">
              <span className="ed-wire-num">03</span>
              <span className="ed-wire-text">Mineral Solid</span>
              <span className="ed-wire-sub">Watertight STL</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="ed-actions-block">
            <button
              type="button"
              className="ed-btn-primary"
              onClick={onToggleRecord}
              title="Включить микрофон и записать звук"
            >
              <span className="rec-orb" />
              <span>
                {workflowState === 'observing' ? 'Зафиксировать замер' : 'Начать замер голоса'}
              </span>
            </button>

            <button
              type="button"
              className="ed-btn-secondary"
              onClick={onTriggerSynthetic}
              title="Создать 3D-модель из тестового звука"
            >
              <Play size={11} strokeWidth={1.5} />
              <span>Тестовый замер (175 Гц • Демо)</span>
            </button>
          </div>
        </div>

        {/* Minimal Footnote Specs */}
        <div className="ed-column-footer">
          <div>SERIES 01 // ACOUSTIC STRATA • SPECIMEN EDITION</div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          CENTER COLUMN: 3D Scene + Scientific Technical SVG Overlay
          -------------------------------------------------------------------- */}
      <section className="ed-column-center" aria-label="3D-Специмен">
        <EditorialScene3D
          features={features}
          isObserving={workflowState === 'observing'}
          workflowState={workflowState}
          materialType={materialType}
          onMeshReady={(mesh) => {
            meshRef.current = mesh;
          }}
          isWireframe={isWireframe}
          isAutoRotate={isAutoRotate}
          showGrid={showGrid}
          zoomDistance={zoomDistance}
          resetTrigger={resetTrigger}
        />

        {/* Technical Calipers, Rings, Angle Ticks & Leader Lines */}
        <TechnicalAcousticOverlay
          features={features}
          pitch={pitchVal}
          rms={rmsVal}
          centroid={centroidVal}
          materialName={activeMaterialLabel}
          isRecording={workflowState === 'observing'}
        />

        {/* Bottom Floating Camera Controls: ultra-compact & semi-transparent */}
        <nav className="ed-camera-toolbar" aria-label="Управление 3D-камерой">
          <button
            type="button"
            className={`ed-cam-btn ${isAutoRotate ? 'active' : ''}`}
            onClick={() => setIsAutoRotate(!isAutoRotate)}
          >
            <span>Auto-Rotate</span>
          </button>
          <span className="ed-cam-sep">/</span>
          <button
            type="button"
            className={`ed-cam-btn ${isWireframe ? 'active' : ''}`}
            onClick={() => setIsWireframe(!isWireframe)}
          >
            <span>Wireframe</span>
          </button>
          <span className="ed-cam-sep">/</span>
          <button
            type="button"
            className={`ed-cam-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
          >
            <span>Grid</span>
          </button>
          <span className="ed-cam-sep">/</span>
          <button
            type="button"
            className="ed-cam-btn"
            onClick={() => setZoomDistance((z) => Math.max(3.8, z - 0.6))}
            title="Приблизить"
          >
            <span>[+]</span>
          </button>
          <button
            type="button"
            className="ed-cam-btn"
            onClick={() => setZoomDistance((z) => Math.min(8.5, z + 0.6))}
            title="Отдалить"
          >
            <span>[-]</span>
          </button>
          <span className="ed-cam-sep">/</span>
          <button
            type="button"
            className="ed-cam-btn"
            onClick={() => setResetTrigger((t) => t + 1)}
            title="Сбросить ракурс"
          >
            <span>Reset</span>
          </button>
        </nav>
      </section>

      {/* --------------------------------------------------------------------
          RIGHT COLUMN: Dense Monospaced Telemetry, Materials & Output
          -------------------------------------------------------------------- */}
      <section className="ed-column-right" aria-label="Телеметрия и материалы">
        <div>
          {/* Telemetry Header */}
          <div className="ed-section-label">
            <span>Acoustic Telemetry</span>
            <span>Live Data</span>
          </div>

          <div className="ed-telemetry-table">
            <div className="ed-telemetry-row">
              <span className="ed-metric-name">F0 Base Frequency</span>
              <span className="ed-metric-dots" />
              <span className="ed-metric-val">{pitchVal} Hz</span>
            </div>

            <div className="ed-telemetry-row">
              <span className="ed-metric-name">Spectral Centroid</span>
              <span className="ed-metric-dots" />
              <span className="ed-metric-val">{Math.round(centroidVal * 4200)} Hz</span>
            </div>

            <div className="ed-telemetry-row">
              <span className="ed-metric-name">RMS Sound Pressure</span>
              <span className="ed-metric-dots" />
              <span className="ed-metric-val">{(rmsVal * 100).toFixed(0)}%</span>
            </div>

            <div className="ed-telemetry-row">
              <span className="ed-metric-name">Spectral Flux</span>
              <span className="ed-metric-dots" />
              <span className="ed-metric-val">{features ? features.spectralFlux.toFixed(3) : '0.245'}</span>
            </div>

            <div className="ed-telemetry-row">
              <span className="ed-metric-name">Zero-Crossing Rate</span>
              <span className="ed-metric-dots" />
              <span className="ed-metric-val">{features ? (features.zeroCrossingRate * 100).toFixed(1) : '16.2'}%</span>
            </div>

            <div className="ed-telemetry-row">
              <span className="ed-metric-name">Harmonic Ratio</span>
              <span className="ed-metric-dots" />
              <span className="ed-metric-val">{features ? (features.harmonicRatio * 100).toFixed(0) : '68'}%</span>
            </div>
          </div>

          {/* Material Mediums Selection */}
          <div className="ed-section-label">
            <span>Mineral Medium</span>
            <span>PBR Spec</span>
          </div>

          <div className="ed-material-list">
            {materials.map((m) => {
              const isSelected = materialType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`ed-mat-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onChangeMaterial(m.id)}
                >
                  <div className="ed-mat-info">
                    <div className="ed-mat-swatch" style={{ backgroundColor: m.hex }} />
                    <span className="ed-mat-name">{m.name}</span>
                  </div>
                  <span className="ed-mat-index">[{m.index}]</span>
                </button>
              );
            })}
          </div>

          {/* Export Output Card */}
          <div className="ed-export-card">
            <h3 className="ed-export-title">Additive Fabrication</h3>
            <p className="ed-export-desc">
              Watertight polygon mesh calculated for stereolithography SLA/SLS 3D printing and stone CNC milling.
            </p>

            <button
              type="button"
              className="ed-btn-outline"
              onClick={handleExportSTL}
              title="Скачать файл STL"
            >
              <Download size={12} strokeWidth={1.5} />
              <span>Download .STL Solid</span>
            </button>
          </div>
        </div>

        {/* Footer Actions: significantly lighter, subtle ghost borders */}
        <div className="ed-footer-secondary-actions">
          <button
            type="button"
            className="ed-btn-ghost-light"
            onClick={onSaveToArchive}
            disabled={isSavedInArchive}
          >
            {isSavedInArchive ? <BookmarkCheck size={12} strokeWidth={1.5} /> : <BookmarkPlus size={12} strokeWidth={1.5} />}
            <span>{isSavedInArchive ? 'Archived in Catalogue' : 'Register to Archive'}</span>
          </button>

          <button
            type="button"
            className="ed-btn-ghost-light"
            onClick={onResetToDormant}
            title="Начать новый замер"
          >
            <RotateCcw size={12} strokeWidth={1.5} />
            <span>New Observation Cycle</span>
          </button>
        </div>
      </section>
    </main>
  );
};
