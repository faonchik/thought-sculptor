import React, { useState, useRef, useEffect } from 'react';
import type * as THREE from 'three';
import './editorial.css';
import type {
  AppWorkflowState,
  AcousticFeatures,
  ArtefactProfile,
  MaterialPresetType,
  VoiceDNA,
} from '../types';
import { AudioEngine } from '../services/audioEngine';
import { ProceduralSculpture } from '../services/proceduralGeometry';
import { createSculptureMaterial } from '../services/materialPresets';
import { generateArtefactProfile } from '../services/artifactGenerator';

import { getHallSpecimens, addHallSpecimen, isSpecimenInHall, type HallSpecimen } from '../services/hallStorage';
import { EditorialHeader } from './components/EditorialHeader';
import { EditorialStudio } from './components/EditorialStudio';
import { EditorialArchive } from './components/EditorialArchive';

interface EditorialAppProps {
  onSwitchToV1: () => void;
}

export const EditorialApp: React.FC<EditorialAppProps> = ({ onSwitchToV1 }) => {
  const [activeView, setActiveView] = useState<'studio' | 'archive'>('studio');
  const [workflowState, setWorkflowState] = useState<AppWorkflowState>('dormant');
  const [hallCount, setHallCount] = useState<number>(0);
  const [isSavedInArchive, setIsSavedInArchive] = useState<boolean>(false);
  const [currentFeatures, setCurrentFeatures] = useState<AcousticFeatures | null>(null);
  const [artefact, setArtefact] = useState<ArtefactProfile | null>(null);
  const [materialType, setMaterialType] = useState<MaterialPresetType>('basalt');

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const meshRef = useRef<THREE.Object3D | null>(null);
  const sculptureRef = useRef<ProceduralSculpture | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setHallCount(getHallSpecimens().length);
    audioEngineRef.current = new AudioEngine();
    return () => {
      if (audioEngineRef.current) audioEngineRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleToggleRecord = async () => {
    setActiveView('studio');
    if (workflowState === 'dormant' || workflowState === 'artefact') {
      if (!audioEngineRef.current) return;
      if (sculptureRef.current) {
        sculptureRef.current.resetToDormant();
      }
      setArtefact(null);
      setCurrentFeatures(null);
      setIsSavedInArchive(false);
      setWorkflowState('observing');

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
    if (sculptureRef.current) {
      sculptureRef.current.resetToDormant();
    }
    setArtefact(null);
    setCurrentFeatures(null);
    setIsSavedInArchive(false);
    setWorkflowState('observing');

    await audioEngineRef.current.startSyntheticVoice((features) => {
      setCurrentFeatures(features);
    });

    setTimeout(() => {
      stopRecordingAndSolidify();
    }, 9000);
  };

  const stopRecordingAndSolidify = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setWorkflowState('solidifying');

    if (audioEngineRef.current) {
      const result = await audioEngineRef.current.stop(1.0);
      const finalFeatures: AcousticFeatures = currentFeatures || {
        rms: 0.42,
        pitch: 175,
        normalizedPitch: 0.48,
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
        setIsSavedInArchive(isSpecimenInHall(newArtefact.id));
        setWorkflowState('artefact');
      }, 2500);
    }
  };

  const handleSaveToArchive = () => {
    if (!artefact) return;
    let thumbUrl: string | undefined;
    try {
      const canvas = document.querySelector('.ed-canvas-host canvas') as HTMLCanvasElement;
      if (canvas) {
        thumbUrl = canvas.toDataURL('image/webp', 0.85);
      }
    } catch {
      // fallback
    }
    addHallSpecimen(artefact, 'Scientific Archive Plate', thumbUrl);
    setIsSavedInArchive(true);
    setHallCount(getHallSpecimens().length);
  };

  const handleInspectSpecimen = (specimen: HallSpecimen) => {
    const pitchVal = specimen.avgPitch || 175;
    const simulatedVoiceDNA: VoiceDNA = {
      avgPitch: pitchVal,
      avgCentroid: 0.38,
      avgSpread: 0.35,
      avgFlatness: 0.22,
      avgRolloff: 0.45,
      avgZcr: 0.16,
      avgHarmonicRatio: 0.68,
      temporalVariability: 0.25,
      lowBandRatio: 0.45,
      midBandRatio: 0.40,
      highBandRatio: 0.30,
      peakRms: 0.55,
      avgFlux: 0.35,
      uniqueSeed: specimen.uniqueSeed || 42100,
      signatureHash: specimen.uniqueSeed || 42100,
      dominantMood: specimen.dominantMood,
      morphStrategy: specimen.macroType === 'spire' ? 'spire' : specimen.macroType === 'disc' ? 'monolith' : 'asymmetric',
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

    if (sculptureRef.current) {
      if (specimen.isCouples) {
        const dna2 = { ...simulatedVoiceDNA, avgPitch: 245, uniqueSeed: (specimen.uniqueSeed || 42100) + 99 };
        sculptureRef.current.crystallizeCouplesArtefact(
          simulatedVoiceDNA,
          simulatedFeatures,
          dna2,
          simulatedFeatures,
          specimen.couplesArchetype || 'dyad',
          specimen.material,
          specimen.material2 || 'graphite'
        );
      } else {
        sculptureRef.current.crystallizeUniqueArtefact(simulatedVoiceDNA, simulatedFeatures, specimen.macroType);
      }
    }

    const simArtefact: ArtefactProfile = {
      ...specimen,
      duration: 7.2,
      finalFeatures: simulatedFeatures,
      voiceDNA: simulatedVoiceDNA,
      dominantMood: specimen.dominantMood,
      snapshots: [],
      survivalYears: specimen.survivalYears,
      audioDuration: 7.2,
    };

    setArtefact(simArtefact);
    setMaterialType(specimen.material);
    setIsSavedInArchive(true);
    setWorkflowState('artefact');
    setActiveView('studio');
  };

  const handleResetToDormant = () => {
    if (sculptureRef.current) {
      sculptureRef.current.resetToDormant();
    }
    setArtefact(null);
    setCurrentFeatures(null);
    setIsSavedInArchive(false);
    setWorkflowState('dormant');
    setActiveView('studio');
  };

  return (
    <div className="editorial-root">
      {/* Background Watermark Grid & Corner Registration Ticks */}
      <div className="editorial-watermark-grid" />
      <div className="corner-registration corner-tl" />
      <div className="corner-registration corner-tr" />
      <div className="corner-registration corner-bl" />
      <div className="corner-registration corner-br" />

      {/* Editorial Header with Navigation & Version Switcher */}
      <EditorialHeader
        activeView={activeView}
        onSelectView={setActiveView}
        hallCount={hallCount}
        isRecording={workflowState === 'observing'}
        onSwitchToV1={onSwitchToV1}
      />

      {/* Main Studio View */}
      {activeView === 'studio' && (
        <EditorialStudio
          features={currentFeatures}
          workflowState={workflowState}
          materialType={materialType}
          onChangeMaterial={(m) => {
            setMaterialType(m);
            if (sculptureRef.current && sculptureRef.current.mesh) {
              sculptureRef.current.mesh.material = createSculptureMaterial(m);
            }
          }}
          onToggleRecord={handleToggleRecord}
          onTriggerSynthetic={handleTriggerSynthetic}
          sculptureRef={sculptureRef}
          meshRef={meshRef}
          artefact={artefact}
          onSaveToArchive={handleSaveToArchive}
          isSavedInArchive={isSavedInArchive}
          onResetToDormant={handleResetToDormant}
        />
      )}

      {/* Archive / Catalogue View */}
      {activeView === 'archive' && (
        <EditorialArchive
          onInspectSpecimen={handleInspectSpecimen}
          onClose={() => setActiveView('studio')}
        />
      )}
    </div>
  );
};
