import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/loaders/ResourceLoader', () => ({
  ResourceLoader: {
    getResource: jest.fn(),
  },
}));

jest.mock('@/utility/GameFileSystem', () => ({
  GameFileSystem: {
    readFile: jest.fn(),
  },
}));

jest.mock('@/audio/AudioFile', () => ({
  AudioFile: jest.fn().mockImplementation(() => ({
    getPlayableByteStream: jest.fn(async () => Uint8Array.from([1, 2, 3])),
  })),
}));

import { ResourceLoader } from '@/loaders/ResourceLoader';
import { GameFileSystem } from '@/utility/GameFileSystem';
import { AudioLoader } from '@/audio/AudioLoader';
import { ResourceTypes } from '@/resource/ResourceTypes';

describe('AudioLoader.LoadStreamWave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads from the registered resource path when present', async () => {
    (ResourceLoader.getResource as jest.Mock).mockReturnValue({ file: 'streamwaves/trask01.wav' });
    (GameFileSystem.readFile as jest.Mock).mockResolvedValue(Uint8Array.from([0x10]));

    const data = await AudioLoader.LoadStreamWave('TrAsK01');

    expect(ResourceLoader.getResource).toHaveBeenCalledWith(ResourceTypes.wav, 'trask01');
    expect(GameFileSystem.readFile).toHaveBeenCalledWith('streamwaves/trask01.wav');
    expect(data).toEqual(Uint8Array.from([1, 2, 3]));
  });

  it('falls back to stream path lookup when registry entry is missing', async () => {
    (ResourceLoader.getResource as jest.Mock).mockReturnValue(null);
    (GameFileSystem.readFile as jest.Mock).mockResolvedValue(Uint8Array.from([0x20]));

    const data = await AudioLoader.LoadStreamWave('TrAsK01');

    expect(GameFileSystem.readFile).toHaveBeenCalled();
    expect(data).toEqual(Uint8Array.from([1, 2, 3]));
  });
});
