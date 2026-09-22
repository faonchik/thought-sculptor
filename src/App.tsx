import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { AppWorkflowState, AcousticFeatures, ArtefactProfile, MaterialPresetType, AcousticTraceSnapshot, VoiceDNA } from './types';
import { AudioEngine } from './services/audioEngine';
import { ProceduralSculpture } from './services/proceduralGeometry';
import { generateArtefactProfile } from './services/artifactGenerator';
import { getHallSpecimens, addHallSpecimen, isSpecimenInHall, type HallSpecimen } from './services/hallStorage';
import { Header } from './components/Header';
import { SculptureScene } from './components/SculptureScene';
import { HeroControls } from './components/HeroControls';
import { ObservationHud } from './components/ObservationHud';
import { SolidificationMoment } from './components/SolidificationMoment';
import { ResultPanel } from './components/ResultPanel';
import { AboutModal } from './components/AboutModal';
import { HallOfSpecimens } from './components/HallOfSpecimens';

export const App: React.FC = () => {
  const [workflowState, setWorkflowState] = useState<AppWorkflowState>('dormant');
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isHallOpen, setIsHallOpen] = useState<boolean>(false);
  const [hallCount, setHallCount] = useState<number>(0);
  const [isCurrentExhibited, setIsCurrentExhibited] = useState<boolean>(false);
  const [currentFeatures, setCurrentFeatures] = useState<AcousticFeatures | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [artefact, setArtefact] = useState<ArtefactProfile | null>(null);
  const [materialType, setMaterialType] = useState<MaterialPresetType>('basalt');

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
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
    if (workflowState === 'dormant' || workflowState === 'artefact') {
      if (!audioEngineRef.current) return;
      if (sculptureRef.current) {
        sculptureRef.current.resetToDormant();
      }
      setArtefact(null);
      setCurrentFeatures(null);
      setElapsedSeconds(0);
      setIsCurrentExhibited(false);
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
    if (!audioEngineRef.current) return;
    if (sculptureRef.current) {
      sculptureRef.current.resetToDormant();
    }
    setArtefact(null);
    setCurrentFeatures(null);
    setElapsedSeconds(0);
    setIsCurrentExhibited(false);
    setWorkflowState('observing');
    startTimer();
    sculptureRef.current?.recordCarveSnapshot();

    await audioEngineRef.current.startSyntheticVoice((features) => {
      setCurrentFeatures(features);
    });

    setTimeout(() => {
      stopRecordingAndSolidify();
    }, 12000);
  };

  const stopRecordingAndSolidify = async () => {
    stopTimer();
    setWorkflowState('solidifying');

    if (audioEngineRef.current) {
      const result = await audioEngineRef.current.stop();
      const finalFeatures: AcousticFeatures = currentFeatures || {
        rms: 0.45,
        pitch: 175,
        normalizedPitch: 0.48,
        spectralCentroid: 0.4,
        spectralFlatness: 0.24,
        spectralFlux: 0.35,
        lowEnergy: 0.55,
        midEnergy: 0.42,
        highEnergy: 0.32,
        isSilent: false,
        speechRate: 0.5,
        mood: result.voiceDNA.dominantMood,
      };

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

  const handleExhibitInHall = () => {
    if (!artefact) return;
    let thumbUrl: string | undefined;
    try {
      const canvas = document.querySelector('.sculpture-container canvas') as HTMLCanvasElement;
      if (canvas) {
        thumbUrl = canvas.toDataURL('image/webp', 0.85);
      }
    } catch {
      // fallback
    }
    addHallSpecimen(artefact, 'Авторский слепок', thumbUrl);
    setIsCurrentExhibited(true);
    setHallCount(getHallSpecimens().length);
  };

  const handleInspectSpecimen = (specimen: HallSpecimen) => {
    const pitchVal = specimen.avgPitch || (specimen.macroType === 'spire' ? 285 : specimen.macroType === 'disc' ? 95 : 175);
    const simulatedVoiceDNA: VoiceDNA = {
      avgPitch: pitchVal,
      avgCentroid: 0.38,
      peakRms: specimen.dominantMood?.mood === 'angry' ? 0.85 : 0.45,
      avgFlux: 0.35,
      uniqueSeed: specimen.uniqueSeed || 42100,
      dominantMood: specimen.dominantMood,
    };

    const simulatedFeatures: AcousticFeatures = {
      rms: 0.5,
      pitch: pitchVal,
      normalizedPitch: Math.max(0, Math.min(1, (pitchVal - 80) / 360)),
      spectralCentroid: 0.4,
      spectralFlatness: 0.22,
      spectralFlux: 0.35,
      lowEnergy: 0.5,
      midEnergy: 0.5,
      highEnergy: 0.3,
      isSilent: false,
      speechRate: 0.5,
      mood: specimen.dominantMood,
    };

    const simulatedArtefact: ArtefactProfile = {
      id: specimen.id,
      name: specimen.name,
      property: specimen.property,
      poeticDescription: specimen.poeticDescription,
      createdAt: specimen.createdAt,
      duration: 8,
      material: specimen.material,
      tactileTags: specimen.tactileTags,
      finalFeatures: simulatedFeatures,
      voiceDNA: simulatedVoiceDNA,
      dominantMood: specimen.dominantMood,
      snapshots: [],
      audioBlobUrl: specimen.audioBlobUrl,
      audioDuration: 8,
      survivalYears: specimen.survivalYears || 437,
    };

    if (sculptureRef.current) {
      sculptureRef.current.resetToDormant();
      sculptureRef.current.crystallizeUniqueArtefact(simulatedVoiceDNA, simulatedFeatures, specimen.macroType);
    }

    setArtefact(simulatedArtefact);
    setMaterialType(specimen.material);
    setIsCurrentExhibited(true);
    setWorkflowState('artefact');
  };

  const handleTimelineProgress = (progress: number) => {
    if (sculptureRef.current) {
      sculptureRef.current.setTimelineProgress(progress);
    }
  };

  const handleSelectSnapshot = (snapshot: AcousticTraceSnapshot) => {
    if (sculptureRef.current) {
      sculptureRef.current.showSnapshotByIndex(snapshot.index);
    }
  };

  const handleResetToFinal = () => {
    if (sculptureRef.current) {
      sculptureRef.current.showFinalArtefact();
    }
  };

  const handleReset = () => {
    setWorkflowState('dormant');
    setArtefact(null);
    setCurrentFeatures(null);
    setElapsedSeconds(0);
    setIsCurrentExhibited(false);
    setMaterialType('basalt');
    if (sculptureRef.current) {
      sculptureRef.current.resetToDormant();
    }
  };

  const handleApplyMoodColor = () => {
    if (sculptureRef.current && artefact?.dominantMood) {
      const mat = sculptureRef.current.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.set(artefact.dominantMood.colorHex);
      }
    }
  };

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
      />

      <div className="ui-layer">
        <Header
          workflowState={workflowState}
          onOpenAbout={() => setIsAboutOpen(true)}
          onOpenHall={() => setIsHallOpen(true)}
          hallCount={hallCount}
          onReset={handleReset}
        />

        {workflowState === 'observing' && (
          <ObservationHud
            features={currentFeatures}
            elapsedSeconds={elapsedSeconds}
            onStopRecording={stopRecordingAndSolidify}
          />
        )}

        {workflowState === 'solidifying' && <SolidificationMoment />}

        {workflowState === 'dormant' && (
          <HeroControls
            isRecording={false}
            onToggleRecord={handleToggleRecord}
            onTriggerSynthetic={handleTriggerSynthetic}
            elapsedSeconds={elapsedSeconds}
          />
        )}

        {workflowState === 'artefact' && artefact && (
          <ResultPanel
            artefact={artefact}
            meshRef={meshRef}
            currentMaterial={materialType}
            onChangeMaterial={(m) => setMaterialType(m)}
            onApplyMoodColor={handleApplyMoodColor}
            onTimelineProgress={handleTimelineProgress}
            onExhibitInHall={handleExhibitInHall}
            isExhibitedInHall={isCurrentExhibited}
            onSelectSnapshot={handleSelectSnapshot}
            onResetToFinal={handleResetToFinal}
            onResurrect={handleReset}
          />
        )}
      </div>

      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
      {isHallOpen && (
        <HallOfSpecimens
          onClose={() => setIsHallOpen(false)}
          onInspectSpecimen={handleInspectSpecimen}
        />
      )}
    </div>
  );
};

export default App;
