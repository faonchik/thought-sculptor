import type { AcousticFeatures, AcousticTraceSnapshot, VoiceDNA, VoiceMood, MorphStrategy } from '../types';
import { classifyVoiceEmotion, getMoodProfile } from './emotionClassifier';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private preampGain: GainNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private previousSpectrum: Float32Array | null = null;
  private isAnalyzing: boolean = false;
  private animationFrameId: number | null = null;
  private onFeaturesCallback: ((features: AcousticFeatures) => void) | null = null;

  // Track recording snapshots
  private snapshots: AcousticTraceSnapshot[] = [];
  private recordingStartTime: number = 0;
  private lastSnapshotTime: number = 0;

  // Voice accumulation statistics for unique sculpture DNA
  private pitchSamples: number[] = [];
  private centroidSamples: number[] = [];
  private spreadSamples: number[] = [];
  private flatnessSamples: number[] = [];
  private rolloffSamples: number[] = [];
  private zcrSamples: number[] = [];
  private harmonicSamples: number[] = [];
  private rmsSamples: number[] = [];
  private fluxSamples: number[] = [];
  private lowBandSamples: number[] = [];
  private midBandSamples: number[] = [];
  private highBandSamples: number[] = [];
  private rmsWindow: number[] = [];

  private moodCounts: Record<VoiceMood, number> = {
    angry: 0,
    sad: 0,
    calm: 0,
    joyful: 0,
    mysterious: 0,
  };

  // Smoothing buffers
  private smoothedRMS: number = 0;
  private smoothedPitch: number = 180;
  private smoothedCentroid: number = 0.35;
  private smoothedSpread: number = 0.32;
  private smoothedFlatness: number = 0.20;
  private smoothedRolloff: number = 0.40;
  private smoothedZcr: number = 0.15;
  private smoothedHarmonicRatio: number = 0.65;
  private silenceFrames: number = 0;
  private expressionScale: number = 1.0;

  public setExpressionScale(scale: number): void {
    this.expressionScale = scale;
  }

  // Synthetic demo mode
  private synthOscillator: OscillatorNode | null = null;
  private synthModulator: OscillatorNode | null = null;
  private synthGain: GainNode | null = null;

  public async startMicrophone(onFeatures: (features: AcousticFeatures) => void): Promise<boolean> {
    try {
      this.resetStats();
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      try {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);

      this.preampGain = this.audioContext.createGain();
      this.preampGain.gain.setValueAtTime(3.8, this.audioContext.currentTime);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.45;

      source.connect(this.preampGain);
      this.preampGain.connect(this.analyser);

      this.onFeaturesCallback = onFeatures;
      this.startRecordingAudio();
      this.startAnalysisLoop();
      return true;
    } catch (err) {
      console.warn('Microphone access unavailable or denied, switching to synthetic voice engine:', err);
      return this.startSyntheticVoice(onFeatures);
    }
  }

  public async startSyntheticVoice(onFeatures: (features: AcousticFeatures) => void): Promise<boolean> {
    this.resetStats();
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.5;

    const fundamental = this.audioContext.createOscillator();
    fundamental.type = 'sawtooth';
    fundamental.frequency.setValueAtTime(145, this.audioContext.currentTime);

    const pitchLfo = this.audioContext.createOscillator();
    pitchLfo.frequency.setValueAtTime(0.8, this.audioContext.currentTime);
    const pitchLfoGain = this.audioContext.createGain();
    pitchLfoGain.gain.setValueAtTime(45, this.audioContext.currentTime);
    pitchLfo.connect(fundamental.frequency);

    const formantFilter = this.audioContext.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(680, this.audioContext.currentTime);
    formantFilter.Q.setValueAtTime(4.0, this.audioContext.currentTime);

    this.synthGain = this.audioContext.createGain();
    this.synthGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);

    fundamental.connect(formantFilter);
    formantFilter.connect(this.synthGain);
    this.synthGain.connect(this.analyser);

    const masterOutput = this.audioContext.createGain();
    masterOutput.gain.setValueAtTime(0.12, this.audioContext.currentTime);
    this.synthGain.connect(masterOutput);
    masterOutput.connect(this.audioContext.destination);

    fundamental.start();
    pitchLfo.start();

    this.synthOscillator = fundamental;
    this.synthModulator = pitchLfo;

    this.modulateSyntheticSpeech();

    this.onFeaturesCallback = onFeatures;
    this.startRecordingAudio();
    this.startAnalysisLoop();
    return true;
  }

  private resetStats(): void {
    this.snapshots = [];
    this.recordedChunks = [];
    this.lastSnapshotTime = 0;
    this.previousSpectrum = null;
    this.pitchSamples = [];
    this.centroidSamples = [];
    this.spreadSamples = [];
    this.flatnessSamples = [];
    this.rolloffSamples = [];
    this.zcrSamples = [];
    this.harmonicSamples = [];
    this.rmsSamples = [];
    this.fluxSamples = [];
    this.lowBandSamples = [];
    this.midBandSamples = [];
    this.highBandSamples = [];
    this.rmsWindow = [];
    this.moodCounts = { angry: 0, sad: 0, calm: 0, joyful: 0, mysterious: 0 };
    this.smoothedRMS = 0;
    this.smoothedPitch = 180;
    this.smoothedCentroid = 0.35;
    this.smoothedSpread = 0.32;
    this.smoothedFlatness = 0.20;
    this.smoothedRolloff = 0.40;
    this.smoothedZcr = 0.15;
    this.smoothedHarmonicRatio = 0.65;
    this.silenceFrames = 0;
    this.recordingStartTime = performance.now();
  }

  private modulateSyntheticSpeech(): void {
    if (!this.synthGain || !this.audioContext) return;
    const now = this.audioContext.currentTime;

    const pattern = [
      { t: 0.0, gain: 0.25, freq: 130 },
      { t: 1.0, gain: 0.15, freq: 110 },
      { t: 2.2, gain: 0.95, freq: 320 },
      { t: 3.4, gain: 0.60, freq: 240 },
      { t: 4.4, gain: 0.02, freq: 100 },
      { t: 5.2, gain: 0.50, freq: 180 },
      { t: 6.4, gain: 0.80, freq: 280 },
      { t: 7.5, gain: 0.20, freq: 120 },
      { t: 8.5, gain: 0.00, freq: 100 },
    ];

    pattern.forEach((step) => {
      this.synthGain?.gain.linearRampToValueAtTime(step.gain, now + step.t);
      if (this.synthOscillator) {
        this.synthOscillator.frequency.linearRampToValueAtTime(step.freq, now + step.t);
      }
    });
  }

  private startRecordingAudio(): void {
    this.recordedChunks = [];
    this.snapshots = [];
    this.recordingStartTime = performance.now();
    this.lastSnapshotTime = 0;

    if (this.microphoneStream && typeof MediaRecorder !== 'undefined') {
      try {
        this.mediaRecorder = new MediaRecorder(this.microphoneStream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.recordedChunks.push(e.data);
        };
        this.mediaRecorder.start(100);
      } catch (e) {
        console.warn('MediaRecorder error:', e);
      }
    }
  }

  private startAnalysisLoop(): void {
    this.isAnalyzing = true;
    const bufferLength = this.analyser ? this.analyser.fftSize : 2048;
    const timeDomain = new Float32Array(bufferLength);
    const frequencyDomain = new Float32Array(this.analyser?.frequencyBinCount || 1024);

    const analyze = () => {
      if (!this.isAnalyzing || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(timeDomain);
      this.analyser.getFloatFrequencyData(frequencyDomain);

      const features = this.extractFeatures(timeDomain, frequencyDomain);

      this.smoothedRMS += (features.rms - this.smoothedRMS) * 0.45;
      this.smoothedPitch += (features.pitch - this.smoothedPitch) * 0.35;
      this.smoothedCentroid += (features.spectralCentroid - this.smoothedCentroid) * 0.30;
      this.smoothedSpread += (features.spectralSpread - this.smoothedSpread) * 0.25;
      this.smoothedFlatness += (features.spectralFlatness - this.smoothedFlatness) * 0.25;
      this.smoothedRolloff += (features.spectralRolloff - this.smoothedRolloff) * 0.25;
      this.smoothedZcr += (features.zeroCrossingRate - this.smoothedZcr) * 0.30;
      this.smoothedHarmonicRatio += (features.harmonicRatio - this.smoothedHarmonicRatio) * 0.30;

      const normPitch = Math.max(0, Math.min(1, (this.smoothedPitch - 80) / 360));
      const mood = classifyVoiceEmotion(
        this.smoothedRMS,
        this.smoothedPitch,
        normPitch,
        this.smoothedCentroid,
        this.smoothedFlatness,
        features.spectralFlux
      );

      const smoothedFeatures: AcousticFeatures = {
        ...features,
        rms: this.smoothedRMS,
        pitch: this.smoothedPitch,
        normalizedPitch: normPitch,
        spectralCentroid: this.smoothedCentroid,
        spectralSpread: this.smoothedSpread,
        spectralFlatness: this.smoothedFlatness,
        spectralRolloff: this.smoothedRolloff,
        zeroCrossingRate: this.smoothedZcr,
        harmonicRatio: this.smoothedHarmonicRatio,
        mood,
      };

      if (!features.isSilent) {
        this.pitchSamples.push(smoothedFeatures.pitch);
        this.centroidSamples.push(smoothedFeatures.spectralCentroid);
        this.spreadSamples.push(smoothedFeatures.spectralSpread);
        this.flatnessSamples.push(smoothedFeatures.spectralFlatness);
        this.rolloffSamples.push(smoothedFeatures.spectralRolloff);
        this.zcrSamples.push(smoothedFeatures.zeroCrossingRate);
        this.harmonicSamples.push(smoothedFeatures.harmonicRatio);
        this.rmsSamples.push(smoothedFeatures.rms);
        this.fluxSamples.push(smoothedFeatures.spectralFlux);
        this.lowBandSamples.push(smoothedFeatures.lowEnergy);
        this.midBandSamples.push(smoothedFeatures.midEnergy);
        this.highBandSamples.push(smoothedFeatures.highEnergy);
        this.moodCounts[mood.mood] = (this.moodCounts[mood.mood] || 0) + 1;
      }

      if (this.onFeaturesCallback) {
        this.onFeaturesCallback(smoothedFeatures);
      }

      const elapsedSec = (performance.now() - this.recordingStartTime) / 1000;
      if (elapsedSec - this.lastSnapshotTime >= 1.0) {
        this.lastSnapshotTime = Math.floor(elapsedSec);
        this.captureSnapshot(this.lastSnapshotTime, smoothedFeatures);
      }

      this.animationFrameId = requestAnimationFrame(analyze);
    };

    this.animationFrameId = requestAnimationFrame(analyze);
  }

  private extractFeatures(timeDomain: Float32Array, frequencyDomain: Float32Array): AcousticFeatures {
    let sumSquares = 0;
    let zcCount = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      sumSquares += timeDomain[i] * timeDomain[i];
      if (i > 0 && ((timeDomain[i] >= 0 && timeDomain[i - 1] < 0) || (timeDomain[i] < 0 && timeDomain[i - 1] >= 0))) {
        zcCount++;
      }
    }
    const rawRms = Math.sqrt(sumSquares / timeDomain.length);
    const rms = Math.min(1.0, Math.max(0, rawRms * 8.0));
    const zeroCrossingRate = Math.min(1.0, zcCount / (timeDomain.length * 0.22));

    this.rmsWindow.push(rms);
    if (this.rmsWindow.length > 30) this.rmsWindow.shift();
    let meanRms = 0;
    for (let j = 0; j < this.rmsWindow.length; j++) meanRms += this.rmsWindow[j];
    meanRms /= Math.max(1, this.rmsWindow.length);
    let varRms = 0;
    for (let j = 0; j < this.rmsWindow.length; j++) {
      const diff = this.rmsWindow[j] - meanRms;
      varRms += diff * diff;
    }
    const temporalVariability = Math.min(1.0, Math.sqrt(varRms / Math.max(1, this.rmsWindow.length)) * 3.5);

    if (rms < 0.035) {
      this.silenceFrames++;
    } else {
      this.silenceFrames = 0;
    }
    const isSilent = this.silenceFrames > 15;

    const { pitch, harmonicRatio } = this.estimatePitchAutocorrelation(timeDomain, rawRms);

    const binCount = frequencyDomain.length;
    const nyquist = (this.audioContext?.sampleRate || 44100) / 2;
    const binFreq = nyquist / binCount;

    let totalMagnitude = 0;
    let weightedFrequencySum = 0;
    let lowEnergySum = 0;
    let midEnergySum = 0;
    let highEnergySum = 0;

    let logSum = 0;
    let linearSum = 0;
    const linearMagnitudes = new Float32Array(binCount);

    for (let i = 0; i < binCount; i++) {
      const db = frequencyDomain[i];
      const linear = Math.max(0, (db + 95) / 65);
      linearMagnitudes[i] = linear;
      const freq = i * binFreq;

      totalMagnitude += linear;
      weightedFrequencySum += freq * linear;

      if (freq < 320) {
        lowEnergySum += linear;
      } else if (freq < 2600) {
        midEnergySum += linear;
      } else {
        highEnergySum += linear;
      }

      const safeLin = Math.max(0.0001, linear);
      logSum += Math.log(safeLin);
      linearSum += safeLin;
    }

    const rawCentroidHz = totalMagnitude > 0 ? weightedFrequencySum / totalMagnitude : 1200;
    const spectralCentroid = Math.min(1.0, rawCentroidHz / 3600);

    // Spectral Spread (standard deviation of frequencies around centroid)
    let spreadVariance = 0;
    if (totalMagnitude > 0) {
      for (let i = 0; i < binCount; i++) {
        const freq = i * binFreq;
        const deltaFreq = freq - rawCentroidHz;
        spreadVariance += deltaFreq * deltaFreq * linearMagnitudes[i];
      }
      spreadVariance /= totalMagnitude;
    }
    const spectralSpread = Math.min(1.0, Math.sqrt(spreadVariance) / 2200);

    // Spectral Rolloff (frequency containing 85% of total cumulative energy)
    const thresholdEnergy = totalMagnitude * 0.85;
    let cumEnergy = 0;
    let rolloffFreq = 2000;
    for (let i = 0; i < binCount; i++) {
      cumEnergy += linearMagnitudes[i];
      if (cumEnergy >= thresholdEnergy) {
        rolloffFreq = i * binFreq;
        break;
      }
    }
    const spectralRolloff = Math.min(1.0, rolloffFreq / 5500);

    const lowEnergy = Math.min(1.0, lowEnergySum / (binCount * 0.18 + 0.001));
    const midEnergy = Math.min(1.0, midEnergySum / (binCount * 0.38 + 0.001));
    const highEnergy = Math.min(1.0, highEnergySum / (binCount * 0.44 + 0.001));

    const geometricMean = Math.exp(logSum / binCount);
    const arithmeticMean = linearSum / binCount;
    const spectralFlatness = arithmeticMean > 0 ? Math.min(1.0, geometricMean / arithmeticMean) : 0.15;

    let flux = 0;
    if (this.previousSpectrum) {
      for (let i = 0; i < binCount; i++) {
        const diff = frequencyDomain[i] - this.previousSpectrum[i];
        if (diff > 0) flux += diff;
      }
      flux = Math.min(1.0, flux / 180);
    }
    this.previousSpectrum = new Float32Array(frequencyDomain);

    const normPitch = Math.max(0, Math.min(1, (pitch - 80) / 360));
    const mood = classifyVoiceEmotion(rms, pitch, normPitch, spectralCentroid, spectralFlatness, flux);

    return {
      rms,
      pitch,
      normalizedPitch: normPitch,
      spectralCentroid,
      spectralSpread,
      spectralFlatness,
      spectralRolloff,
      spectralFlux: flux,
      zeroCrossingRate,
      harmonicRatio,
      temporalVariability,
      lowEnergy,
      midEnergy,
      highEnergy,
      isSilent,
      speechRate: Math.min(1.0, flux * 2.2 + rms * 0.7),
      mood,
    };
  }

  private estimatePitchAutocorrelation(buffer: Float32Array, rawRms: number): { pitch: number; harmonicRatio: number } {
    // If background room noise / silent, maintain current pitch so 100 Hz room hum is NOT picked up
    if (rawRms < 0.012) {
      return { pitch: this.smoothedPitch || 170, harmonicRatio: 0.2 };
    }

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const minFreq = 85; // Ignore 50Hz/60Hz AC hum
    const maxFreq = 520;
    const minLag = Math.floor(sampleRate / maxFreq);
    const maxLag = Math.floor(sampleRate / minFreq);

    let maxCorr = -1;
    let bestLag = -1;

    const len = Math.min(buffer.length - maxLag, 1024);

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      let energy0 = 0;
      let energyLag = 0;

      for (let i = 0; i < len; i += 2) {
        corr += buffer[i] * buffer[i + lag];
        energy0 += buffer[i] * buffer[i];
        energyLag += buffer[i + lag] * buffer[i + lag];
      }

      const denom = Math.sqrt(energy0 * energyLag) + 0.00001;
      const normCorr = corr / denom;

      if (normCorr > maxCorr) {
        maxCorr = normCorr;
        bestLag = lag;
      }
    }

    const harmonicRatio = Math.max(0, Math.min(1, maxCorr));

    if (bestLag > 0 && maxCorr > 0.40) {
      const estimated = sampleRate / bestLag;
      if (estimated >= 80 && estimated <= 500) {
        return { pitch: estimated, harmonicRatio };
      }
    }
    return { pitch: this.smoothedPitch || 170, harmonicRatio };
  }

  private onSnapshotTrigger: (() => void) | null = null;

  public setOnSnapshotTrigger(cb: () => void): void {
    this.onSnapshotTrigger = cb;
  }

  private captureSnapshot(timeOffset: number, features: AcousticFeatures): void {
    const annotations = [
      'базальное уплотнение породы',
      'вертикальный акустический хребет',
      'микроразлом низкой частоты',
      'пористая диффузия дыхания',
      'кристаллизация интонации',
      'тектонический сдвиг спектра',
      'статическая пауза материи',
    ];
    const annotation = features.isSilent
      ? 'фаза замирания и петрификации'
      : annotations[Math.floor(Math.random() * annotations.length)];

    const index = this.snapshots.length;
    this.snapshots.push({
      index,
      timeOffset,
      features: { ...features },
      deformationSeed: Math.random() * 1000,
      annotation,
    });

    if (this.onSnapshotTrigger) {
      this.onSnapshotTrigger();
    }
  }

  public async stop(expressionScaleOverride?: number): Promise<{
    duration: number;
    audioBlobUrl?: string;
    snapshots: AcousticTraceSnapshot[];
    voiceDNA: VoiceDNA;
  }> {
    this.isAnalyzing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const duration = Math.max(1, Math.round((performance.now() - this.recordingStartTime) / 1000));

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }

    if (this.synthOscillator) {
      try { this.synthOscillator.stop(); } catch {}
      this.synthOscillator = null;
    }
    if (this.synthModulator) {
      try { this.synthModulator.stop(); } catch {}
      this.synthModulator = null;
    }

    let audioBlobUrl: string | undefined = undefined;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!this.mediaRecorder) return resolve();
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm; codecs=opus' });
          audioBlobUrl = URL.createObjectURL(blob);
          resolve();
        };
        this.mediaRecorder.stop();
      });
    }

    const avg = (arr: number[], def: number) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : def;
    const max = (arr: number[], def: number) => arr.length ? Math.max(...arr) : def;

    const avgPitch = avg(this.pitchSamples, 175);
    const avgCentroid = avg(this.centroidSamples, 0.38);
    const avgSpread = avg(this.spreadSamples, 0.32);
    const avgFlatness = avg(this.flatnessSamples, 0.22);
    const avgRolloff = avg(this.rolloffSamples, 0.42);
    const avgZcr = avg(this.zcrSamples, 0.16);
    const avgHarmonicRatio = avg(this.harmonicSamples, 0.65);
    const peakRms = max(this.rmsSamples, 0.40);
    const avgRms = avg(this.rmsSamples, 0.28);
    const avgFlux = avg(this.fluxSamples, 0.30);
    const lowBandRatio = avg(this.lowBandSamples, 0.45);
    const midBandRatio = avg(this.midBandSamples, 0.40);
    const highBandRatio = avg(this.highBandSamples, 0.30);

    // Calculate temporal variability across recording
    let rmsMean = avgRms;
    let rmsVariance = 0;
    if (this.rmsSamples.length > 0) {
      for (const val of this.rmsSamples) {
        rmsVariance += (val - rmsMean) * (val - rmsMean);
      }
      rmsVariance /= this.rmsSamples.length;
    }
    const temporalVariability = Math.min(1.0, Math.sqrt(rmsVariance) * 3.5);

    const totalSpokenFrames = this.rmsSamples.length || 1;
    const angryCount = this.moodCounts.angry || 0;
    const joyfulCount = this.moodCounts.joyful || 0;
    const mysteriousCount = this.moodCounts.mysterious || 0;
    const sadCount = this.moodCounts.sad || 0;
    const calmCount = this.moodCounts.calm || 0;

    let dominantMoodType: VoiceMood = 'calm';

    if (peakRms > 0.36 && (angryCount >= 3 || (angryCount / totalSpokenFrames) > 0.03)) {
      dominantMoodType = 'angry';
    } else if (joyfulCount > calmCount * 0.40 || (avgPitch > 195 && peakRms > 0.20)) {
      dominantMoodType = 'joyful';
    } else if (mysteriousCount > calmCount * 0.35 || (avgCentroid > 0.36 && avgRms < 0.22)) {
      dominantMoodType = 'mysterious';
    } else if (sadCount > calmCount * 0.45 || (avgPitch < 155 && avgRms < 0.22)) {
      dominantMoodType = 'sad';
    } else {
      let maxMoodCount = -1;
      const moodList: VoiceMood[] = ['angry', 'joyful', 'mysterious', 'sad', 'calm'];
      for (const m of moodList) {
        if (this.moodCounts[m] > maxMoodCount) {
          maxMoodCount = this.moodCounts[m];
          dominantMoodType = m;
        }
      }
    }

    const dominantMood = getMoodProfile(dominantMoodType);

    // Determine morphological strategy from acoustic dimensions
    let morphStrategy: MorphStrategy = 'asymmetric';
    if (highBandRatio > lowBandRatio * 1.35 || avgPitch > 215 || avgRolloff > 0.65) {
      morphStrategy = 'spire';          // Вертикальный рост, шпили, башни
    } else if (lowBandRatio > (midBandRatio + highBandRatio) * 0.65 || avgPitch < 130) {
      morphStrategy = 'monolith';       // Радиальное расширение, массивное основание
    } else if (temporalVariability > 0.32 || avgFlux > 0.42) {
      morphStrategy = 'spiral';         // Скручивание, вихревая динамика
    } else if (avgFlatness > 0.28 || avgZcr > 0.35) {
      morphStrategy = 'crest';          // Фрагментация, кристаллические гребни
    } else if (avgHarmonicRatio > 0.55 && avgFlatness < 0.22) {
      morphStrategy = 'organic';        // Сглаженная обтекаемая биоморфная форма
    } else {
      morphStrategy = 'asymmetric';     // Динамическая направленная асимметрия
    }

    // High-entropy unique acoustic seed derived from voice signature
    const signatureHash = Math.abs(
      Math.round(avgPitch * 7919) ^
      Math.round(avgCentroid * 104729) ^
      Math.round(peakRms * 1299709) ^
      Math.round(avgFlux * 15485863) ^
      Math.round(avgSpread * 32452843) ^
      Math.round(avgRolloff * 49979687) ^
      Math.round(avgZcr * 67867967) ^
      Math.round(duration * 86028121)
    );

    const uniqueSeed = signatureHash % 1000000;
    const expressionScale = expressionScaleOverride ?? this.expressionScale ?? 1.0;

    if (this.snapshots.length === 0) {
      this.captureSnapshot(1, {
        rms: this.smoothedRMS || 0.5,
        pitch: this.smoothedPitch || 175,
        normalizedPitch: 0.5,
        spectralCentroid: this.smoothedCentroid || 0.4,
        spectralSpread: this.smoothedSpread || 0.32,
        spectralFlatness: this.smoothedFlatness || 0.25,
        spectralRolloff: this.smoothedRolloff || 0.42,
        spectralFlux: 0.35,
        zeroCrossingRate: this.smoothedZcr || 0.16,
        harmonicRatio: this.smoothedHarmonicRatio || 0.65,
        temporalVariability: 0.2,
        lowEnergy: 0.5,
        midEnergy: 0.4,
        highEnergy: 0.35,
        isSilent: false,
        speechRate: 0.5,
        mood: dominantMood,
      });
    }

    return {
      duration,
      audioBlobUrl,
      snapshots: [...this.snapshots],
      voiceDNA: {
        avgPitch,
        avgCentroid,
        avgSpread,
        avgFlatness,
        avgRolloff,
        avgZcr,
        avgHarmonicRatio,
        temporalVariability,
        lowBandRatio,
        midBandRatio,
        highBandRatio,
        peakRms,
        avgFlux,
        uniqueSeed,
        signatureHash,
        dominantMood,
        morphStrategy,
        expressionScale,
      },
    };
  }
}
