/**
 * @jest-environment node
 *
 * Door reticle hostility: sticky-target dual-flag
 * (is_hostile + hasTrap), not Locked/Plot.
 */
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

const getReputation = jest.fn<(a: unknown, b: unknown) => number>();

jest.mock('@/GameState', () => ({
  GameState: {
    getCurrentPlayer: jest.fn(),
    FactionManager: {
      GetReputation: (...args: unknown[]) => getReputation(...args),
    },
  },
}));

jest.mock('@/combat/combat-engagement', () => ({
  getClientCombatMode: () => false,
}));

jest.mock('@/module/guards/isCreature', () => ({
  isCreature: () => false,
}));
jest.mock('@/module/guards/isPlaceable', () => ({
  isPlaceable: () => false,
}));
jest.mock('@/module/guards/isTrigger', () => ({
  isTrigger: () => false,
}));
jest.mock('@/module/guards/isDoor', () => ({
  isDoor: (o: { __door?: boolean } | undefined) => !!o?.__door,
}));

jest.mock('@/loaders', () => ({ TextureLoader: { enQueue: jest.fn() } }));
jest.mock('@/controls/Mouse', () => ({ Mouse: {} }));
jest.mock('@/utility/ApplicationProfile', () => ({ ApplicationProfile: {} }));
jest.mock('@/three/odyssey/OdysseyObject3D', () => ({ OdysseyObject3D: class {} }));
jest.mock('three', () => {
  class Vec {
    x = 0; y = 0; z = 0;
    set(){ return this; }
    copy(){ return this; }
    project(){ return this; }
  }
  return {
    SpriteMaterial: class {},
    Sprite: class {
      position = new Vec();
      scale = new Vec();
      visible = false;
      material = {};
    },
    Vector2: Vec,
    Vector3: Vec,
    Box3: class {
      setFromObject(){ return this; }
      getSize(out?: Vec){ return out ?? new Vec(); }
      getCenter(out?: Vec){ return out ?? new Vec(); }
    },
    Raycaster: class {
      setFromCamera(){ return this; }
      intersectObjects(){ return []; }
    },
    Object3D: class {},
  };
});

import { CursorManager } from '@/managers/CursorManager';
import { GameState } from '@/GameState';

function makeViewer(factionId = 1) {
  return {
    id: 100,
    factionId,
    faction: { id: factionId },
  } as any;
}

function makeDoor(opts: {
  locked?: boolean;
  open?: boolean;
  trapFlag?: boolean;
  trapDetected?: boolean;
  detectedByViewer?: boolean;
  factionId?: number;
}) {
  const viewerId = 100;
  const door: any = {
    __door: true,
    locked: !!opts.locked,
    trapFlag: !!opts.trapFlag,
    trapDetected: !!opts.trapDetected,
    factionId: opts.factionId ?? 2,
    faction: { id: opts.factionId ?? 2 },
    isLocked: () => !!opts.locked,
    isOpen: () => !!opts.open,
    isTrapDetectedBy: (cre: { id?: number }) =>
      !!opts.detectedByViewer && cre?.id === viewerId,
  };
  return door;
}

describe('CursorManager.isReticleHostile doors', () => {
  beforeEach(() => {
    getReputation.mockReset();
    (GameState.getCurrentPlayer as jest.Mock).mockReturnValue(makeViewer(1));
  });

  test('locked closed non-trap door is not hostile', () => {
    getReputation.mockReturnValue(50);
    const door = makeDoor({ locked: true, open: false, trapFlag: false });
    expect(CursorManager.isReticleHostile(door, makeViewer(1))).toBe(false);
  });

  test('trap + detected + rep < 90 + different faction is hostile', () => {
    getReputation.mockReturnValue(50);
    const door = makeDoor({
      trapFlag: true,
      trapDetected: true,
      factionId: 2,
    });
    expect(CursorManager.isReticleHostile(door, makeViewer(1))).toBe(true);
  });

  test('trap on DetectedBy list (not global latch) is hostile when factions differ', () => {
    getReputation.mockReturnValue(40);
    const door = makeDoor({
      trapFlag: true,
      trapDetected: false,
      detectedByViewer: true,
      factionId: 5,
    });
    expect(CursorManager.isReticleHostile(door, makeViewer(1))).toBe(true);
  });

  test('trap but not detected is not hostile', () => {
    getReputation.mockReturnValue(50);
    const door = makeDoor({
      trapFlag: true,
      trapDetected: false,
      detectedByViewer: false,
      factionId: 2,
    });
    expect(CursorManager.isReticleHostile(door, makeViewer(1))).toBe(false);
  });

  test('friendly reputation (>= 90) is not hostile', () => {
    getReputation.mockReturnValue(95);
    const door = makeDoor({
      trapFlag: true,
      trapDetected: true,
      factionId: 2,
    });
    expect(CursorManager.isReticleHostile(door, makeViewer(1))).toBe(false);
  });

  test('same faction is not hostile', () => {
    getReputation.mockReturnValue(50);
    const door = makeDoor({
      trapFlag: true,
      trapDetected: true,
      factionId: 1,
    });
    expect(CursorManager.isReticleHostile(door, makeViewer(1))).toBe(false);
  });
});
