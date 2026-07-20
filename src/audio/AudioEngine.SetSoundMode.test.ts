/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { SoundMode } from '@/enums/audio/SoundMode';

const channel = () => {
  let busScale = 1;
  return {
    setBusScale: (s: number) => { busScale = s; },
    getBusScale: () => busScale,
  };
};

const sfx = channel();
const music = channel();
const vo = channel();

jest.mock('@/GameState', () => ({
  GameState: {
    module: undefined,
    SWRuleSet: { getPriorityGroupById: () => undefined },
  },
}));

jest.mock('@/engine/pathfinding/get-obstruction-factor', () => ({
  OBSTRUCTION_REUSE_AGE_MS: 250,
  OBSTRUCTION_REUSE_DIST: 0.5,
  getObstructionFactor: () => 0,
  obstructionVolumeScale: (f: number) => 1 - f,
}));

jest.mock('@/audio/ReverbEngine', () => ({
  ReverbEngine: class {
    connectSource() {}
  },
}));

jest.mock('@/audio/AmbientAudioEmitter', () => ({
  AmbientAudioEmitter: class {
    dispose() {}
  },
}));

jest.mock('@/audio/AudioPriorityManager', () => ({
  AudioPriorityManager: class {
    clear() {}
  },
}));

jest.mock('@/audio/EAXPresets', () => ({
  EAXPresets: {},
}));

jest.mock('three', () => ({
  Vector3: class {
    x = 0; y = 0; z = 0;
    set() { return this; }
    copy() { return this; }
  },
  Quaternion: class {},
  MathUtils: { clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)) },
}));

import { AudioEngine } from '@/audio/AudioEngine';

describe('AudioEngine.SetSoundMode', () => {
  beforeEach(() => {
    (AudioEngine as any).sfxChannel = sfx;
    (AudioEngine as any).musicChannel = music;
    (AudioEngine as any).voChannel = vo;
    sfx.setBusScale(1);
    music.setBusScale(1);
    vo.setBusScale(1);
    AudioEngine.resetSoundModeState();
  });

  test('mode 4 pauses SFX only; music stays (GetPauseable)', () => {
    AudioEngine.SetSoundMode(SoundMode.PAUSE_GUI, 0);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.PAUSE_GUI);
    expect(sfx.getBusScale()).toBe(0);
    expect(music.getBusScale()).toBe(1);
    expect(vo.getBusScale()).toBe(1);
  });

  test('mode 2 combat pause keeps music', () => {
    AudioEngine.SetSoundMode(SoundMode.PAUSE, 0);
    expect(sfx.getBusScale()).toBe(0);
    expect(music.getBusScale()).toBe(1);
  });

  test('mode 3 movie/load pauses SFX and music', () => {
    AudioEngine.SetSoundMode(SoundMode.PAUSE_LOAD, 0);
    expect(sfx.getBusScale()).toBe(0);
    expect(music.getBusScale()).toBe(0);
    expect(vo.getBusScale()).toBe(1);
  });

  test('keepStreamingMusic leaves music up on mode 3', () => {
    AudioEngine.SetSoundMode(SoundMode.PAUSE_LOAD, 1);
    expect(sfx.getBusScale()).toBe(0);
    expect(music.getBusScale()).toBe(1);
  });

  test('duplicate mode 4 is a no-op (does not nest pause)', () => {
    AudioEngine.SetSoundMode(SoundMode.PAUSE_GUI, 0);
    AudioEngine.SetSoundMode(SoundMode.PAUSE_GUI, 0);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.PAUSE_GUI);
    AudioEngine.SetSoundMode(SoundMode.POP, 0);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.POP);
    expect(sfx.getBusScale()).toBe(1);
  });

  test('GUI pause then movie then pop restores GUI pause (SFX only)', () => {
    AudioEngine.SetSoundMode(SoundMode.PAUSE_GUI, 0);
    AudioEngine.SetSoundMode(SoundMode.PAUSE_LOAD, 0);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.PAUSE_LOAD);
    expect(music.getBusScale()).toBe(0);
    AudioEngine.SetSoundMode(SoundMode.POP, 0);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.PAUSE_GUI);
    expect(sfx.getBusScale()).toBe(0);
    expect(music.getBusScale()).toBe(1);
    AudioEngine.SetSoundMode(SoundMode.POP, 0);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.POP);
    expect(sfx.getBusScale()).toBe(1);
  });

  test('mode 1 MuteSound sets muted flag', () => {
    AudioEngine.SetSoundMode(SoundMode.MUTE, 0);
    expect(AudioEngine.soundMuted).toBe(true);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.MUTE);
    AudioEngine.SetSoundMode(SoundMode.POP, 0);
    expect(AudioEngine.soundMuted).toBe(false);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.POP);
  });

  test('clearSoundModeStack pops mute under load pause', () => {
    AudioEngine.SetSoundMode(SoundMode.MUTE, 0);
    AudioEngine.SetSoundMode(SoundMode.PAUSE_GUI, 0);
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.PAUSE_GUI);
    AudioEngine.clearSoundModeStack();
    expect(AudioEngine.GetSoundMode()).toBe(SoundMode.POP);
    expect(AudioEngine.soundMuted).toBe(false);
    expect(sfx.getBusScale()).toBe(1);
  });
});
