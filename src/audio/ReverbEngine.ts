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
    this.context = context;

    // Core
    this.convolver = context.createConvolver();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.output = context.createGain();

    // Early reflections
    this.earlyReflections = context.createDelay();
    this.earlyGain = context.createGain();
    this.earlyPanner = context.createStereoPanner();

    // Late reverb
    this.lateDelay = context.createDelay();
    this.lateGain = context.createGain();
    this.latePanner = context.createStereoPanner();

    // Filters - EAX proper filter chain
    this.hfFilter = context.createBiquadFilter();
    this.hfFilter.type = "highpass";  // Air absorption filter
    this.hfFilter.Q.value = 0.7;
    
    this.lfFilter = context.createBiquadFilter();
    this.lfFilter.type = "lowpass";   // LF emphasis filter
    this.lfFilter.Q.value = 0.7;
    
    this.airAbsorptionFilter = context.createBiquadFilter();
    this.airAbsorptionFilter.type = "highpass";
    this.airAbsorptionFilter.Q.value = 1.0;

    // Echo
    this.echoDelay = context.createDelay();
    this.echoGain = context.createGain();
    this.echoDelay.connect(this.echoGain).connect(this.echoDelay); // feedback loop

    // Modulation
    this.lfo = context.createOscillator();
    this.lfoGain = context.createGain();

    this.lfo.connect(this.lfoGain);
    this.lfo.start();

    // Routing - EAX proper reverb chain (no parallel paths)
    this.convolver.connect(this.hfFilter).connect(this.lfFilter).connect(this.airAbsorptionFilter).connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.dryGain.connect(this.output);
    this.output.connect(context.destination);
    
    // Note: Early reflections, late delay, and echo are now handled by the convolver impulse response
    // This prevents doubling and creates proper reverb instead of echo effects
  }

  /**
   * Load preset and apply all parameters with correct EAX mapping
   */
  loadPreset(index: number) {
    if(this.currentPreset == index){
      return;
    }

    const preset = EAXPresets.PresetFromIndex(index);
    if(!preset){
      console.error('EAX preset not found', index);
      return;
    }

    // Store EAX-specific parameters
    this.density = preset.density;
    this.diffusion = preset.diffusion;
    this.decayHFRatio = preset.decayHFRatio;
    this.decayLFRatio = preset.decayLFRatio;
    
    // Store missing EAX features
    this.reflectionsPan = preset.reflectionsPan || [0, 0, 0];
    this.lateReverbPan = preset.lateReverbPan || [0, 0, 0];
    this.echoTime = preset.echoTime || 0.25;
    this.echoDepth = preset.echoDepth || 0.0;
    this.modulationTime = preset.modulationTime || 0.25;
    this.modulationDepth = preset.modulationDepth || 0.0;
    this.decayHFLimit = preset.decayHFLimit || false;

    // Generate proper EAX impulse response
    this.convolver.buffer = this.generateEAXImpulse(preset);

    // Wet/Dry mix - EAX uses gain for overall reverb level
    const reverbLevel = preset.gain * preset.lateReverbGain;
    this.wetGain.gain.value = reverbLevel;
    this.cachedWetGain = reverbLevel; // Cache for enable/disable
    this.dryGain.gain.value = 1.0 - preset.gain;

    // Early reflections and late reverb are now handled by the convolver impulse response
    // This prevents doubling and creates proper reverb instead of echo effects

    // EAX Filter chain - proper frequency response
    this.hfFilter.frequency.value = preset.hfReference;
    this.hfFilter.gain.value = preset.gainHF;
    
    this.lfFilter.frequency.value = preset.lfReference;
    this.lfFilter.gain.value = preset.gainLF;
    
    // Air absorption simulation
    this.airAbsorptionFilter.frequency.value = preset.hfReference;
    this.airAbsorptionFilter.gain.value = preset.airAbsorptionGainHF;

    // Echo and modulation are now handled by the convolver impulse response
    // This prevents doubling and creates proper reverb instead of echo effects

    // Room rolloff factor
    this.output.gain.value = 1.0 - preset.roomRolloffFactor;

    this.currentPreset = index;
  }

  /**
   * Generate proper EAX impulse response with early reflections and late reverb
   */
  private generateEAXImpulse(preset: any): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const length = Math.min(sampleRate * preset.decayTime, sampleRate * 10); // Max 10 seconds
    const impulse = this.context.createBuffer(2, length, sampleRate);

    // EAX uses different decay curves for different frequency ranges
    const hfDecayTime = preset.decayTime * preset.decayHFRatio;
    const lfDecayTime = preset.decayTime * preset.decayLFRatio;

    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const data = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const progress = i / length;
        
        // Early reflections (first 80ms) - discrete echoes with 3D positioning
        const earlyReflectionsTime = 0.08; // 80ms
        let earlyComponent = 0;
        if (t < earlyReflectionsTime) {
          const earlyProgress = t / earlyReflectionsTime;
          const earlyDecay = Math.exp(-t * 8 / earlyReflectionsTime);
          
          // Apply 3D positioning to early reflections
          const panFactor = this.calculatePanFactor(this.reflectionsPan, channel);
          earlyComponent = (Math.random() * 2 - 1) * earlyDecay * preset.reflectionsGain * preset.gain * panFactor;
        }
        
        // Late reverb (after 80ms) - dense reverb tail
        let lateComponent = 0;
        if (t >= earlyReflectionsTime) {
          const lateTime = t - earlyReflectionsTime;
          const lateDecay = Math.exp(-lateTime * 3 / preset.decayTime);
          
          // Density affects initial reflections
          const densityFactor = Math.pow(progress, preset.density);
          
          // Diffusion affects reverb character
          const diffusionFactor = 1.0 + (preset.diffusion - 1.0) * Math.sin(progress * Math.PI);
          
          // Frequency-dependent decay
          const hfDecay = Math.exp(-lateTime * 3 / hfDecayTime);
          const lfDecay = Math.exp(-lateTime * 3 / lfDecayTime);
          
          // Combine frequency components for late reverb with 3D positioning
          const hfComponent = (Math.random() * 2 - 1) * hfDecay * preset.gainHF;
          const lfComponent = (Math.random() * 2 - 1) * lfDecay * preset.gainLF;
          const midComponent = (Math.random() * 2 - 1) * lateDecay * preset.gain;
          
          // Apply 3D positioning to late reverb
          const latePanFactor = this.calculatePanFactor(this.lateReverbPan, channel);
          
          lateComponent = (hfComponent + lfComponent + midComponent) * 
                         densityFactor * 
                         diffusionFactor * 
                         preset.lateReverbGain * 
                         preset.gain *
                         latePanFactor;
        }
        
        // Combine early and late components
        data[i] = earlyComponent + lateComponent;
      }
      
      // Apply missing EAX features to the channel data
      this.applyEcho(data, sampleRate, length);
      this.applyModulation(data, sampleRate, length);
      this.applyDecayHFLimit(data, sampleRate, length);
    }
    
    return impulse;
  }

  /**
   * Connect audio source into the engine - proper EAX routing
   */
  connectSource(source: AudioNode) {
    // Dry signal path (unprocessed)
    source.connect(this.dryGain);
    
    // Wet signal path (reverb only through convolver)
    source.connect(this.convolver);
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
  private calculate3DPosition(pan: [number, number, number], channel: number): number {
    const [x, y, z] = pan;
    const [listenerX, listenerY, listenerZ] = this.listenerPosition;
    const [orientX, orientY, orientZ] = this.listenerOrientation;
    
    // Calculate relative position from listener
    const relativeX = x - listenerX;
    const relativeY = y - listenerY;
    const relativeZ = z - listenerZ;
    
    // Calculate distance for distance-based effects
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY + relativeZ * relativeZ);
    
    // Calculate angle from listener's forward direction
    const dotProduct = relativeX * orientX + relativeY * orientY + relativeZ * orientZ;
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct / distance)));
    
    // EAX-style 3D processing
    const azimuth = Math.atan2(relativeX, relativeZ); // Left/right angle
    const elevation = Math.asin(relativeY / distance); // Up/down angle
    
    // Convert to stereo positioning using HRTF-like processing
    const leftGain = this.calculateChannelGain(azimuth, elevation, distance, 0);
    const rightGain = this.calculateChannelGain(azimuth, elevation, distance, 1);
    
    return channel === 0 ? leftGain : rightGain;
  }

  /**
   * Calculate channel gain using EAX-style HRTF simulation
   */
  private calculateChannelGain(azimuth: number, elevation: number, distance: number, channel: number): number {
    // Convert azimuth to degrees for easier processing
    const azimuthDeg = (azimuth * 180 / Math.PI + 360) % 360;
    
    // EAX-style head shadowing simulation
    const headShadow = this.calculateHeadShadow(azimuthDeg, channel);
    
    // Distance-based attenuation (EAX rolloff)
    const distanceAttenuation = this.calculateDistanceAttenuation(distance);
    
    // Elevation-based filtering (simulates pinna effects)
    const elevationFilter = this.calculateElevationFilter(elevation);
    
    // Combine all factors
    return headShadow * distanceAttenuation * elevationFilter;
  }

  /**
   * Simulate head shadowing effects (HRTF-like)
   */
  private calculateHeadShadow(azimuthDeg: number, channel: number): number {
    // Head shadowing is more pronounced for sounds coming from the opposite side
    const isLeftChannel = channel === 0;
    const isLeftSide = azimuthDeg > 180;
    
    if (isLeftChannel && isLeftSide) {
      // Sound from left side to left ear - minimal shadowing
      return 1.0;
    } else if (!isLeftChannel && !isLeftSide) {
      // Sound from right side to right ear - minimal shadowing
      return 1.0;
    } else {
      // Cross-ear shadowing - simulate head shadow
      const shadowAngle = Math.abs(azimuthDeg - (isLeftChannel ? 0 : 360));
      const shadowFactor = Math.cos(shadowAngle * Math.PI / 180) * 0.3 + 0.7;
      return Math.max(0.1, shadowFactor);
    }
  }

  /**
   * Calculate distance-based attenuation (EAX rolloff)
   */
  private calculateDistanceAttenuation(distance: number): number {
    // EAX uses logarithmic distance attenuation
    const minDistance = 1.0; // Minimum distance for full volume
    const maxDistance = 100.0; // Maximum distance
    const rolloffFactor = 1.0; // EAX rolloff factor
    
    if (distance <= minDistance) {
      return 1.0;
    }
    
    // Logarithmic rolloff (more realistic than linear)
    const attenuation = minDistance / (minDistance + rolloffFactor * (distance - minDistance));
    return Math.max(0.0, Math.min(1.0, attenuation));
  }

  /**
   * Calculate elevation-based filtering (simulates pinna effects)
   */
  private calculateElevationFilter(elevation: number): number {
    // Convert elevation to degrees
    const elevationDeg = elevation * 180 / Math.PI;
    
    // Pinna filtering - higher frequencies are more directional
    if (elevationDeg > 45) {
      // Above head - slight high-frequency boost
      return 1.1;
    } else if (elevationDeg < -45) {
      // Below head - slight high-frequency cut
      return 0.9;
    } else {
      // At ear level - neutral
      return 1.0;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  private calculatePanFactor(pan: [number, number, number], channel: number): number {
    return this.calculate3DPosition(pan, channel);
  }

  /**
   * Apply echo processing to the impulse response
   */
  private applyEcho(data: Float32Array, sampleRate: number, length: number): void {
    if (this.echoDepth <= 0) return;
    
    const echoDelaySamples = Math.floor(this.echoTime * sampleRate);
    const echoGain = this.echoDepth;
    
    for (let i = echoDelaySamples; i < length; i++) {
      data[i] += data[i - echoDelaySamples] * echoGain;
    }
  }

  /**
   * Apply modulation (chorus/flanging) to the impulse response
   */
  private applyModulation(data: Float32Array, sampleRate: number, length: number): void {
    if (this.modulationDepth <= 0) return;
    
    const modulationRate = 1.0 / this.modulationTime;
    const modulationDepth = this.modulationDepth * 0.01;
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const modulation = Math.sin(2 * Math.PI * modulationRate * t) * modulationDepth;
      const delaySamples = Math.floor(modulation * sampleRate * 0.001); // Max 1ms delay
      
      if (i + delaySamples < length) {
        data[i] += data[i + delaySamples] * modulationDepth;
      }
    }
  }

  /**
   * Apply decay HF limit (prevents excessive HF decay)
   */
  private applyDecayHFLimit(data: Float32Array, sampleRate: number, length: number): void {
    if (!this.decayHFLimit) return;
    
    const hfLimitTime = 0.1; // 100ms limit
    const hfLimitSamples = Math.floor(hfLimitTime * sampleRate);
    
    for (let i = hfLimitSamples; i < length; i++) {
      const progress = (i - hfLimitSamples) / (length - hfLimitSamples);
      const hfLimitFactor = Math.exp(-progress * 5); // Exponential rolloff
      data[i] *= hfLimitFactor;
    }
  }
}