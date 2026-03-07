import { EAXPresets } from "./EAXPresets";

/**
 * ReverbEngine class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ReverbEngine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ReverbEngine {
  private context: AudioContext;

  private currentPreset: number = 0;

  // Core nodes
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private output: GainNode;

  // Early reflections
  private earlyReflections: DelayNode;
  private earlyGain: GainNode;
  private earlyPanner: StereoPannerNode;

  // Late reverb
  private lateDelay: DelayNode;
  private lateGain: GainNode;
  private latePanner: StereoPannerNode;

  // Filters for HF/LF shaping
  private hfFilter: BiquadFilterNode;
  private lfFilter: BiquadFilterNode;
  private airAbsorptionFilter: BiquadFilterNode;

  // Echo
  private echoDelay: DelayNode;
  private echoGain: GainNode;

  // Modulation (LFO on late delay)
  private lfo: OscillatorNode;
  private lfoGain: GainNode;

  // EAX-specific parameters
  private density: number = 1.0;
  private diffusion: number = 1.0;
  private decayHFRatio: number = 1.0;
  private decayLFRatio: number = 1.0;
  private cachedWetGain: number = 0;
  
  // Missing EAX features
  private reflectionsPan: [number, number, number] = [0, 0, 0];
  private lateReverbPan: [number, number, number] = [0, 0, 0];
  private echoTime: number = 0.25;
  private echoDepth: number = 0.0;
  private modulationTime: number = 0.25;
  private modulationDepth: number = 0.0;
  private decayHFLimit: boolean = false;

  // 3D Audio Processing
  private listenerPosition: [number, number, number] = [0, 0, 0];
  private listenerOrientation: [number, number, number] = [0, 0, 1];

  constructor(context: AudioContext) {
    console.log("Initializing ReverbEngine");
    this.context = context;
    this.currentPreset = 0;

    this.convolver = context.createConvolver();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.output = context.createGain();

    this.earlyReflections = context.createDelay(0.2);
    this.earlyGain = context.createGain();
    this.earlyPanner = context.createStereoPanner();

    this.lateDelay = context.createDelay(0.2);
    this.lateGain = context.createGain();
    this.latePanner = context.createStereoPanner();

    this.hfFilter = context.createBiquadFilter();
    this.hfFilter.type = "lowshelf";
    this.hfFilter.frequency.value = 5000;
    this.hfFilter.gain.value = 0;

    this.lfFilter = context.createBiquadFilter();
    this.lfFilter.type = "highshelf";
    this.lfFilter.frequency.value = 250;
    this.lfFilter.gain.value = 0;

    this.airAbsorptionFilter = context.createBiquadFilter();
    this.airAbsorptionFilter.type = "lowpass";
    this.airAbsorptionFilter.frequency.value = 5000;
    this.airAbsorptionFilter.Q.value = 0.5;

    this.echoDelay = context.createDelay(0.5);
    this.echoGain = context.createGain();

    this.lfo = context.createOscillator();
    this.lfo.type = "sine";
    this.lfoGain = context.createGain();
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.lateDelay.delayTime);
    this.lfo.start();

    this.earlyReflections.connect(this.earlyGain).connect(this.earlyPanner).connect(this.convolver);
    this.convolver.connect(this.hfFilter).connect(this.lfFilter).connect(this.airAbsorptionFilter).connect(this.wetGain);
    this.wetGain.connect(this.lateDelay).connect(this.lateGain).connect(this.latePanner).connect(this.output);
    this.dryGain.connect(this.output);
    this.output.connect(context.destination);

    this.density = 1.0;
    this.diffusion = 1.0;
    this.decayHFRatio = 1.0;
    this.decayLFRatio = 1.0;
    this.cachedWetGain = 0;
    this.reflectionsPan = [0, 0, 0];
    this.lateReverbPan = [0, 0, 0];
    this.echoTime = 0.25;
    this.echoDepth = 0.0;
    this.modulationTime = 0.25;
    this.modulationDepth = 0.0;
    this.decayHFLimit = false;
    this.listenerPosition = [0, 0, 0];
    this.listenerOrientation = [0, 0, 1];
  }

  /**
   * Load preset and apply all parameters with correct EAX mapping
   */
  loadPreset(index: number) {
    console.log("Loading preset:", index);
    if (this.currentPreset === index) return;

    const preset = EAXPresets.PresetFromIndex(index);
    if (!preset) {
      console.error('EAX preset not found', index);
      return;
    }

    this.currentPreset = index;
    this.density = preset.density;
    this.diffusion = preset.diffusion;
    this.decayHFRatio = preset.decayHFRatio;
    this.decayLFRatio = preset.decayLFRatio;
    this.reflectionsPan = preset.reflectionsPan || [0, 0, 0];
    this.lateReverbPan = preset.lateReverbPan || [0, 0, 0];
    this.echoTime = preset.echoTime || 0.25;
    this.echoDepth = preset.echoDepth || 0.0;
    this.modulationTime = preset.modulationTime || 0.25;
    this.modulationDepth = preset.modulationDepth || 0.0;
    this.decayHFLimit = preset.decayHFLimit || false;

    this.hfFilter.gain.value = -10 * (1 - this.decayHFRatio);
    this.lfFilter.gain.value = 10 * (this.decayLFRatio - 1);
    this.airAbsorptionFilter.frequency.value = preset.airAbsorptionGainHF * 5000;
    this.earlyPanner.pan.value = this.reflectionsPan[0];
    this.latePanner.pan.value = this.lateReverbPan[0];
    this.earlyReflections.delayTime.value = preset.reflectionsDelay;
    this.lateDelay.delayTime.value = preset.lateReverbDelay;
    this.lfo.frequency.value = 1 / this.modulationTime;
    this.lfoGain.gain.value = this.modulationDepth * 0.001;
    this.echoDelay.delayTime.value = this.echoTime;
    this.echoGain.gain.value = this.echoDepth;

    this.convolver.buffer = this.generateEAXImpulse(preset);

    const reverbLevel = preset.gain * preset.lateReverbGain;
    this.wetGain.gain.value = reverbLevel;
    this.cachedWetGain = reverbLevel;
    this.dryGain.gain.value = 1.0 - preset.gain;

  }

  /**
   * Generate proper EAX impulse response with early reflections and late reverb
   */
  private generateEAXImpulse(preset: any): AudioBuffer {
    console.log("Generating EAX impulse for preset");
    const sampleRate = this.context.sampleRate;
    const length = Math.ceil(preset.decayTime * sampleRate);
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const decay = Math.exp(-Math.log(1000) / (preset.decayTime * sampleRate));
    for (let i = 0; i < length; i++) {
      const noise = Math.random() * 2 - 1;
      const envelope = Math.pow(decay, i);
      left[i] = noise * envelope * preset.gain;
      right[i] = noise * envelope * preset.gain;
    }

    this.applyDiffusion(left, right, sampleRate, preset.diffusion);
    this.applyEcho(left, sampleRate, length);
    this.applyEcho(right, sampleRate, length);
    this.applyModulation(left, sampleRate, length);
    this.applyModulation(right, sampleRate, length);
    this.applyDecayHFLimit(left, sampleRate, length);
    this.applyDecayHFLimit(right, sampleRate, length);

    let maxAmp = 0;
    for (let i = 0; i < length; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(left[i]), Math.abs(right[i]));
    }
    if (maxAmp > 0) {
      const scale = 0.9 / maxAmp;
      for (let i = 0; i < length; i++) {
        left[i] *= scale;
        right[i] *= scale;
      }
    }

    return buffer;
  }

  applyDiffusion(data: Float32Array, dataRight: Float32Array, sampleRate: number, diffusion: number) {
    const delaySamples = Math.floor(0.05 * sampleRate);
    const gain = 0.7 * diffusion;
    const temp = new Float32Array(data.length);
    const tempRight = new Float32Array(dataRight.length);

    for (let i = delaySamples; i < data.length; i++) {
      temp[i] = -gain * data[i] + data[i - delaySamples] + gain * temp[i - delaySamples];
      tempRight[i] = -gain * dataRight[i] + dataRight[i - delaySamples] + gain * tempRight[i - delaySamples];
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = temp[i];
      dataRight[i] = tempRight[i];
    }
  }

  applyEcho(data: Float32Array, sampleRate: number, length: number) {
    if (this.echoDepth <= 0) return;

    const echoDelaySamples = Math.floor(this.echoTime * sampleRate);
    const echoGain = this.echoDepth;

    for (let i = echoDelaySamples; i < length; i++) {
      if (i - echoDelaySamples >= 0) {
        data[i] += data[i - echoDelaySamples] * echoGain;
      }
    }
  }

  applyModulation(data: Float32Array, sampleRate: number, length: number) {
    if (this.modulationDepth <= 0) return;

    const modulationRate = 1.0 / this.modulationTime;
    const modulationDepth = this.modulationDepth * 0.01;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const modulation = Math.sin(2 * Math.PI * modulationRate * t) * modulationDepth;
      const delaySamples = Math.floor(modulation * sampleRate * 0.001);
      if (i + delaySamples < length && i + delaySamples >= 0) {
        data[i] += data[i + delaySamples] * modulationDepth;
      }
    }
  }

  applyDecayHFLimit(data: Float32Array, sampleRate: number, length: number) {
    if (!this.decayHFLimit) return;

    const hfLimitTime = 0.1;
    const hfLimitSamples = Math.floor(hfLimitTime * sampleRate);

    for (let i = hfLimitSamples; i < length; i++) {
      const progress = (i - hfLimitSamples) / (length - hfLimitSamples);
      const hfLimitFactor = Math.exp(-progress * 5);
      data[i] *= hfLimitFactor;
    }
  }

  /**
   * Connect audio source into the engine - proper EAX routing
   */
  connectSource(source: AudioNode) {
    console.log("Connecting source to ReverbEngine");
    source.connect(this.earlyReflections);
    source.connect(this.dryGain);
  }

  getOutput(): AudioNode {
    return this.output;
  }

  /**
   * Get current EAX parameters for debugging
   */
  getEAXParameters() {
    return {
      density: this.density,
      diffusion: this.diffusion,
      decayHFRatio: this.decayHFRatio,
      decayLFRatio: this.decayLFRatio,
      wetGain: this.wetGain.gain.value,
      dryGain: this.dryGain.gain.value,
      earlyGain: this.earlyGain.gain.value,
      lateGain: this.lateGain.gain.value,
      hfFilterFreq: this.hfFilter.frequency.value,
      lfFilterFreq: this.lfFilter.frequency.value,
      airAbsorptionFreq: this.airAbsorptionFilter.frequency.value
    };
  }

  /**
   * Enable/disable reverb processing
   */
  setEnabled(enabled: boolean) {
    if (enabled) {
      this.wetGain.gain.value = this.cachedWetGain; // Restore cached value
    } else {
      this.cachedWetGain = this.wetGain.gain.value; // Cache current value
      this.wetGain.gain.value = 0;
    }
  }

  /**
   * Update listener position and orientation for 3D audio processing
   */
  updateListener(position: [number, number, number], orientation: [number, number, number]) {
    this.listenerPosition = position;
    this.listenerOrientation = orientation;
  }

  /**
   * Calculate proper 3D positioning using EAX-style spatial processing
   */
  calculate3DPosition(relativePos: [number, number, number], channel: number) {
    const distance = Math.sqrt(
      relativePos[0] ** 2 + relativePos[1] ** 2 + relativePos[2] ** 2
    );
    if (distance < 0.01) return 1.0;

    const orientX = this.listenerOrientation[0];
    const orientY = this.listenerOrientation[1];
    const orientZ = this.listenerOrientation[2];
    const relativeX = relativePos[0] / distance;
    const relativeY = relativePos[1] / distance;
    const relativeZ = relativePos[2] / distance;

    const dotProduct = relativeX * orientX + relativeY * orientY + relativeZ * orientZ;
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct / distance)));

    const azimuth = Math.atan2(relativeX, relativeZ);
    const elevation = Math.asin(relativeY / distance);

    const leftGain = this.calculateChannelGain(azimuth, elevation, distance, 0);
    const rightGain = this.calculateChannelGain(azimuth, elevation, distance, 1);

    return channel === 0 ? leftGain : rightGain;
  }

  /**
   * Calculate channel gain using EAX-style HRTF simulation
   */
  calculateChannelGain(azimuth: number, elevation: number, distance: number, channel: number) {
    const azimuthDeg = (azimuth * 180 / Math.PI + 360) % 360;
    const headShadow = this.calculateHeadShadow(azimuthDeg, channel);
    const distanceAttenuation = this.calculateDistanceAttenuation(distance);
    const elevationFilter = this.calculateElevationFilter(elevation);
    return headShadow * distanceAttenuation * elevationFilter;
  }

  calculateHeadShadow(azimuthDeg: number, channel: number) {
    const isLeftChannel = channel === 0;
    const isLeftSide = azimuthDeg > 180;

    if (isLeftChannel && isLeftSide) {
      return 1.0;
    } else if (!isLeftChannel && !isLeftSide) {
      return 1.0;
    } else {
      const shadowAngle = Math.abs(azimuthDeg - (isLeftChannel ? 0 : 360));
      const shadowFactor = Math.cos(shadowAngle * Math.PI / 180) * 0.3 + 0.7;
      return Math.max(0.1, shadowFactor);
    }
  }

  calculateDistanceAttenuation(distance: number) {
    const minDistance = 1.0;
    const maxDistance = 100.0;
    const rolloffFactor = 1.0;

    if (distance <= minDistance) {
      return 1.0;
    }

    const attenuation = minDistance / (minDistance + rolloffFactor * (distance - minDistance));
    return Math.max(0.0, Math.min(1.0, attenuation));
  }

  calculateElevationFilter(elevation: number) {
    const elevationDeg = elevation * 180 / Math.PI;

    if (elevationDeg > 45) {
      return 1.1;
    } else if (elevationDeg < -45) {
      return 0.9;
    } else {
      return 1.0;
    }
  }

  calculatePanFactor(pan: [number, number, number], channel: number) {
    return this.calculate3DPosition(pan, channel);
  }

}