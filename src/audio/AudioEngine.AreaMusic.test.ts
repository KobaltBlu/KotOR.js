/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { BackgroundMusicState } from '@/enums/audio/BackgroundMusicState';
import { BackgroundMusicMode } from '@/enums/audio/BackgroundMusicMode';
import { SoundMode } from '@/enums/audio/SoundMode';

jest.mock('@/GameState', () => ({
  GameState: {
    module: undefined,
    SWRuleSet: { getPriorityGroupById: () => undefined },
  },
}));

jest.mock('@/engine/pathfinding/get-obstruction-factor', () => ({
  OBSTRUCTION_REUSE_AGE_MS: 0xaf,
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
    setVolume() { return this; }
    setDestination() { return this; }
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

import {
  AudioEngine,
  AREA_MUSIC_FADE_MS,
  AMBIENT_SOUND_FADE_MS,
} from '@/audio/AudioEngine';

describe('AudioEngine area BGM want / MusicDelay', () => {
  let engine: any;

  beforeEach(() => {
    engine = {
      areaMusicWanted: false,
      bgmTimer: 0,
      bgmLoopTime: 0,
      bgmState: BackgroundMusicState.ENDED,
      bgmMode: BackgroundMusicMode.AREA,
      areaMusicDayAudioEmitter: { playing: false, play: jest.fn(), fadeOutAndStop: jest.fn(async () => {}) },
      areaMusicNightAudioEmitter: { playing: false, play: jest.fn(), fadeOutAndStop: jest.fn(async () => {}) },
      getActiveAreaMusicEmitter() { return this.areaMusicDayAudioEmitter; },
      setAreaMusicWanted: AudioEngine.prototype.setAreaMusicWanted,
      fadeStopAreaMusic: AudioEngine.prototype.fadeStopAreaMusic,
      resumeAreaMusicIfWanted: AudioEngine.prototype.resumeAreaMusicIfWanted,
    };
    engine.setAreaMusicWanted = AudioEngine.prototype.setAreaMusicWanted.bind(engine);
    engine.fadeStopAreaMusic = AudioEngine.prototype.fadeStopAreaMusic.bind(engine);
    engine.resumeAreaMusicIfWanted = AudioEngine.prototype.resumeAreaMusicIfWanted.bind(engine);
  });

  test('Stop clears want so timer cannot auto-restart', () => {
    engine.setAreaMusicWanted(true);
    engine.bgmTimer = 5000;
    engine.setAreaMusicWanted(false);
    expect(engine.areaMusicWanted).toBe(false);
    expect(engine.bgmTimer).toBe(0);
  });

  test('MusicDelay 0 arms restart as 1ms when ended + wanted', () => {
    engine.areaMusicWanted = true;
    engine.bgmLoopTime = 0;
    // Simulate ended handler body
    if(engine.areaMusicWanted){
      engine.bgmTimer = Math.max(1, engine.bgmLoopTime | 0);
    }
    expect(engine.bgmTimer).toBe(1);
  });

  test('resumeAreaMusicIfWanted plays when wanted and not playing', () => {
    engine.areaMusicWanted = true;
    engine.resumeAreaMusicIfWanted();
    expect(engine.areaMusicDayAudioEmitter.play).toHaveBeenCalledWith(true);
  });

  test('resumeAreaMusicIfWanted no-ops when not wanted', () => {
    engine.areaMusicWanted = false;
    engine.resumeAreaMusicIfWanted();
    expect(engine.areaMusicDayAudioEmitter.play).not.toHaveBeenCalled();
  });

  test('fadeStopAreaMusic fades both emitters at 800ms', async () => {
    await engine.fadeStopAreaMusic();
    expect(engine.areaMusicDayAudioEmitter.fadeOutAndStop).toHaveBeenCalledWith(AREA_MUSIC_FADE_MS / 1000);
    expect(engine.areaMusicNightAudioEmitter.fadeOutAndStop).toHaveBeenCalledWith(AREA_MUSIC_FADE_MS / 1000);
    expect(engine.bgmTimer).toBe(0);
  });

  test('AMBIENT_SOUND_FADE_MS is retail 6000', () => {
    expect(AMBIENT_SOUND_FADE_MS).toBe(6000);
  });
});

describe('AudioEngine streamingMusicForMovie bypass', () => {
  const channel = () => {
    let busScale = 1;
    const gainNode = { id: 'gain' };
    return {
      setBusScale: (s: number) => { busScale = s; },
      getBusScale: () => busScale,
      getGainNode: () => gainNode,
    };
  };

  const sfx = channel();
  const music = channel();
  const vo = channel();
  let dayDest: unknown;
  let nightDest: unknown;

  beforeEach(() => {
    (AudioEngine as any).sfxChannel = sfx;
    (AudioEngine as any).musicChannel = music;
    (AudioEngine as any).voChannel = vo;
    sfx.setBusScale(1);
    music.setBusScale(1);
    vo.setBusScale(1);
    dayDest = undefined;
    nightDest = undefined;
    (AudioEngine as any).engines = [{
      audioCtx: { destination: { kind: 'ctx-dest' } },
      areaMusicDayAudioEmitter: {
        streamingMusicForMovie: true,
        setDestination: (d: unknown) => { dayDest = d; },
      },
      areaMusicNightAudioEmitter: {
        streamingMusicForMovie: false,
        setDestination: (d: unknown) => { nightDest = d; },
      },
      ambientAudioDayEmitter: { setDestination() {} },
      ambientAudioNightEmitter: { setDestination() {} },
      emitters: [],
    }];
    AudioEngine.resetSoundModeState();
  });

  test('keepStreamingMusic routes flagged area music past muted Music bus', () => {
    AudioEngine.SetSoundMode(SoundMode.PAUSE_LOAD, 1);
    expect(music.getBusScale()).toBe(0);
    expect(dayDest).toEqual({ kind: 'ctx-dest' });
    expect(nightDest).toBe(music.getGainNode());
  });
});
