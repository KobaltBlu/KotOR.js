/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach } from '@jest/globals';
import {
  MGTrackFollowerSounds,
  MG_SOUND_ENGINE,
  MG_SOUND_DEATH,
} from '@engine/module/minigame/MGTrackFollowerSounds';

describe('MGTrackFollowerSounds', () => {
  let sounds: MGTrackFollowerSounds;

  beforeEach(() => {
    sounds = new MGTrackFollowerSounds();
  });

  test('out-of-range index returns 0 / no-ops', () => {
    expect(sounds.getSoundFrequency(-1)).toBe(0);
    expect(sounds.getSoundFrequency(2)).toBe(0);
    expect(sounds.getSoundVolume(99)).toBe(0);
    sounds.setSoundFrequency(2, 50);
    expect(sounds.getSoundFrequency(0)).toBe(0);
  });

  test('engine and death slots are independent', () => {
    sounds.setSoundFrequency(MG_SOUND_ENGINE, 10);
    sounds.setSoundFrequency(MG_SOUND_DEATH, 20);
    sounds.setSoundVolume(MG_SOUND_ENGINE, 64);
    sounds.setSoundVolume(MG_SOUND_DEATH, 100);
    sounds.setSoundFrequencyIsRandom(MG_SOUND_ENGINE, 1);

    expect(sounds.getSoundFrequency(MG_SOUND_ENGINE)).toBe(10);
    expect(sounds.getSoundFrequency(MG_SOUND_DEATH)).toBe(20);
    expect(sounds.getSoundVolume(MG_SOUND_ENGINE)).toBe(64);
    expect(sounds.getSoundVolume(MG_SOUND_DEATH)).toBe(100);
    expect(sounds.getSoundFrequencyIsRandom(MG_SOUND_ENGINE)).toBe(1);
    expect(sounds.getSoundFrequencyIsRandom(MG_SOUND_DEATH)).toBe(0);
  });

  test('setSoundVolume on engine invokes onEngineVolumeChanged with byte', () => {
    const calls: number[] = [];
    sounds.onEngineVolumeChanged = (v) => calls.push(v);
    sounds.setSoundVolume(MG_SOUND_ENGINE, 200);
    sounds.setSoundVolume(MG_SOUND_DEATH, 50);
    expect(calls).toEqual([200 & 0xff]);
  });

  test('loadFromSoundsStruct reads Death and Engine resrefs', () => {
    const node = {
      hasField: (n: string) => n === 'Death' || n === 'Engine',
      getFieldByLabel: (n: string) => ({
        getValue: () => (n === 'Death' ? 'n_swoopdie' : 'n_swoopeng'),
      }),
    };
    sounds.loadFromSoundsStruct(node);
    expect(sounds.deathResRef).toBe('n_swoopdie');
    expect(sounds.engineResRef).toBe('n_swoopeng');
  });
});
