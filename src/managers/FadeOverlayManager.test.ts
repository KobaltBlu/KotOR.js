/**
 * FadeOverlayManager holdForScript / fade gate parity.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    scene_gui: { add: jest.fn() },
  },
}));

import { FadeOverlayManager } from '@/managers/FadeOverlayManager';
import { FadeOverlayState } from '@/enums/engine/FadeOverlayState';

describe('FadeOverlayManager.holdForScript', () => {
  beforeEach(() => {
    FadeOverlayManager.Reset();
  });

  test('FadeOut is a no-op while holdForScript is set', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.FadeOut(1, 0, 0, 0, 0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.NONE);
  });

  test('FadeIn is a no-op while holdForScript is set', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.FadeIn(1, 0, 0, 0, 0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.NONE);
  });

  test('Reset clears holdForScript', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.Reset();
    expect(FadeOverlayManager.holdForScript).toBe(false);
  });

  test('FadeIn proceeds after hold is cleared', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.holdForScript = false;
    FadeOverlayManager.FadeIn(0, 0, 0, 0, 0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADED_IN);
  });
});
