import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type {
  AppWorkflowState,
  AcousticFeatures,
  ArtefactProfile,
  MaterialPresetType,
  AcousticTraceSnapshot,
  VoiceDNA,
  AppMode,
  CouplesArchetype,
} from './types';
import { AudioEngine } from './services/audioEngine';
import { ProceduralSculpture } from './services/proceduralGeometry';
import { createSculptureMaterial } from './services/materialPresets';
import { generateArtefactProfile, generateCouplesArtefactProfile } from './services/artifactGenerator';
import { getHallSpecimens, addHallSpecimen, isSpecimenInHall, type HallSpecimen } from './services/hallStorage';
import { Header, type AppViewMode } from './components/Header';
import { SculptureScene } from './components/SculptureScene';
import { ViewportControls } from './components/ViewportControls';
import { HeroControls } from './components/HeroControls';
import { StudioPreflightPanel } from './components/StudioPreflightPanel';
import { ObservationHud } from './components/ObservationHud';
import { SolidificationMoment } from './components/SolidificationMoment';
import { ResultPanel } from './components/ResultPanel';
import { AboutModal } from './components/AboutModal';
import { HallOfSpecimens } from './components/HallOfSpecimens';

interface RecordedPartnerVoice {
  dna: VoiceDNA;
  features: AcousticFeatures;
  duration: number;
  blobUrl?: string;
}

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppViewMode>('studio');
  const [workflowState, setWorkflowState] = useState<AppWorkflowState>('dormant');
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [hallCount, setHallCount] = useState<number>(0);
  const [isCurrentExhibited, setIsCurrentExhibited] = useState<boolean>(false);
  const [currentFeatures, setCurrentFeatures] = useState<AcousticFeatures | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [artefact, setArtefact] = useState<ArtefactProfile | null>(null);

  // Materials & Mode
  const [appMode, setAppMode] = useState<AppMode>('solo');
  const [couplesArchetype, setCouplesArchetype] = useState<CouplesArchetype>('dyad');
  const [materialType, setMaterialType] = useState<MaterialPresetType>('basalt');
  const [materialType2, setMaterialType2] = useState<MaterialPresetType>('graphite');

  // Couples 2-Step Recording state
  const [couplesStep, setCouplesStep] = useState<1 | 2>(1);
  const [partner1Voice, setPartner1Voice] = useState<RecordedPartnerVoice | null>(null);

  // 3D Viewport Controls state
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoomDistance, setZoomDistance] = useState<number>(6.2);
  const [resetCameraTrigger, setResetCameraTrigger] = useState<number>(0);
  const [reliefScale, setReliefScale] = useState<'0.8' | '1.0' | '1.4'>('1.0');

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const meshRef = useRef<THREE.Object3D | null>(null);
  const sculptureRef = useRef<ProceduralSculpture | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setHallCount(getHallSpecimens().length);
    audioEngineRef.current = new AudioEngine();
    audioEngineRef.current.setOnSnapshotTrigger(() => {
      sculptureRef.current?.recordCarveSnapshot();
    });
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= 29) {
          stopRecordingAndSolidify();
          return 30;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleToggleRecord = async () => {
    setActiveView('studio');
    if (workflowState === 'dormant' || workflowState === 'artefact') {
      if (!audioEngineRef.current) return;

      if (appMode === 'solo' || !partner1Voice) {
        if (sculptureRef.current) {
          sculptureRef.current.resetToDormant();
        }
        setArtefact(null);
        setCurrentFeatures(null);
        setIsCurrentExhibited(false);
      }

      setElapsedSeconds(0);
      setWorkflowState('observing');
      startTimer();
      sculptureRef.current?.recordCarveSnapshot();

      await audioEngineRef.current.startMicrophone((features) => {
        setCurrentFeatures(features);
      });
    } else if (workflowState === 'observing') {
      stopRecordingAndSolidify();
    }
  };

  const handleTriggerSynthetic = async () => {
    setActiveView('studio');
    if (!audioEngineRef.current) return;

    if (appMode === 'solo' || !partner1Voice) {
      if (sculptureRef.current) {
        sculptureRef.current.resetToDormant();
      }
      setArtefact(null);
      setCurrentFeatures(null);
      setIsCurrentExhibited(false);
    }

    setElapsedSeconds(0);
    setWorkflowState('observing');
    startTimer();
    sculptureRef.current?.recordCarveSnapshot();

    await audioEngineRef.current.startSyntheticVoice((features) => {
      setCurrentFeatures(features);
    });

    setTimeout(() => {
      stopRecordingAndSolidify();
    }, 10000);
  };

  const stopRecordingAndSolidify = async () => {
    stopTimer();

    if (!audioEngineRef.current) return;

    const numScale = parseFloat(reliefScale) || 1.0;
    const result = await audioEngineRef.current.stop(numScale);
    const fallbackPitch = appMode === 'couples' && partner1Voice ? 245 : 175;
    const finalFeatures: AcousticFeatures = currentFeatures || {
      rms: 0.45,
      pitch: fallbackPitch,
      normalizedPitch: Math.max(0, Math.min(1, (fallbackPitch - 80) / 360)),
      spectralCentroid: 0.4,
      spectralSpread: 0.35,
      spectralFlatness: 0.24,
      spectralRolloff: 0.42,
      spectralFlux: 0.35,
      zeroCrossingRate: 0.16,
      harmonicRatio: 0.65,
      temporalVariability: 0.25,
      lowEnergy: 0.55,
      midEnergy: 0.42,
      highEnergy: 0.32,
      isSilent: false,
      speechRate: 0.5,
      mood: result.voiceDNA.dominantMood,
    };

    // Couples Step 1 finished -> save Voice 1 and wait for Voice 2
    if (appMode === 'couples' && !partner1Voice) {
      setPartner1Voice({
        dna: result.voiceDNA,
        features: finalFeatures,
        duration: result.duration,
        blobUrl: result.audioBlobUrl,
      });
      setCouplesStep(2);
      setWorkflowState('dormant');
      return;
    }

    // Couples Step 2 finished (or Solo) -> Solidify final 3D artefact
    setWorkflowState('solidifying');

    if (appMode === 'couples' && partner1Voice) {
      // Build Couples Artefact Profile
      const newArtefact = generateCouplesArtefactProfile(
        partner1Voice.duration,
        partner1Voice.features,
        partner1Voice.dna,
        materialType,
        'Он / Партнёр I',
        partner1Voice.blobUrl,
        result.duration,
        finalFeatures,
        result.voiceDNA,
        materialType2,
        'Она / Партнёр II',
        result.audioBlobUrl,
        couplesArchetype
      );

      if (sculptureRef.current) {
        sculptureRef.current.crystallizeCouplesArtefact(
          partner1Voice.dna,
          partner1Voice.features,
          result.voiceDNA,
          finalFeatures,
          couplesArchetype,
          materialType,
          materialType2
        );
      }

      setTimeout(() => {
        setArtefact(newArtefact);
        setIsCurrentExhibited(isSpecimenInHall(newArtefact.id));
        setWorkflowState('artefact');
      }, 3500);
    } else {
      // Solo Artefact Profile
      const newArtefact = generateArtefactProfile(
        result.duration,
        finalFeatures,
        result.voiceDNA,
        result.snapshots,
        result.audioBlobUrl
      );

      if (sculptureRef.current) {
        sculptureRef.current.crystallizeUniqueArtefact(result.voiceDNA, finalFeatures);
      }

      setTimeout(() => {
        setArtefact(newArtefact);
        setMaterialType(newArtefact.material);
        setIsCurrentExhibited(isSpecimenInHall(newArtefact.id));
        setWorkflowState('artefact');
      }, 3500);
    }
  };

  const handleResetPartner1 = () => {
    setPartner1Voice(null);
    setCouplesStep(1);
    if (sculptureRef.current) {
      sculptureRef.current.resetToDormant();
    }
  };

  const handleChangeCouplesArchetype = (newArch: CouplesArchetype) => {
    setCouplesArchetype(newArch);
    if (artefact && artefact.isCouples && sculptureRef.current && artefact.partner1 && artefact.partner2) {
      artefact.couplesArchetype = newArch;
      sculptureRef.current.crystallizeCouplesArtefact(
        artefact.partner1.voiceDNA,
        artefact.partner1.features,
        artefact.partner2.voiceDNA,
        artefact.partner2.features,
        newArch,
        materialType,
        materialType2
      );
    }
  };

  const handleChangeMaterial = (mat: MaterialPresetType) => {
    setMaterialType(mat);
    if (artefact) {
      artefact.material = mat;
    }
    if (sculptureRef.current && sculptureRef.current.mesh) {
      sculptureRef.current.mesh.material = createSculptureMaterial(mat);
    }
  };

  const handleChangeMaterial2 = (mat: MaterialPresetType) => {
    setMaterialType2(mat);
    if (artefact) {
      artefact.material2 = mat;
    }
    if (sculptureRef.current && sculptureRef.current.mesh2) {
      sculptureRef.current.mesh2.material = createSculptureMaterial(mat);
    }
  };

  const handleExhibitInHall = () => {
    if (!artefact) return;
    let thumbUrl: string | undefined;
    try {
      const canvas = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
      if (canvas) {
        thumbUrl = canvas.toDataURL('image/webp', 0.85);
      }
    } catch {
      // fallback
    }
    const authorLabel = artefact.isCouples
      ? `${artefact.partner1?.name || 'Партнёр 1'} & ${artefact.partner2?.name || 'Партнёр 2'}`
      : 'Авторский образец';
    addHallSpecimen(artefact, authorLabel, thumbUrl);
    setIsCurrentExhibited(true);
    setHallCount(getHallSpecimens().length);
  };

  const handleInspectSpecimen = (specimen: HallSpecimen) => {
    const pitchVal = specimen.avgPitch || (specimen.macroType === 'spire' ? 285 : specimen.macroType === 'disc' ? 95 : 175);
    const simulatedVoiceDNA: VoiceDNA = {
      avgPitch: pitchVal,
      avgCentroid: 0.38,
      avgSpread: 0.35,
      avgFlatness: specimen.dominantMood?.mood === 'mysterious' ? 0.38 : 0.22,
      avgRolloff: specimen.macroType === 'spire' ? 0.70 : 0.40,
      avgZcr: specimen.dominantMood?.mood === 'angry' ? 0.35 : 0.16,
      avgHarmonicRatio: specimen.macroType === 'teardrop' ? 0.80 : 0.65,
      temporalVariability: 0.25,
      lowBandRatio: specimen.macroType === 'disc' ? 0.65 : 0.40,
      midBandRatio: 0.40,
      highBandRatio: specimen.macroType === 'spire' ? 0.55 : 0.30,
      peakRms: specimen.dominantMood?.mood === 'angry' ? 0.85 : 0.45,
      avgFlux: 0.35,
      uniqueSeed: specimen.uniqueSeed || 42100,
      signatureHash: specimen.uniqueSeed || 42100,
      dominantMood: specimen.dominantMood,
      morphStrategy: specimen.macroType === 'spire'
        ? 'spire'
        : specimen.macroType === 'disc'
        ? 'monolith'
        : specimen.macroType === 'crescent'
        ? 'crest'
        : specimen.macroType === 'teardrop'
        ? 'organic'
        : 'asymmetric',
      expressionScale: 1.0,
    };

    const simulatedFeatures: AcousticFeatures = {
      rms: 0.5,
      pitch: pitchVal,
      normalizedPitch: Math.max(0, Math.min(1, (pitchVal - 80) / 360)),
      spectralCentroid: 0.4,
      spectralSpread: 0.35,
      spectralFlatness: 0.22,
      spectralRolloff: 0.42,
      spectralFlux: 0.35,
      zeroCrossingRate: 0.16,
      harmonicRatio: 0.65,
      temporalVariability: 0.25,
      lowEnergy: 0.5,
      midEnergy: 0.5,
      highEnergy: 0.3,
      isSilent: false,
      speechRate: 0.5,
      mood: specimen.dominantMood,
    };

    if (specimen.isCouples) {
      const p1 = specimen.partner1Pitch || 125;
      const p2 = specimen.partner2Pitch || 245;
      const dna1: VoiceDNA = { ...simulatedVoiceDNA, avgPitch: p1, lowBandRatio: 0.58, uniqueSeed: specimen.uniqueSeed || 33110 };
      const feat1: AcousticFeatures = { ...simulatedFeatures, pitch: p1 };
      const dna2: VoiceDNA = { ...simulatedVoiceDNA, avgPitch: p2, highBandRatio: 0.58, uniqueSeed: (specimen.uniqueSeed || 33110) + 99 };
      const feat2: AcousticFeatures = { ...simulatedFeatures, pitch: p2 };

      if (sculptureRef.current) {
        sculptureRef.current.crystallizeCouplesArtefact(
          dna1,
          feat1,
          dna2,
          feat2,
          specimen.couplesArchetype || 'dyad',
          specimen.material,
          specimen.material2 || 'graphite'
        );
      }

      const simulatedArtefact: ArtefactProfile = {
        ...specimen,
        duration: 8.5,
        finalFeatures: feat1,
        voiceDNA: dna1,
        dominantMood: specimen.dominantMood,
        snapshots: [],
        survivalYears: specimen.survivalYears,
        audioDuration: 8.5,
        isCouples: true,
        couplesArchetype: specimen.couplesArchetype || 'dyad',
        material: specimen.material,
        material2: specimen.material2 || 'graphite',
        partner1: {
          name: specimen.partner1Name || 'Партнёр I',
          material: specimen.material,
          voiceDNA: dna1,
          features: feat1,
          duration: 4.2,
        },
        partner2: {
          name: specimen.partner2Name || 'Партнёр II',
          material: specimen.material2 || 'graphite',
          voiceDNA: dna2,
          features: feat2,
          duration: 4.3,
        },
      };

      setAppMode('couples');
      setCouplesArchetype(specimen.couplesArchetype || 'dyad');
      setMaterialType(specimen.material);
      setMaterialType2(specimen.material2 || 'graphite');
      setArtefact(simulatedArtefact);
      setIsCurrentExhibited(true);
      setWorkflowState('artefact');
      setActiveView('studio');
      return;
    }

    const simulatedArtefact: ArtefactProfile = {
      ...specimen,
      duration: 6.8,
      finalFeatures: simulatedFeatures,
      voiceDNA: simulatedVoiceDNA,
      dominantMood: specimen.dominantMood,
      snapshots: [],
      survivalYears: specimen.survivalYears,
      audioDuration: 6.8,
      isCouples: false,
    };

    if (sculptureRef.current) {
      sculptureRef.current.crystallizeUniqueArtefact(simulatedVoiceDNA, simulatedFeatures, specimen.macroType);
    }

    setAppMode('solo');
    setMaterialType(specimen.material);
    setArtefact(simulatedArtefact);
    setIsCurrentExhibited(true);
    setWorkflowState('artefact');
    setActiveView('studio');
  };

  const handleApplyMoodColor = () => {
    if (artefact && sculptureRef.current) {
      const colorHex = artefact.dominantMood?.colorHex || '#d4af37';
      const col = new THREE.Color(colorHex);
      if (sculptureRef.current.mesh.material) {
        const mat = sculptureRef.current.mesh.material as THREE.MeshStandardMaterial;
        mat.color.copy(col);
      }
    }
  };

  const handleTimelineProgress = (progress: number) => {
    if (sculptureRef.current && !sculptureRef.current.isCouples) {
      sculptureRef.current.setTimelineProgress(progress);
    }
  };

  const handleSelectSnapshot = (snapshot: AcousticTraceSnapshot) => {
    if (sculptureRef.current && !sculptureRef.current.isCouples) {
      sculptureRef.current.showSnapshotByIndex(snapshot.index);
    }
  };

  const handleResetToFinal = () => {
    if (sculptureRef.current && !sculptureRef.current.isCouples) {
      sculptureRef.current.showFinalArtefact();
    }
  };

  const handleReset = () => {
    if (sculptureRef.current) {
      sculptureRef.current.resetToDormant();
    }
    setArtefact(null);
    setPartner1Voice(null);
    setCouplesStep(1);
    setCurrentFeatures(null);
    setElapsedSeconds(0);
    setIsCurrentExhibited(false);
    setWorkflowState('dormant');
    setActiveView('studio');
  };

  // 3D Viewport Controls handlers
  const handleToggleAutoRotate = useCallback(() => {
    setIsAutoRotate((prev) => !prev);
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setIsWireframe((prev) => !prev);
  }, []);

  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomDistance((prev) => Math.max(3.2, prev - 0.7));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomDistance((prev) => Math.min(10.5, prev + 0.7));
  }, []);

  const handleResetCamera = useCallback(() => {
    setResetCameraTrigger((prev) => prev + 1);
  }, []);

  // Keyboard shortcut listener: Space to toggle record
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      if (isInput) return;

      if (e.code === 'Space' && activeView === 'studio') {
        e.preventDefault();
        handleToggleRecord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, workflowState, partner1Voice, appMode]);

  const recordingHudLabel = appMode === 'couples'
    ? !partner1Voice
      ? 'Голос I (Партнёр 1) • Запись звука'
      : 'Голос II (Партнёр 2) • Запись отклика'
    : 'Запись звука';

  return (
    <div className="app-container">
      <SculptureScene
        features={workflowState === 'observing' ? currentFeatures : null}
        isObserving={workflowState === 'observing'}
        workflowState={workflowState}
        materialType={materialType}
        onMeshReady={(mesh) => {
          meshRef.current = mesh;
        }}
        sculptureRef={sculptureRef}
        isWireframe={isWireframe}
        isAutoRotate={isAutoRotate}
        showGrid={showGrid}
        zoomDistance={zoomDistance}
        resetTrigger={resetCameraTrigger}
      />

      <div className="ui-layer">
        <Header
          workflowState={workflowState}
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenAbout={() => setIsAboutOpen(true)}
          hallCount={hallCount}
          onReset={handleReset}
          onStartRecord={handleToggleRecord}
          isCouples={appMode === 'couples'}
          couplesStep={couplesStep}
          partner1Captured={!!partner1Voice}
        />

        {activeView === 'studio' && (
          <>
            {/* Floating 3D Viewport Controls toolbar */}
            {(workflowState === 'dormant' || workflowState === 'artefact') && (
              <ViewportControls
                isAutoRotate={isAutoRotate}
                onToggleAutoRotate={handleToggleAutoRotate}
                isWireframe={isWireframe}
                onToggleWireframe={handleToggleWireframe}
                showGrid={showGrid}
                onToggleGrid={handleToggleGrid}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetCamera={handleResetCamera}
              />
            )}

            {workflowState === 'observing' && (
              <ObservationHud
                features={currentFeatures}
                elapsedSeconds={elapsedSeconds}
                onStopRecording={stopRecordingAndSolidify}
                recordingLabel={recordingHudLabel}
              />
            )}

            {workflowState === 'solidifying' && (
              <SolidificationMoment
                isCouples={appMode === 'couples'}
                couplesArchetype={couplesArchetype}
              />
            )}

            {workflowState === 'dormant' && (
              <>
                <HeroControls
                  isRecording={false}
                  onToggleRecord={handleToggleRecord}
                  onTriggerSynthetic={handleTriggerSynthetic}
                  elapsedSeconds={elapsedSeconds}
                  appMode={appMode}
                  couplesStep={couplesStep}
                  partner1Captured={!!partner1Voice}
                  partner1Pitch={partner1Voice ? Math.round(partner1Voice.features.pitch) : undefined}
                  partner1MaterialName={materialType === 'basalt' ? 'Мрамор' : materialType === 'ceramic' ? 'Терракота' : materialType === 'graphite' ? 'Бронза' : 'Оникс'}
                  onResetPartner1={handleResetPartner1}
                />
                <StudioPreflightPanel
                  appMode={appMode}
                  onChangeAppMode={setAppMode}
                  couplesArchetype={couplesArchetype}
                  onChangeCouplesArchetype={setCouplesArchetype}
                  currentMaterial={materialType}
                  onChangeMaterial={handleChangeMaterial}
                  material2={materialType2}
                  onChangeMaterial2={handleChangeMaterial2}
                  reliefScale={reliefScale}
                  onChangeReliefScale={(s) => setReliefScale(s)}
                />
              </>
            )}

            {workflowState === 'artefact' && artefact && (
              <ResultPanel
                artefact={artefact}
                meshRef={meshRef}
                currentMaterial={materialType}
                material2={materialType2}
                onChangeMaterial={handleChangeMaterial}
                onChangeMaterial2={handleChangeMaterial2}
                onApplyMoodColor={handleApplyMoodColor}
                onTimelineProgress={handleTimelineProgress}
                onExhibitInHall={handleExhibitInHall}
                isExhibitedInHall={isCurrentExhibited}
                onSelectSnapshot={handleSelectSnapshot}
                onResetToFinal={handleResetToFinal}
                onResurrect={handleReset}
                couplesArchetype={couplesArchetype}
                onChangeCouplesArchetype={handleChangeCouplesArchetype}
              />
            )}
          </>
        )}
      </div>

      {activeView === 'catalog' && (
        <HallOfSpecimens
          onClose={() => setActiveView('studio')}
          onInspectSpecimen={handleInspectSpecimen}
          onNewMeasurement={handleReset}
        />
      )}

      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
    </div>
  );
};

export default App;
