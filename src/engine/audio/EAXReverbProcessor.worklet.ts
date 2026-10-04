/**
 * EAXReverbProcessor - procedural EAX/EFX-style reverb for Web Audio.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @license GPLv3
 * @see https://github.com/kcat/openal-soft/blob/master/alc/effects/reverb.cpp
 */

import type { EAXReverbParams, EAXReverbProcessorMessage } from "./EAXReverbTypes";

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: AudioWorkletNodeOptions);
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}
declare function registerProcessor(
  name: string,
  processorCtor: typeof AudioWorkletProcessor,
): void;

const NUM_LINES = 4;
const SPEED_OF_SOUND = 343.3;
const DECAY_GAIN = 0.001; // -60 dB amplitude target.
const INV_SQRT2 = 0.7071067811865476;
const SQRT3 = Math.sqrt(3);
const MODULATION_DEPTH_COEFF = 0.05;
const DEFAULT_MODULATION_TIME = 0.25;

// Delay geometry follows the same average-room model used by modern OpenAL Soft.
// These are geometry constants, not copied DSP code. The worklet below is a
// purpose-built browser implementation optimized for a single shared reverb bus.
const EARLY_TAP_LENGTHS = new Float32Array([
  0.0,
  0.001010676,
  0.002126553,
  0.00335858,
]);
const EARLY_ALLPASS_LENGTHS = new Float32Array([
  0.000485484,
  0.0005360178,
  0.0005918117,
  0.000653413,
]);
const EARLY_LINE_LENGTHS = new Float32Array([
  0.00299252,
  0.005456575,
  0.007688329,
  0.009709681,
]);
const LATE_ALLPASS_LENGTHS = new Float32Array([
  0.00080914,
  0.001019453,
  0.001407968,
  0.00161828,
]);
const LATE_LINE_LENGTHS = new Float32Array([
  0.009709681,
  0.01223343,
  0.01689561,
  0.01941936,
]);

const DEFAULT_PARAMS: EAXReverbParams = {
  density: 1.0,
  diffusion: 1.0,
  gain: 0.3162,
  gainHF: 0.8913,
  gainLF: 1.0,
  decayTime: 1.49,
  decayHFRatio: 0.83,
  decayLFRatio: 1.0,
  reflectionsGain: 0.05,
  reflectionsDelay: 0.007,
  reflectionsPan: [0, 0, 0],
  lateReverbGain: 1.2589,
  lateReverbDelay: 0.011,
  lateReverbPan: [0, 0, 0],
  echoTime: 0.25,
  echoDepth: 0.0,
  modulationTime: 0.25,
  modulationDepth: 0.0,
  airAbsorptionGainHF: 0.9943,
  hfReference: 5000,
  lfReference: 250,
  roomRolloffFactor: 0,
  decayHFLimit: true,
  transitionTime: 0.08,
};

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function nextPowerOfTwo(value: number): number {
  let v = Math.max(2, Math.ceil(value));
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  return (v + 1) >>> 0;
}

function decayCoeff(lengthSeconds: number, decayTime: number): number {
  return Math.pow(DECAY_GAIN, lengthSeconds / Math.max(0.1, decayTime));
}

function densityMultiplier(density: number): number {
  // EFX density is a cubed room-size control. A multiplier of 1..10 maps
  // approximately to an average 5..50 meter environment.
  return Math.max(1.0, Math.cbrt(clamp(density, 0, 1) * 1000.0));
}

function limitedHFRatio(
  ratio: number,
  airAbsorptionGainHF: number,
  decayTime: number,
): number {
  const gain = clamp(airAbsorptionGainHF, 0.0001, 1.0);
  const decayLength = Math.log10(gain) * Math.max(0.1, decayTime) / -3.0;
  if (!(decayLength > 0)) return ratio;
  const limitRatio = 1.0 / (SPEED_OF_SOUND * decayLength);
  return Math.min(ratio, limitRatio);
}

/**
 * RBJ-style shelving biquad. Coefficients are updated outside the sample loop;
 * process is transposed direct-form II and allocation free.
 */
class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  clear(): void {
    this.z1 = 0;
    this.z2 = 0;
  }

  setLowShelf(frequency: number, gain: number): void {
    this.setShelf(frequency, gain, false);
  }

  setHighShelf(frequency: number, gain: number): void {
    this.setShelf(frequency, gain, true);
  }

  private setShelf(frequency: number, gain: number, high: boolean): void {
    const g = clamp(gain, 0.0001, 100);
    if (Math.abs(g - 1) < 1e-5) {
      this.b0 = 1;
      this.b1 = 0;
      this.b2 = 0;
      this.a1 = 0;
      this.a2 = 0;
      return;
    }

    const f = clamp(frequency, 10, sampleRate * 0.45);
    const A = Math.sqrt(g);
    const w0 = 2 * Math.PI * f / sampleRate;
    const cosw = Math.cos(w0);
    const sinw = Math.sin(w0);
    const alpha = sinw / Math.SQRT2;
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;

    let b0: number;
    let b1: number;
    let b2: number;
    let a0: number;
    let a1: number;
    let a2: number;

    if (high) {
      b0 = A * ((A + 1) + (A - 1) * cosw + twoSqrtAAlpha);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
      b2 = A * ((A + 1) + (A - 1) * cosw - twoSqrtAAlpha);
      a0 = (A + 1) - (A - 1) * cosw + twoSqrtAAlpha;
      a1 = 2 * ((A - 1) - (A + 1) * cosw);
      a2 = (A + 1) - (A - 1) * cosw - twoSqrtAAlpha;
    } else {
      b0 = A * ((A + 1) - (A - 1) * cosw + twoSqrtAAlpha);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosw);
      b2 = A * ((A + 1) - (A - 1) * cosw - twoSqrtAAlpha);
      a0 = (A + 1) + (A - 1) * cosw + twoSqrtAAlpha;
      a1 = -2 * ((A - 1) + (A + 1) * cosw);
      a2 = (A + 1) + (A - 1) * cosw - twoSqrtAAlpha;
    }

    const invA0 = 1 / a0;
    this.b0 = b0 * invA0;
    this.b1 = b1 * invA0;
    this.b2 = b2 * invA0;
    this.a1 = a1 * invA0;
    this.a2 = a2 * invA0;
  }

  process(input: number): number {
    const output = this.b0 * input + this.z1;
    this.z1 = this.b1 * input - this.a1 * output + this.z2;
    this.z2 = this.b2 * input - this.a2 * output;
    return output;
  }
}

class ShelfPair {
  readonly low = new Biquad();
  readonly high = new Biquad();
  midGain = 1;

  clear(): void {
    this.low.clear();
    this.high.clear();
  }

  setMaster(lfReference: number, hfReference: number, gainLF: number, gainHF: number): void {
    this.midGain = 1;
    this.low.setLowShelf(lfReference, gainLF);
    this.high.setHighShelf(hfReference, gainHF);
  }

  setT60(
    lfReference: number,
    hfReference: number,
    lowGain: number,
    midGain: number,
    highGain: number,
  ): void {
    this.midGain = midGain;
    this.low.setLowShelf(lfReference, lowGain / Math.max(1e-6, midGain));
    this.high.setHighShelf(hfReference, highGain / Math.max(1e-6, midGain));
  }

  process(input: number): number {
    return this.high.process(this.low.process(input)) * this.midGain;
  }
}

class EAXReverbProcessor extends AudioWorkletProcessor {
  private enabled = true;
  private forceDerivedUpdate = true;
  private sampleIndex = 0;
  private lfoPhase = 0;

  private current: EAXReverbParams = { ...DEFAULT_PARAMS };
  private target: EAXReverbParams = { ...DEFAULT_PARAMS };

  // Fixed-capacity rings: no allocation or resizing is ever done in process.
  private readonly mainRingSize: number;
  private readonly mainRingMask: number;
  private readonly mainDelay: Float32Array[];

  private readonly earlyApRingSize: number;
  private readonly earlyApMask: number;
  private readonly earlyAp: Float32Array[];

  private readonly earlyLineRingSize: number;
  private readonly earlyLineMask: number;
  private readonly earlyLine: Float32Array[];

  private readonly lateInputRingSize: number;
  private readonly lateInputRingMask: number;
  private readonly lateInput: Float32Array[];

  private readonly lateApRingSize: number;
  private readonly lateApMask: number;
  private readonly lateAp: Float32Array[];

  private readonly lateRingSize: number;
  private readonly lateRingMask: number;
  private readonly lateDelay: Float32Array[];

  private readonly echoRingSize: number;
  private readonly echoRingMask: number;
  private readonly echoDelay: Float32Array;

  private readonly masterFilterL = new ShelfPair();
  private readonly masterFilterR = new ShelfPair();
  private readonly lateFilters = [
    new ShelfPair(),
    new ShelfPair(),
    new ShelfPair(),
    new ShelfPair(),
  ];

  // Derived parameters, updated once per render quantum.
  private densityMult = 10;
  private earlyAllpassCoeff = INV_SQRT2;
  private lateAllpassCoeff = INV_SQRT2;
  private earlySecondaryCoeff = 0.8;
  private scatterX = 0;
  private scatterY = 1 / SQRT3;
  private densityGain = 0.3;
  private modulationDepthSamples = 0;
  private modulationStep = 0;

  private readonly earlyTapSamples = new Float32Array(NUM_LINES);
  private readonly earlyApSamples = new Int32Array(NUM_LINES);
  private readonly earlyLineSamples = new Int32Array(NUM_LINES);
  private readonly lateInputTapSamples = new Float32Array(NUM_LINES);
  private readonly lateApSamples = new Int32Array(NUM_LINES);
  private readonly lateLineSamples = new Float32Array(NUM_LINES);

  private readonly earlyL = new Float32Array(NUM_LINES);
  private readonly earlyR = new Float32Array(NUM_LINES);
  private readonly lateL = new Float32Array(NUM_LINES);
  private readonly lateR = new Float32Array(NUM_LINES);

  // Scratch vectors avoid allocations in the audio callback.
  private v0 = 0;
  private v1 = 0;
  private v2 = 0;
  private v3 = 0;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);

    // EFX limits are small. These capacities intentionally reserve the maximum
    // room-size-scaled delays once and then reuse them forever.
    this.mainRingSize = nextPowerOfTwo(sampleRate * 0.55);
    this.mainRingMask = this.mainRingSize - 1;
    this.mainDelay = this.createLines(this.mainRingSize);

    this.earlyApRingSize = nextPowerOfTwo(sampleRate * 0.008);
    this.earlyApMask = this.earlyApRingSize - 1;
    this.earlyAp = this.createLines(this.earlyApRingSize);

    this.earlyLineRingSize = nextPowerOfTwo(sampleRate * 0.11);
    this.earlyLineMask = this.earlyLineRingSize - 1;
    this.earlyLine = this.createLines(this.earlyLineRingSize);

    this.lateInputRingSize = nextPowerOfTwo(sampleRate * 0.15);
    this.lateInputRingMask = this.lateInputRingSize - 1;
    this.lateInput = this.createLines(this.lateInputRingSize);

    this.lateApRingSize = nextPowerOfTwo(sampleRate * 0.020);
    this.lateApMask = this.lateApRingSize - 1;
    this.lateAp = this.createLines(this.lateApRingSize);

    this.lateRingSize = nextPowerOfTwo(sampleRate * 0.23);
    this.lateRingMask = this.lateRingSize - 1;
    this.lateDelay = this.createLines(this.lateRingSize);

    this.echoRingSize = nextPowerOfTwo(sampleRate * 0.30);
    this.echoRingMask = this.echoRingSize - 1;
    this.echoDelay = new Float32Array(this.echoRingSize);

    this.port.onmessage = (event: MessageEvent<EAXReverbProcessorMessage>) => {
      const message = event.data;
      if (!message) return;

      if (message.type === "params") {
        this.setTargetParams(message.params);
      } else if (message.type === "reset") {
        this.resetState();
      } else if (message.type === "enabled") {
        this.enabled = message.enabled;
      }
    };

    this.updateDerived();
  }

  private createLines(length: number): Float32Array[] {
    return [
      new Float32Array(length),
      new Float32Array(length),
      new Float32Array(length),
      new Float32Array(length),
    ];
  }

  private setTargetParams(params: EAXReverbParams): void {
    this.forceDerivedUpdate = true;
    this.target = {
      density: clamp(params.density, 0, 1),
      diffusion: clamp(params.diffusion, 0, 1),
      gain: clamp(params.gain, 0, 1),
      gainHF: clamp(params.gainHF, 0, 10),
      gainLF: clamp(params.gainLF, 0, 10),
      decayTime: clamp(params.decayTime, 0.1, 20),
      decayHFRatio: clamp(params.decayHFRatio, 0.1, 2),
      decayLFRatio: clamp(params.decayLFRatio, 0.1, 2),
      reflectionsGain: clamp(params.reflectionsGain, 0, 10),
      reflectionsDelay: clamp(params.reflectionsDelay, 0, 0.3),
      reflectionsPan: [
        clamp(params.reflectionsPan?.[0] ?? 0, -1, 1),
        clamp(params.reflectionsPan?.[1] ?? 0, -1, 1),
        clamp(params.reflectionsPan?.[2] ?? 0, -1, 1),
      ],
      lateReverbGain: clamp(params.lateReverbGain, 0, 10),
      lateReverbDelay: clamp(params.lateReverbDelay, 0, 0.1),
      lateReverbPan: [
        clamp(params.lateReverbPan?.[0] ?? 0, -1, 1),
        clamp(params.lateReverbPan?.[1] ?? 0, -1, 1),
        clamp(params.lateReverbPan?.[2] ?? 0, -1, 1),
      ],
      echoTime: clamp(params.echoTime, 0.075, 0.25),
      echoDepth: clamp(params.echoDepth, 0, 1),
      modulationTime: clamp(params.modulationTime, 0.04, 4),
      modulationDepth: clamp(params.modulationDepth, 0, 1),
      airAbsorptionGainHF: clamp(params.airAbsorptionGainHF, 0.892, 1),
      hfReference: clamp(params.hfReference, 1000, 20000),
      lfReference: clamp(params.lfReference, 20, 1000),
      roomRolloffFactor: clamp(params.roomRolloffFactor, 0, 10),
      decayHFLimit: !!params.decayHFLimit,
      transitionTime: clamp(params.transitionTime || 0.08, 0.005, 2),
    };
  }

  private advanceParameters(frameCount: number): boolean {
    const c = this.current;
    const t = this.target;
    const moving =
      Math.abs(c.density - t.density) > 1e-5 ||
      Math.abs(c.diffusion - t.diffusion) > 1e-5 ||
      Math.abs(c.gain - t.gain) > 1e-5 ||
      Math.abs(c.gainHF - t.gainHF) > 1e-5 ||
      Math.abs(c.gainLF - t.gainLF) > 1e-5 ||
      Math.abs(c.decayTime - t.decayTime) > 1e-4 ||
      Math.abs(c.decayHFRatio - t.decayHFRatio) > 1e-5 ||
      Math.abs(c.decayLFRatio - t.decayLFRatio) > 1e-5 ||
      Math.abs(c.reflectionsGain - t.reflectionsGain) > 1e-5 ||
      Math.abs(c.reflectionsDelay - t.reflectionsDelay) > 1e-6 ||
      Math.abs(c.lateReverbGain - t.lateReverbGain) > 1e-5 ||
      Math.abs(c.lateReverbDelay - t.lateReverbDelay) > 1e-6 ||
      Math.abs(c.echoTime - t.echoTime) > 1e-5 ||
      Math.abs(c.echoDepth - t.echoDepth) > 1e-5 ||
      Math.abs(c.modulationTime - t.modulationTime) > 1e-5 ||
      Math.abs(c.modulationDepth - t.modulationDepth) > 1e-5 ||
      Math.abs(c.airAbsorptionGainHF - t.airAbsorptionGainHF) > 1e-6 ||
      Math.abs(c.hfReference - t.hfReference) > 0.05 ||
      Math.abs(c.lfReference - t.lfReference) > 0.01 ||
      Math.abs(c.reflectionsPan[0] - t.reflectionsPan[0]) > 1e-5 ||
      Math.abs(c.reflectionsPan[1] - t.reflectionsPan[1]) > 1e-5 ||
      Math.abs(c.reflectionsPan[2] - t.reflectionsPan[2]) > 1e-5 ||
      Math.abs(c.lateReverbPan[0] - t.lateReverbPan[0]) > 1e-5 ||
      Math.abs(c.lateReverbPan[1] - t.lateReverbPan[1]) > 1e-5 ||
      Math.abs(c.lateReverbPan[2] - t.lateReverbPan[2]) > 1e-5;

    c.transitionTime = t.transitionTime;
    c.decayHFLimit = t.decayHFLimit;
    if (!moving) return false;

    const time = Math.max(0.005, t.transitionTime);
    const alpha = 1 - Math.exp(-frameCount / (sampleRate * time));

    c.density += (t.density - c.density) * alpha;
    c.diffusion += (t.diffusion - c.diffusion) * alpha;
    c.gain += (t.gain - c.gain) * alpha;
    c.gainHF += (t.gainHF - c.gainHF) * alpha;
    c.gainLF += (t.gainLF - c.gainLF) * alpha;
    c.decayTime += (t.decayTime - c.decayTime) * alpha;
    c.decayHFRatio += (t.decayHFRatio - c.decayHFRatio) * alpha;
    c.decayLFRatio += (t.decayLFRatio - c.decayLFRatio) * alpha;
    c.reflectionsGain += (t.reflectionsGain - c.reflectionsGain) * alpha;
    c.reflectionsDelay += (t.reflectionsDelay - c.reflectionsDelay) * alpha;
    c.lateReverbGain += (t.lateReverbGain - c.lateReverbGain) * alpha;
    c.lateReverbDelay += (t.lateReverbDelay - c.lateReverbDelay) * alpha;
    c.echoTime += (t.echoTime - c.echoTime) * alpha;
    c.echoDepth += (t.echoDepth - c.echoDepth) * alpha;
    c.modulationTime += (t.modulationTime - c.modulationTime) * alpha;
    c.modulationDepth += (t.modulationDepth - c.modulationDepth) * alpha;
    c.airAbsorptionGainHF += (t.airAbsorptionGainHF - c.airAbsorptionGainHF) * alpha;
    c.hfReference += (t.hfReference - c.hfReference) * alpha;
    c.lfReference += (t.lfReference - c.lfReference) * alpha;
    c.roomRolloffFactor += (t.roomRolloffFactor - c.roomRolloffFactor) * alpha;

    for (let i = 0; i < 3; i++) {
      c.reflectionsPan[i] += (t.reflectionsPan[i] - c.reflectionsPan[i]) * alpha;
      c.lateReverbPan[i] += (t.lateReverbPan[i] - c.lateReverbPan[i]) * alpha;
    }
    return true;
  }

  private updateDerived(): void {
    const p = this.current;
    this.densityMult = densityMultiplier(p.density);

    this.earlyAllpassCoeff = p.diffusion * p.diffusion * INV_SQRT2;
    this.lateAllpassCoeff = this.earlyAllpassCoeff;

    const scatterAngle = p.diffusion * Math.atan(SQRT3);
    this.scatterX = Math.cos(scatterAngle);
    this.scatterY = Math.sin(scatterAngle) / SQRT3;

    const lfRef = Math.min(p.lfReference, sampleRate * 0.45);
    const hfRef = Math.min(Math.max(p.hfReference, lfRef + 10), sampleRate * 0.45);
    this.masterFilterL.setMaster(lfRef, hfRef, p.gainLF, p.gainHF);
    this.masterFilterR.setMaster(lfRef, hfRef, p.gainLF, p.gainHF);

    let hfRatio = p.decayHFRatio;
    if (p.decayHFLimit) {
      hfRatio = limitedHFRatio(hfRatio, p.airAbsorptionGainHF, p.decayTime);
    }
    const hfDecayTime = Math.max(0.1, p.decayTime * hfRatio);
    const lfDecayTime = Math.max(0.1, p.decayTime * p.decayLFRatio);

    let lateLengthSum = 0;
    let lateApSum = 0;
    for (let i = 0; i < NUM_LINES; i++) {
      const earlyTap = p.reflectionsDelay + EARLY_TAP_LENGTHS[i] * this.densityMult;
      this.earlyTapSamples[i] = earlyTap * sampleRate;
      this.earlyApSamples[i] = Math.max(1, Math.round(EARLY_ALLPASS_LENGTHS[i] * this.densityMult * sampleRate));
      this.earlyLineSamples[i] = Math.max(1, Math.round(EARLY_LINE_LENGTHS[i] * this.densityMult * sampleRate));

      const lateOffset = (LATE_LINE_LENGTHS[i] - LATE_LINE_LENGTHS[0]) * 0.25 * this.densityMult;
      this.lateInputTapSamples[i] = (p.lateReverbDelay + lateOffset) * sampleRate;
      this.lateApSamples[i] = Math.max(1, Math.round(LATE_ALLPASS_LENGTHS[i] * this.densityMult * sampleRate));

      const lineLength = LATE_LINE_LENGTHS[i] * this.densityMult;
      const apLength = LATE_ALLPASS_LENGTHS[i] * this.densityMult;
      const effectiveLength = lineLength + apLength;
      this.lateLineSamples[i] = Math.max(1, lineLength * sampleRate);
      const lowGain = decayCoeff(effectiveLength, lfDecayTime);
      const midGain = decayCoeff(effectiveLength, p.decayTime);
      const highGain = decayCoeff(effectiveLength, hfDecayTime);
      this.lateFilters[i].setT60(lfRef, hfRef, lowGain, midGain, highGain);

      lateLengthSum += lineLength;
      lateApSum += apLength;
    }

    const avgEarlyLength = (
      EARLY_LINE_LENGTHS[0] + EARLY_LINE_LENGTHS[1] +
      EARLY_LINE_LENGTHS[2] + EARLY_LINE_LENGTHS[3]
    ) * 0.25 * this.densityMult;
    this.earlySecondaryCoeff = decayCoeff(avgEarlyLength, p.decayTime);

    const avgCycle = (lateLengthSum + lateApSum) / NUM_LINES;
    const weightedDecay = Math.max(0.1, (
      lfDecayTime * 0.18 + p.decayTime * 0.42 + hfDecayTime * 0.40
    ));
    const averageFeedback = decayCoeff(avgCycle, weightedDecay);
    this.densityGain = Math.sqrt(Math.max(0.0001, 1 - averageFeedback * averageFeedback));

    const modTime = Math.max(0.04, p.modulationTime);
    this.modulationStep = 1 / (sampleRate * modTime);
    const depthTime = Math.min(modTime, DEFAULT_MODULATION_TIME);
    this.modulationDepthSamples = (
      MODULATION_DEPTH_COEFF * 0.25 * depthTime * p.modulationDepth * sampleRate
    );

    this.updateStereoLineGains(this.earlyL, this.earlyR, p.reflectionsPan, false);
    this.updateStereoLineGains(this.lateL, this.lateR, p.lateReverbPan, true);
  }

  private updateStereoLineGains(
    left: Float32Array,
    right: Float32Array,
    panVector: [number, number, number],
    late: boolean,
  ): void {
    const x = panVector[0];
    const z = panVector[2];
    const magnitude = Math.min(1, Math.sqrt(x * x + z * z));
    const globalPan = magnitude > 1e-5 ? clamp(x / magnitude, -1, 1) * magnitude : 0;

    // Four decorrelated directions. Late response is intentionally wider.
    const p0 = late ? -0.82 : -0.68;
    const p1 = late ? 0.34 : -0.18;
    const p2 = late ? -0.34 : 0.18;
    const p3 = late ? 0.82 : 0.68;

    this.setPanGain(left, right, 0, clamp(p0 + globalPan * 0.7, -1, 1));
    this.setPanGain(left, right, 1, clamp(p1 + globalPan * 0.7, -1, 1));
    this.setPanGain(left, right, 2, clamp(p2 + globalPan * 0.7, -1, 1));
    this.setPanGain(left, right, 3, clamp(p3 + globalPan * 0.7, -1, 1));
  }

  private setPanGain(left: Float32Array, right: Float32Array, index: number, pan: number): void {
    const angle = (pan + 1) * Math.PI * 0.25;
    left[index] = Math.cos(angle) * 0.5;
    right[index] = Math.sin(angle) * 0.5;
  }

  private readDelay(buffer: Float32Array, mask: number, delaySamples: number): number {
    const delay = Math.max(0, delaySamples);
    const whole = Math.floor(delay);
    const frac = delay - whole;
    const i0 = (this.sampleIndex - whole) & mask;
    const i1 = (i0 - 1) & mask;
    return buffer[i0] + (buffer[i1] - buffer[i0]) * frac;
  }

  private allpass(
    buffer: Float32Array,
    mask: number,
    delaySamples: number,
    input: number,
    coeff: number,
  ): number {
    const readIndex = (this.sampleIndex - delaySamples) & mask;
    const delayed = buffer[readIndex];
    const output = delayed - coeff * input;
    buffer[this.sampleIndex & mask] = input + coeff * output;
    return output;
  }

  private vectorAllpass(a: number, b: number, c: number, d: number): void {
    const write = this.sampleIndex & this.lateApMask;
    const coeff = this.lateAllpassCoeff;

    const d0 = this.lateAp[0][(this.sampleIndex - this.lateApSamples[0]) & this.lateApMask];
    const d1 = this.lateAp[1][(this.sampleIndex - this.lateApSamples[1]) & this.lateApMask];
    const d2 = this.lateAp[2][(this.sampleIndex - this.lateApSamples[2]) & this.lateApMask];
    const d3 = this.lateAp[3][(this.sampleIndex - this.lateApSamples[3]) & this.lateApMask];

    const o0 = d0 - coeff * a;
    const o1 = d1 - coeff * b;
    const o2 = d2 - coeff * c;
    const o3 = d3 - coeff * d;

    // Scatter the stored all-pass state, not its immediate output. This is the
    // Gerzon-style vector all-pass that gives the late field much higher modal density.
    this.scatter(a + coeff * o0, b + coeff * o1, c + coeff * o2, d + coeff * o3, false);
    this.lateAp[0][write] = this.v0;
    this.lateAp[1][write] = this.v1;
    this.lateAp[2][write] = this.v2;
    this.lateAp[3][write] = this.v3;

    this.v0 = o0;
    this.v1 = o1;
    this.v2 = o2;
    this.v3 = o3;
  }

  private scatter(a: number, b: number, c: number, d: number, reverse: boolean): void {
    if (reverse) {
      const oldA = a;
      const oldB = b;
      a = d;
      b = c;
      c = oldB;
      d = oldA;
    }

    const x = this.scatterX;
    const y = this.scatterY;
    this.v0 = x * a + y * b - y * c + y * d;
    this.v1 = -y * a + x * b + y * c + y * d;
    this.v2 = y * a - y * b + x * c + y * d;
    this.v3 = -y * a - y * b - y * c + x * d;
  }

  private resetState(): void {
    for (let i = 0; i < NUM_LINES; i++) {
      this.mainDelay[i].fill(0);
      this.earlyAp[i].fill(0);
      this.earlyLine[i].fill(0);
      this.lateInput[i].fill(0);
      this.lateAp[i].fill(0);
      this.lateDelay[i].fill(0);
      this.lateFilters[i].clear();
    }
    this.echoDelay.fill(0);
    this.masterFilterL.clear();
    this.masterFilterR.clear();
    this.sampleIndex = 0;
    this.lfoPhase = 0;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const outL = output[0];
    const outR = output[1] ?? output[0];
    const frames = outL.length;
    const input = inputs[0];
    const inL = input?.[0];
    const inR = input?.[1] ?? inL;

    const parametersMoved = this.advanceParameters(frames);
    if (parametersMoved || this.forceDerivedUpdate) {
      this.updateDerived();
      this.forceDerivedUpdate = false;
    }

    const p = this.current;
    const mainMask = this.mainRingMask;
    const earlyApMask = this.earlyApMask;
    const earlyLineMask = this.earlyLineMask;
    const lateMask = this.lateRingMask;
    const echoMask = this.echoRingMask;

    for (let n = 0; n < frames; n++, this.sampleIndex++) {
      const dryL = inL ? inL[n] : 0;
      const dryR = inR ? inR[n] : dryL;

      const filteredL = this.masterFilterL.process(dryL) * p.gain;
      const filteredR = this.masterFilterR.process(dryR) * p.gain;

      // Stereo -> pseudo A-format. Identical filtering commutes with this
      // matrix, so filtering L/R before conversion is equivalent and cheaper.
      const a0 = filteredL * INV_SQRT2;
      const a1 = filteredL * INV_SQRT2;
      const a2 = filteredR * INV_SQRT2;
      const a3 = filteredR * INV_SQRT2;
      const mainWrite = this.sampleIndex & mainMask;
      this.mainDelay[0][mainWrite] = a0;
      this.mainDelay[1][mainWrite] = a1;
      this.mainDelay[2][mainWrite] = a2;
      this.mainDelay[3][mainWrite] = a3;

      // ---- Early reflections -------------------------------------------------
      const e0 = this.allpass(
        this.earlyAp[0], earlyApMask, this.earlyApSamples[0],
        this.readDelay(this.mainDelay[0], mainMask, this.earlyTapSamples[0]),
        this.earlyAllpassCoeff,
      );
      const e1 = this.allpass(
        this.earlyAp[1], earlyApMask, this.earlyApSamples[1],
        this.readDelay(this.mainDelay[1], mainMask, this.earlyTapSamples[1]),
        this.earlyAllpassCoeff,
      );
      const e2 = this.allpass(
        this.earlyAp[2], earlyApMask, this.earlyApSamples[2],
        this.readDelay(this.mainDelay[2], mainMask, this.earlyTapSamples[2]),
        this.earlyAllpassCoeff,
      );
      const e3 = this.allpass(
        this.earlyAp[3], earlyApMask, this.earlyApSamples[3],
        this.readDelay(this.mainDelay[3], mainMask, this.earlyTapSamples[3]),
        this.earlyAllpassCoeff,
      );

      const earlyWrite = this.sampleIndex & earlyLineMask;
      const s0 = this.earlyLine[0][(this.sampleIndex - this.earlyLineSamples[0]) & earlyLineMask];
      const s1 = this.earlyLine[1][(this.sampleIndex - this.earlyLineSamples[1]) & earlyLineMask];
      const s2 = this.earlyLine[2][(this.sampleIndex - this.earlyLineSamples[2]) & earlyLineMask];
      const s3 = this.earlyLine[3][(this.sampleIndex - this.earlyLineSamples[3]) & earlyLineMask];

      // Geometric reflection produces the secondary field.
      this.earlyLine[0][earlyWrite] = ( e0 - e1 - e2 - e3) * 0.5;
      this.earlyLine[1][earlyWrite] = (-e0 + e1 - e2 - e3) * 0.5;
      this.earlyLine[2][earlyWrite] = (-e0 - e1 + e2 - e3) * 0.5;
      this.earlyLine[3][earlyWrite] = (-e0 - e1 - e2 + e3) * 0.5;

      const er0 = e0 + s0 * this.earlySecondaryCoeff;
      const er1 = e1 + s1 * this.earlySecondaryCoeff;
      const er2 = e2 + s2 * this.earlySecondaryCoeff;
      const er3 = e3 + s3 * this.earlySecondaryCoeff;

      // Primary early reflections are scattered into the late-reverb feed.
      this.scatter(e0, e1, e2, e3, false);
      const lateInputWrite = this.sampleIndex & this.lateInputRingMask;
      this.lateInput[0][lateInputWrite] = this.v0;
      this.lateInput[1][lateInputWrite] = this.v1;
      this.lateInput[2][lateInputWrite] = this.v2;
      this.lateInput[3][lateInputWrite] = this.v3;

      let earlyOutL = (
        er0 * this.earlyL[0] + er1 * this.earlyL[1] +
        er2 * this.earlyL[2] + er3 * this.earlyL[3]
      ) * p.reflectionsGain;
      let earlyOutR = (
        er0 * this.earlyR[0] + er1 * this.earlyR[1] +
        er2 * this.earlyR[2] + er3 * this.earlyR[3]
      ) * p.reflectionsGain;

      // ---- Late reverb / four-line FDN --------------------------------------
      // OpenAL-style additive modulation: one cheap parabolic LFO controls
      // all four feedback reads. This avoids sin in the inner loop.
      let x = this.lfoPhase;
      const lfo = x < 0.5
        ? (-16 * x * x + 8 * x)
        : (16 * x * x - 24 * x + 8);
      x += this.modulationStep;
      if (x >= 1) x -= 1;
      this.lfoPhase = x;
      const mod = (lfo + 1) * this.modulationDepthSamples;

      const d0 = this.readDelay(this.lateDelay[0], lateMask, this.lateLineSamples[0] + mod);
      const d1 = this.readDelay(this.lateDelay[1], lateMask, this.lateLineSamples[1] + mod);
      const d2 = this.readDelay(this.lateDelay[2], lateMask, this.lateLineSamples[2] + mod);
      const d3 = this.readDelay(this.lateDelay[3], lateMask, this.lateLineSamples[3] + mod);

      const f0 = this.lateFilters[0].process(d0);
      const f1 = this.lateFilters[1].process(d1);
      const f2 = this.lateFilters[2].process(d2);
      const f3 = this.lateFilters[3].process(d3);

      const lateInputMask = this.lateInputRingMask;
      const li0 = this.readDelay(this.lateInput[0], lateInputMask, this.lateInputTapSamples[0]);
      const li1 = this.readDelay(this.lateInput[1], lateInputMask, this.lateInputTapSamples[1]);
      const li2 = this.readDelay(this.lateInput[2], lateInputMask, this.lateInputTapSamples[2]);
      const li3 = this.readDelay(this.lateInput[3], lateInputMask, this.lateInputTapSamples[3]);

      this.vectorAllpass(
        f0 + li0 * this.densityGain,
        f1 + li1 * this.densityGain,
        f2 + li2 * this.densityGain,
        f3 + li3 * this.densityGain,
      );
      const ap0 = this.v0;
      const ap1 = this.v1;
      const ap2 = this.v2;
      const ap3 = this.v3;

      let lateOutL = (
        ap0 * this.lateL[0] + ap1 * this.lateL[1] +
        ap2 * this.lateL[2] + ap3 * this.lateL[3]
      ) * p.lateReverbGain;
      let lateOutR = (
        ap0 * this.lateR[0] + ap1 * this.lateR[1] +
        ap2 * this.lateR[2] + ap3 * this.lateR[3]
      ) * p.lateReverbGain;

      // Scatter and reflect before feeding the FDN back into itself.
      this.scatter(ap0, ap1, ap2, ap3, true);
      const lateWrite = this.sampleIndex & lateMask;
      this.lateDelay[0][lateWrite] = this.v0;
      this.lateDelay[1][lateWrite] = this.v1;
      this.lateDelay[2][lateWrite] = this.v2;
      this.lateDelay[3][lateWrite] = this.v3;

      // EFX echo is treated as a tail tap rather than a unity-capable feedback
      // loop, avoiding unstable presets while retaining the periodic character.
      if (p.echoDepth > 0.0001) {
        const echoSamples = p.echoTime * sampleRate;
        const echo = this.readDelay(this.echoDelay, echoMask, echoSamples) * p.echoDepth;
        const lateMono = (lateOutL + lateOutR) * 0.5;
        this.echoDelay[this.sampleIndex & echoMask] = lateMono;
        lateOutL += echo * 0.38;
        lateOutR += echo * 0.38;
      } else {
        this.echoDelay[this.sampleIndex & echoMask] = (lateOutL + lateOutR) * 0.5;
      }

      if (!this.enabled) {
        earlyOutL = 0;
        earlyOutR = 0;
        lateOutL = 0;
        lateOutR = 0;
      }

      outL[n] = earlyOutL + lateOutL;
      outR[n] = earlyOutR + lateOutR;
    }

    return true;
  }
}

registerProcessor("eax-reverb-processor", EAXReverbProcessor);
