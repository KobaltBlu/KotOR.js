export interface EAXPreset {
  density: number;
  diffusion: number;
  gain: number;
  gainHF: number;
  gainLF: number;
  decayTime: number;
  decayHFRatio: number;
  decayLFRatio: number;
  reflectionsGain: number;
  reflectionsDelay: number;
  reflectionsPan: [number, number, number];
  lateReverbGain: number;
  lateReverbDelay: number;
  lateReverbPan: [number, number, number];
  echoTime: number;
  echoDepth: number;
  modulationTime: number;
  modulationDepth: number;
  airAbsorptionGainHF: number;
  hfReference: number;
  lfReference: number;
  roomRolloffFactor: number;
  decayHFLimit: boolean;
}

export interface EAXReverbParams extends EAXPreset {
  /** Seconds used to slew coefficient and delay changes. */
  transitionTime: number;
}

export type EAXReverbProcessorMessage =
  | { type: "params"; params: EAXReverbParams }
  | { type: "reset" }
  | { type: "enabled"; enabled: boolean };
