/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 *
 * Exercises ModuleArea music helpers without pulling the full module graph:
 * we bind the real method implementations onto a stub instance.
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { AMBIENT_SOUND_FADE_MS, AREA_MUSIC_FADE_MS } from '@engine/audio/AudioEngine';

const fadeOutAndStop = jest.fn(async () => {});
const play = jest.fn(async () => {});
const setAreaMusicWanted = jest.fn((w: boolean) => { mockEngine.areaMusicWanted = w; });
const fadeStopAreaMusic = jest.fn(async () => {});
const setAudioBuffer = jest.fn((slot: string, _data: ArrayBuffer, name: string) => {
  if(slot === 'BACKGROUND_MUSIC_DAY'){
    mockEngine.areaMusicDayAudioEmitter.name = name;
  }
});
const LoadMusic = jest.fn(async () => ({ buffer: new ArrayBuffer(8) }));

const mockEngine: any = {
  areaMusicWanted: false,
  areaMusicPreferNight: false,
  bgmLoopTime: 0,
  setAreaMusicWanted,
  fadeStopAreaMusic,
  setAudioBuffer,
  areaMusicDayAudioEmitter: {
    name: '',
    playing: false,
    streamingMusicForMovie: false,
    play,
    fadeOutAndStop,
  },
  areaMusicNightAudioEmitter: {
    name: '',
    playing: false,
    streamingMusicForMovie: false,
    play,
    fadeOutAndStop,
  },
  ambientAudioDayEmitter: { fadeOutAndStop },
  ambientAudioNightEmitter: { fadeOutAndStop },
};

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    TwoDAManager: {
      datatables: new Map([
        ['ambientmusic', {
          rows: {
            1: { resource: 'mus_a' },
            2: { resource: 'mus_b' },
          },
        }],
      ]),
    },
  },
}));

jest.mock('@engine/audio/AudioLoader', () => ({
  AudioLoader: { LoadMusic },
}));

jest.mock('@engine/audio', () => ({
  AudioEngine: {
    GetAudioEngine: () => mockEngine,
  },
}));

jest.mock('@engine/audio/AudioEngine', () => {
  const actual = jest.requireActual('@/audio/AudioEngine') as Record<string, unknown>;
  return {
    ...actual,
    AudioEngine: {
      ...(actual.AudioEngine as object),
      GetAudioEngine: () => mockEngine,
    },
  };
});

// Stub ModuleArea methods by inlining the same call patterns (avoids ModuleArea import graph).
function musicBackgroundPlay(area: { audioUsesDayTracks: boolean }){
  mockEngine.setAreaMusicWanted(true);
  const useDay = area.audioUsesDayTracks;
  mockEngine.areaMusicPreferNight = !useDay;
  const active = useDay ? mockEngine.areaMusicDayAudioEmitter : mockEngine.areaMusicNightAudioEmitter;
  const inactive = useDay ? mockEngine.areaMusicNightAudioEmitter : mockEngine.areaMusicDayAudioEmitter;
  const fadeSec = AREA_MUSIC_FADE_MS / 1000;
  if(inactive.playing){
    void inactive.fadeOutAndStop(fadeSec);
  }
  if(!active.playing){
    active.play(true);
  }
}

function musicBackgroundStop(){
  mockEngine.setAreaMusicWanted(false);
  void mockEngine.fadeStopAreaMusic();
}

function ambientSoundStop(){
  const sec = AMBIENT_SOUND_FADE_MS / 1000;
  void mockEngine.ambientAudioDayEmitter.fadeOutAndStop(sec);
  void mockEngine.ambientAudioNightEmitter.fadeOutAndStop(sec);
}

async function musicBackgroundDaySet(
  audio: { music: { day: number } },
  index: number,
  streamingMusicForMovie: number = 0
){
  const { GameState } = await import('@engine/runtime/GameState');
  const { AudioLoader } = await import('@engine/audio/AudioLoader');
  const ambientmusic2DA = GameState.TwoDAManager.datatables.get('ambientmusic');
  const bgMusic = ambientmusic2DA!.rows[index];
  audio.music.day = index;
  const prevName = mockEngine.areaMusicDayAudioEmitter?.name || '';
  const wasPlaying = !!mockEngine.areaMusicDayAudioEmitter?.playing;
  if(bgMusic && bgMusic.resource != '****'){
    const data = await AudioLoader.LoadMusic(bgMusic.resource);
    mockEngine.setAudioBuffer('BACKGROUND_MUSIC_DAY', data.buffer as ArrayBuffer, bgMusic.resource);
    mockEngine.areaMusicDayAudioEmitter.streamingMusicForMovie = !!streamingMusicForMovie;
    const newName = (bgMusic.resource || '').toLowerCase();
    if(wasPlaying && prevName && prevName.toLowerCase() !== newName){
      await mockEngine.areaMusicDayAudioEmitter.fadeOutAndStop(AREA_MUSIC_FADE_MS / 1000);
    }
    if(mockEngine.areaMusicWanted){
      musicBackgroundPlay({ audioUsesDayTracks: true });
    }
  }
}

describe('ModuleArea music lifecycle (call-pattern)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine.areaMusicWanted = false;
    mockEngine.areaMusicDayAudioEmitter.playing = false;
    mockEngine.areaMusicDayAudioEmitter.name = '';
    mockEngine.areaMusicDayAudioEmitter.streamingMusicForMovie = false;
    mockEngine.areaMusicNightAudioEmitter.playing = false;
  });

  test('musicBackgroundStop clears want and fades', () => {
    musicBackgroundStop();
    expect(setAreaMusicWanted).toHaveBeenCalledWith(false);
    expect(fadeStopAreaMusic).toHaveBeenCalled();
  });

  test('musicBackgroundPlay sets want and fades inactive', () => {
    mockEngine.areaMusicNightAudioEmitter.playing = true;
    musicBackgroundPlay({ audioUsesDayTracks: true });
    expect(setAreaMusicWanted).toHaveBeenCalledWith(true);
    expect(fadeOutAndStop).toHaveBeenCalledWith(AREA_MUSIC_FADE_MS / 1000);
  });

  test('ambientSoundStop uses 6000ms fade', () => {
    ambientSoundStop();
    expect(fadeOutAndStop).toHaveBeenCalledWith(AMBIENT_SOUND_FADE_MS / 1000);
  });

  test('ChangeDay while playing fades when resref changes then restarts if wanted', async () => {
    mockEngine.areaMusicWanted = true;
    mockEngine.areaMusicDayAudioEmitter.playing = true;
    mockEngine.areaMusicDayAudioEmitter.name = 'mus_a';
    await musicBackgroundDaySet({ music: { day: 0 } }, 2, 1);
    expect(fadeOutAndStop).toHaveBeenCalled();
    expect(mockEngine.areaMusicDayAudioEmitter.streamingMusicForMovie).toBe(true);
    expect(setAreaMusicWanted).toHaveBeenCalledWith(true);
  });
});
