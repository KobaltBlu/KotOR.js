/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

const start = jest.fn();
const stop = jest.fn();
const setPosition = jest.fn();
const setVolume = jest.fn();
const setPriorityGroupId = jest.fn();
const setMaxDistance = jest.fn();
const load = jest.fn(async () => {});
const playSoundFireAndForget = jest.fn(async () => {});
const destroy = jest.fn();

jest.mock('@/audio/AudioEmitter', () => ({
  AudioEmitter: class {
    type = 0;
    isLooping = false;
    sounds: string[] = [];
    currentSound: unknown = undefined;
    start = start;
    stop = stop;
    setPosition = setPosition;
    setVolume = setVolume;
    setPriorityGroupId = setPriorityGroupId;
    setMaxDistance = setMaxDistance;
    load = load;
    playSoundFireAndForget = playSoundFireAndForget;
    destroy = destroy;
  },
}));

jest.mock('@/audio/AudioEngine', () => ({
  AudioEngine: {
    GetAudioEngine: () => ({}),
  },
}));

import { MGTrackFollowerSounds } from '@/module/minigame/MGTrackFollowerSounds';
import { MGTrackFollowerAudio } from '@/module/minigame/MGTrackFollowerAudio';
import { AudioPriorityGroup } from '@/enums/audio/AudioPriorityGroup';

describe('MGTrackFollowerAudio', () => {
  let sounds: MGTrackFollowerSounds;
  let audio: MGTrackFollowerAudio;

  beforeEach(() => {
    jest.clearAllMocks();
    sounds = new MGTrackFollowerSounds();
    audio = new MGTrackFollowerAudio(sounds, true);
  });

  test('go without engine resref is a safe no-op', async () => {
    audio.go(1, 2, 3);
    await audio.load();
    expect(start).not.toHaveBeenCalled();
  });

  test('load + go starts looping engine emitter', async () => {
    sounds.engineResRef = 'n_swoopeng';
    sounds.setSoundVolume(0, 80);
    await audio.load();
    expect(setPriorityGroupId).toHaveBeenCalledWith(AudioPriorityGroup.DEFAULT);
    expect(setVolume).toHaveBeenCalledWith(80);
    audio.go(1, 2, 3);
    expect(setPosition).toHaveBeenCalledWith(1, 2, 3);
    expect(start).toHaveBeenCalled();
  });

  test('enemy uses MINIGAME_ENEMY priority', async () => {
    sounds.engineResRef = 'n_swoopeng';
    const enemyAudio = new MGTrackFollowerAudio(sounds, false);
    await enemyAudio.load();
    expect(setPriorityGroupId).toHaveBeenCalledWith(AudioPriorityGroup.MINIGAME_ENEMY);
  });

  test('setSoundVolume after load pushes to emitter', async () => {
    sounds.engineResRef = 'n_swoopeng';
    await audio.load();
    setVolume.mockClear();
    sounds.setSoundVolume(0, 55);
    expect(setVolume).toHaveBeenCalledWith(55);
  });

  test('playDeathSound uses volume 100 by default', async () => {
    sounds.engineResRef = 'n_swoopeng';
    sounds.deathResRef = 'n_swoopdie';
    await audio.load();
    audio.go();
    stop.mockClear();
    setVolume.mockClear();
    await audio.playDeathSound();
    expect(stop).toHaveBeenCalled();
    expect(setVolume).toHaveBeenCalledWith(100);
    expect(playSoundFireAndForget).toHaveBeenCalledWith('n_swoopdie');
  });

  test('playDeathSound uses volume 127 for mgs_accelpad', async () => {
    sounds.deathResRef = 'mgs_accelpad';
    setVolume.mockClear();
    await audio.playDeathSound();
    expect(setVolume).toHaveBeenCalledWith(127);
  });

  test('destroy clears volume hook', async () => {
    sounds.engineResRef = 'n_swoopeng';
    await audio.load();
    expect(sounds.onEngineVolumeChanged).toBeDefined();
    audio.destroy();
    expect(sounds.onEngineVolumeChanged).toBeUndefined();
    expect(destroy).toHaveBeenCalled();
  });
});
