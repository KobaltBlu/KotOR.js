jest.mock('@/resource/BIKObject', () => ({
  BIKObject: jest.fn(),
}));

jest.mock('@/GameState', () => ({
  GameState: {},
}));

import { VideoManager } from '@/managers/VideoManager';

describe('VideoManager.update', () => {
  let updateVideoTextures: jest.Mock;

  beforeEach(() => {
    VideoManager.bikObject = null;
    VideoManager.isPlaying = false;
    updateVideoTextures = jest.fn();
    (VideoManager as any).updateVideoTextures = updateVideoTextures;
  });

  it('does not read the current frame after movie completion cleanup', () => {
    const bikObject = {
      update: jest.fn(() => {
        VideoManager.bikObject = null;
        VideoManager.isPlaying = false;
      }),
      getCurrentFrame: jest.fn(),
    };

    VideoManager.bikObject = bikObject as any;
    VideoManager.isPlaying = true;

    expect(() => VideoManager.update(0.016)).not.toThrow();
    expect(bikObject.update).toHaveBeenCalledWith(0.016);
    expect(bikObject.getCurrentFrame).not.toHaveBeenCalled();
    expect(updateVideoTextures).not.toHaveBeenCalled();
  });

  it('uploads the current frame when playback remains active', () => {
    const frame = { width: 2, height: 2 };
    const bikObject = {
      update: jest.fn(),
      getCurrentFrame: jest.fn(() => frame),
    };

    VideoManager.bikObject = bikObject as any;
    VideoManager.isPlaying = true;

    VideoManager.update(0.016);

    expect(bikObject.getCurrentFrame).toHaveBeenCalled();
    expect(updateVideoTextures).toHaveBeenCalledWith(frame);
  });
});
