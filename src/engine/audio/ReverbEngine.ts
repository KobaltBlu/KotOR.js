import { EAXPresets } from "@engine/audio/EAXPresets";
import type { EAXPreset, EAXReverbParams, EAXReverbProcessorMessage } from "./EAXReverbTypes";

export interface ReverbEngineOptions {
  /**
   * URL of the compiled EAXReverbProcessor.worklet.js module.
   *
   * AudioWorklet modules are loaded asynchronously and need to be emitted as a
   * standalone browser module by your bundler/build pipeline.
   */
  workletModuleUrl: string | URL;

  /** Keep legacy behavior and connect the engine output to context.destination. */
  autoConnectDestination?: boolean;

  /** Initial dry level for sources connected through connectSource. */
  dryLevel?: number;

  /** Global multiplier applied to the worklet's wet output. */
  wetLevel?: number;

  /** Default preset morph time in seconds. */
  transitionTime?: number;
}

export interface ReverbSourceConnection {
  readonly send: GainNode;
  setSendLevel(level: number, rampSeconds?: number): void;
  disconnect(): void;
}

/**
 * Browser EAX/EFX-style environmental reverb.
 *
 * The class is deliberately split into two layers:
 * - ReverbEngine: graph/routing, preset selection and game-facing API.
 * - EAXReverbProcessor: early reflections + diffusion + 4-line FDN DSP.
 *
 * Use one shared instance per active acoustic environment. Do not create one
 * ReverbEngine per sound source.
 */
export class ReverbEngine {
  readonly ready: Promise<void>;

  private readonly context: AudioContext;
  private readonly options: Required<Omit<ReverbEngineOptions, "workletModuleUrl">> & {
    workletModuleUrl: string | URL;
  };

  private readonly input: GainNode;
  private readonly wetInput: GainNode;
  private readonly dryGain: GainNode;
  private readonly wetGain: GainNode;
  private readonly output: GainNode;

  private processor?: AudioWorkletNode;
  private currentPreset = -1;
  private currentParams?: EAXReverbParams;
  private enabled = true;
  private disposed = false;

  private readonly sourceConnections = new Set<ReverbSourceConnection>();

  // Retained for compatibility with the old API. Spatial source rendering
  // should remain in the engine's normal 3D audio path, not in the room DSP.
  private listenerPosition: [number, number, number] = [0, 0, 0];
  private listenerOrientation: [number, number, number] = [0, 0, 1];

  constructor(context: AudioContext, options: ReverbEngineOptions) {
    this.context = context;
    this.options = {
      workletModuleUrl: options.workletModuleUrl,
      autoConnectDestination: options.autoConnectDestination ?? true,
      dryLevel: options.dryLevel ?? 1,
      wetLevel: options.wetLevel ?? 1,
      transitionTime: options.transitionTime ?? 0.08,
    };

    this.input = context.createGain();
    this.wetInput = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.output = context.createGain();

    this.dryGain.gain.value = this.options.dryLevel;
    this.wetGain.gain.value = this.options.wetLevel;

    // Legacy/full-bus input path: one input can feed both direct and room audio.
    this.input.connect(this.dryGain);
    this.input.connect(this.wetInput);
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);

    if (this.options.autoConnectDestination) {
      this.output.connect(context.destination);
    }

    this.ready = this.initializeWorklet();
  }

  private async initializeWorklet(): Promise<void> {
    if (!this.context.audioWorklet) {
      throw new Error("AudioWorklet is required by ReverbEngine");
    }

    await this.context.audioWorklet.addModule(this.options.workletModuleUrl.toString());
    if (this.disposed) return;

    const processor = new AudioWorkletNode(this.context, "eax-reverb-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: "clamped-max",
      channelInterpretation: "speakers",
    });

    this.processor = processor;
    this.wetInput.connect(processor);
    processor.connect(this.wetGain);

    if (this.currentParams) {
      this.postMessage({ type: "params", params: this.currentParams });
    }
  }

  /**
   * Legacy entry point: routes a source through both dry and wet paths.
   * For a real game mixer, prefer createReverbSend so direct audio keeps its
   * existing spatialization path and only the environment send enters here.
   */
  connectSource(source: AudioNode): void {
    source.connect(this.input);
  }

  disconnectSource(source: AudioNode): void {
    try {
      source.disconnect(this.input);
    } catch {
      // The source may already have been disconnected/disposed by its owner.
    }
  }

  /**
   * Preferred game-engine routing: create an auxiliary send into the shared
   * environment processor without duplicating the source's direct path.
   */
  createReverbSend(source: AudioNode, initialLevel = 1): ReverbSourceConnection {
    const send = this.context.createGain();
    send.gain.value = Math.max(0, initialLevel);
    source.connect(send);
    send.connect(this.wetInput);

    let connected = true;
    const connection: ReverbSourceConnection = {
      send,
      setSendLevel: (level: number, rampSeconds = 0.03) => {
        if (!connected) return;
        const gain = Math.max(0, level);
        const now = this.context.currentTime;
        send.gain.cancelScheduledValues(now);
        send.gain.setValueAtTime(send.gain.value, now);
        send.gain.linearRampToValueAtTime(gain, now + Math.max(0.001, rampSeconds));
      },
      disconnect: () => {
        if (!connected) return;
        connected = false;
        try { source.disconnect(send); } catch { /* source may be gone */ }
        try { send.disconnect(this.wetInput); } catch { /* already disconnected */ }
        this.sourceConnections.delete(connection);
      },
    };

    this.sourceConnections.add(connection);
    return connection;
  }

  /** Connect an already-mixed environmental send bus directly to the DSP. */
  getWetInput(): AudioNode {
    return this.wetInput;
  }

  /** Full input that feeds both dry and wet paths. */
  getInput(): AudioNode {
    return this.input;
  }

  getOutput(): AudioNode {
    return this.output;
  }

  /**
   * Loads an EFX preset without rebuilding an impulse response. Parameters are
   * morphed inside the worklet, preserving the existing reverb tail.
   */
  loadPreset(index: number, transitionTime = this.options.transitionTime): void {
    if (this.currentPreset === index) return;

    const preset = EAXPresets.PresetFromIndex(index) as EAXPreset | undefined;
    if (!preset) {
      console.error("EAX preset not found", index);
      return;
    }

    this.currentPreset = index;
    this.currentParams = this.toProcessorParams(preset, transitionTime);
    this.postMessage({ type: "params", params: this.currentParams });
  }

  /** Apply a custom EFX parameter block without adding it to EAXPresets. */
  setParameters(preset: EAXPreset, transitionTime = this.options.transitionTime): void {
    this.currentPreset = -1;
    this.currentParams = this.toProcessorParams(preset, transitionTime);
    this.postMessage({ type: "params", params: this.currentParams });
  }

  private toProcessorParams(preset: EAXPreset, transitionTime: number): EAXReverbParams {
    return {
      ...preset,
      reflectionsPan: [...(preset.reflectionsPan ?? [0, 0, 0])] as [number, number, number],
      lateReverbPan: [...(preset.lateReverbPan ?? [0, 0, 0])] as [number, number, number],
      transitionTime: Math.max(0.005, transitionTime),
    };
  }

  setEnabled(enabled: boolean, rampSeconds = 0.04): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    // Keep DSP alive while disabled so a quick re-enable can retain the tail,
    // but ramp the audible wet bus to avoid clicks.
    const now = this.context.currentTime;
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
    this.wetGain.gain.linearRampToValueAtTime(
      enabled ? this.options.wetLevel : 0,
      now + Math.max(0.001, rampSeconds),
    );

  }

  setWetLevel(level: number, rampSeconds = 0.03): void {
    this.options.wetLevel = Math.max(0, level);
    if (!this.enabled) return;

    const now = this.context.currentTime;
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
    this.wetGain.gain.linearRampToValueAtTime(
      this.options.wetLevel,
      now + Math.max(0.001, rampSeconds),
    );
  }

  setDryLevel(level: number, rampSeconds = 0.03): void {
    this.options.dryLevel = Math.max(0, level);
    const now = this.context.currentTime;
    this.dryGain.gain.cancelScheduledValues(now);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
    this.dryGain.gain.linearRampToValueAtTime(
      this.options.dryLevel,
      now + Math.max(0.001, rampSeconds),
    );
  }

  /** Clear the current room tail immediately, e.g. after loading a save/module. */
  reset(): void {
    this.postMessage({ type: "reset" });
  }

  getEAXParameters(): EAXReverbParams | undefined {
    if (!this.currentParams) return undefined;
    return {
      ...this.currentParams,
      reflectionsPan: [...this.currentParams.reflectionsPan],
      lateReverbPan: [...this.currentParams.lateReverbPan],
    };
  }

  /**
   * EFX room rolloff belongs on the source's reverb send, not in the global DSP.
   * This helper gives the game mixer a cheap scalar for that send.
   */
  calculateReverbSend(distance: number, baseSend = 1): number {
    const rolloff = this.currentParams?.roomRolloffFactor ?? 0;
    if (rolloff <= 0 || distance <= 0) return Math.max(0, baseSend);
    return Math.max(0, baseSend) / (1 + rolloff * distance);
  }

  updateListener(
    position: [number, number, number],
    orientation: [number, number, number],
  ): void {
    this.listenerPosition = position;
    const length = Math.hypot(orientation[0], orientation[1], orientation[2]) || 1;
    this.listenerOrientation = [
      orientation[0] / length,
      orientation[1] / length,
      orientation[2] / length,
    ];
  }

  /**
   * Compatibility helper from the old implementation. Prefer the Web Audio
   * PannerNode/HRTF path for source spatialization; room reverb should not own it.
   */
  calculate3DPosition(relativePos: [number, number, number], channel: number): number {
    const distance = Math.hypot(relativePos[0], relativePos[1], relativePos[2]);
    if (distance < 0.01) return 1;

    const x = relativePos[0] / distance;
    const y = relativePos[1] / distance;
    const z = relativePos[2] / distance;
    const sourceHeading = Math.atan2(x, z);
    const listenerHeading = Math.atan2(this.listenerOrientation[0], this.listenerOrientation[2]);
    let azimuth = sourceHeading - listenerHeading;
    if (azimuth > Math.PI) azimuth -= Math.PI * 2;
    else if (azimuth < -Math.PI) azimuth += Math.PI * 2;
    const elevation = Math.asin(Math.max(-1, Math.min(1, y)));
    return this.calculateChannelGain(azimuth, elevation, distance, channel);
  }

  calculateWorld3DPosition(worldPos: [number, number, number], channel: number): number {
    return this.calculate3DPosition([
      worldPos[0] - this.listenerPosition[0],
      worldPos[1] - this.listenerPosition[1],
      worldPos[2] - this.listenerPosition[2],
    ], channel);
  }

  calculateChannelGain(
    azimuth: number,
    elevation: number,
    distance: number,
    channel: number,
  ): number {
    const pan = Math.sin(azimuth);
    const angle = (pan + 1) * Math.PI * 0.25;
    const panGain = channel === 0 ? Math.cos(angle) : Math.sin(angle);
    const distanceGain = this.calculateDistanceAttenuation(distance);

    // Small elevation compensation only; actual HRTF belongs in PannerNode.
    const elevationAmount = Math.abs(Math.sin(elevation));
    const elevationGain = 1 - elevationAmount * 0.04;
    return panGain * distanceGain * elevationGain;
  }

  calculateDistanceAttenuation(distance: number): number {
    const minDistance = 1;
    if (distance <= minDistance) return 1;
    return Math.max(0, Math.min(1, minDistance / distance));
  }

  calculatePanFactor(pan: [number, number, number], channel: number): number {
    return this.calculate3DPosition(pan, channel);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    for (const connection of Array.from(this.sourceConnections)) {
      connection.disconnect();
    }

    try { this.input.disconnect(); } catch { /* noop */ }
    try { this.wetInput.disconnect(); } catch { /* noop */ }
    try { this.dryGain.disconnect(); } catch { /* noop */ }
    try { this.wetGain.disconnect(); } catch { /* noop */ }
    try { this.processor?.disconnect(); } catch { /* noop */ }
    try { this.output.disconnect(); } catch { /* noop */ }
    this.processor?.port.close();
    this.processor = undefined;
  }

  private postMessage(message: EAXReverbProcessorMessage): void {
    this.processor?.port.postMessage(message);
  }
}
