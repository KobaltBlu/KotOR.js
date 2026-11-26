/**
 * @jest-environment node
 *
 * AudioLoader.LoadAmbientSound decodes each streammusic file once (concurrent
 * and repeat loads share it), hands every caller its own copy (decodeAudioData
 * detaches the buffer), retries failures, and evicts past its byte budget.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AudioLoader } from '@engine/audio/AudioLoader';
import { AudioFile } from '@engine/audio/AudioFile';
import { GameFileSystem } from '@core/filesystem/GameFileSystem';

describe('AudioLoader stream cache', () => {
  let decode: any;
  beforeEach(() => {
    AudioLoader.clearStreamCache();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(GameFileSystem, 'readFile').mockResolvedValue(new Uint8Array(8));
    decode = jest.spyOn(AudioFile.prototype, 'getPlayableByteStream')
      .mockImplementation(async () => Uint8Array.from([1, 2, 3, 4]));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AudioLoader.clearStreamCache();
  });

  test('decodes once and returns independent copies', async () => {
    const [a, b] = await Promise.all([AudioLoader.LoadMusic('mus_area_tar'), AudioLoader.LoadMusic('MUS_AREA_TAR')]);
    const c = await AudioLoader.LoadAmbientSound('mus_area_tar');
    expect(decode).toHaveBeenCalledTimes(1);
    expect(Array.from(a)).toEqual([1, 2, 3, 4]);
    expect(a.buffer).not.toBe(b.buffer);
    expect(a.buffer).not.toBe(c.buffer);
    a.fill(0);
    expect(Array.from(c)).toEqual([1, 2, 3, 4]);
    expect(a.buffer.byteLength).toBe(4);
  });

  test('a failed decode is not cached', async () => {
    decode.mockRejectedValueOnce(new Error('bad'));
    await expect(AudioLoader.LoadMusic('mus_x')).rejects.toThrow('bad');
    expect(Array.from(await AudioLoader.LoadMusic('mus_x'))).toEqual([1, 2, 3, 4]);
    expect(decode).toHaveBeenCalledTimes(2);
  });

  test('evicts least recently used tracks past the budget', async () => {
    const prev = AudioLoader.streamCacheBudgetBytes;
    AudioLoader.streamCacheBudgetBytes = 8;
    try{
      await AudioLoader.LoadMusic('a');
      await AudioLoader.LoadMusic('b');
      await AudioLoader.LoadMusic('a'); // a is now most recent
      await AudioLoader.LoadMusic('c'); // evicts b
      expect(decode).toHaveBeenCalledTimes(3);
      await AudioLoader.LoadMusic('a');
      expect(decode).toHaveBeenCalledTimes(3);
      await AudioLoader.LoadMusic('b');
      expect(decode).toHaveBeenCalledTimes(4);
    }finally{
      AudioLoader.streamCacheBudgetBytes = prev;
    }
  });
});
