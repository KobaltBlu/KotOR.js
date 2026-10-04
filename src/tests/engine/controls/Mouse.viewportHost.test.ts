/**
 * Mouse.Update host path must set positionViewportInt for GUI hit-tests.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

const mockHost = {
  getBoundingClientRect: () => ({
    left: 100,
    top: 50,
    width: 800,
    height: 600,
    right: 900,
    bottom: 650,
    x: 100,
    y: 50,
    toJSON: () => ({}),
  }),
  clientWidth: 800,
  clientHeight: 600,
} as unknown as HTMLElement;

jest.mock('@engine/managers/ResolutionManager', () => ({
  ResolutionManager: {
    viewportHost: null as HTMLElement | null,
    screenResolution: { width: 800, height: 600, isDynamicRes: true },
    windowResolution: { width: 800, height: 600 },
    vpScaleFactor: 1,
  },
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: { canvas: undefined, iniConfig: undefined },
}));

import { ResolutionManager } from '@engine/managers/ResolutionManager';
import { Mouse } from '@engine/controls/Mouse';

describe('Mouse.Update viewportHost', () => {
  beforeEach(() => {
    (ResolutionManager as any).viewportHost = mockHost;
    Mouse.positionViewportInt.x = 0;
    Mouse.positionViewportInt.y = 0;
  });

  afterEach(() => {
    (ResolutionManager as any).viewportHost = null;
  });

  test('sets positionViewportInt from host-local coords', () => {
    // client (350, 200) → local (250, 150) inside host at (100, 50)
    Mouse.Update(350, 200);

    expect(Mouse.positionViewport.x).toBe(250);
    expect(Mouse.positionViewport.y).toBe(150);
    expect(Mouse.positionViewportInt.x).toBe(250);
    expect(Mouse.positionViewportInt.y).toBe(150);
    expect(Mouse.positionUI.x).toBe(250 - 400);
    expect(Mouse.positionUI.y).toBe(-(150 - 300));
  });
});
