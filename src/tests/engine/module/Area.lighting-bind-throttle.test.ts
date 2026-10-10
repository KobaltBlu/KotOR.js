/**
 * @jest-environment node
 *
 * updateRoomAnimatedLights: baker every frame; bindArea ~30Hz.
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const tickIdle = jest.fn();
const flushDirty = jest.fn();
const bindArea = jest.fn();

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    lightManager: {},
    currentCamera: {},
    PartyManager: { party: [] },
    player: undefined,
  },
}));
jest.mock("@engine/render/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@engine/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@engine/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@engine/render/FollowerCamera", () => ({ FollowerCamera: {} }));
jest.mock("@engine/managers/PlaceableLightmapBaker", () => ({
  PlaceableLightmapBaker: {
    tickIdle: (...args: unknown[]) => tickIdle(...args),
    flushDirty: (...args: unknown[]) => flushDirty(...args),
  },
}));
jest.mock("@engine/render/three/odyssey/OdysseyLightingBinder", () => ({
  OdysseyLightingBinder: {
    bindArea: (...args: unknown[]) => bindArea(...args),
  },
}));

import { Area } from "@engine/module/Area";

describe("Area.updateRoomAnimatedLights throttle", () => {
  function makeArea(): Area {
    const area = Object.create(Area.prototype) as Area;
    area.rooms = [] as any;
    area.creatures = [] as any;
    area.placeables = [] as any;
    area.doors = [] as any;
    area.items = [] as any;
    area.areaOfEffects = [] as any;
    area.miniGame = undefined as any;
    (area as any)._lightingDynamicsScratch = [];
    // Same seed as Area field initializer — first call binds immediately.
    (area as any)._lightingBindAccum = 1 / 30;
    return area;
  }

  beforeEach(() => {
    tickIdle.mockClear();
    flushDirty.mockClear();
    bindArea.mockClear();
  });

  it("runs baker every call but binds only at ~30Hz", () => {
    const area = makeArea();

    area.updateRoomAnimatedLights(0.016);
    expect(tickIdle).toHaveBeenCalledTimes(1);
    expect(flushDirty).toHaveBeenCalledTimes(1);
    expect(bindArea).toHaveBeenCalledTimes(1);

    area.updateRoomAnimatedLights(0.016);
    expect(tickIdle).toHaveBeenCalledTimes(2);
    expect(flushDirty).toHaveBeenCalledTimes(2);
    expect(bindArea).toHaveBeenCalledTimes(1);

    area.updateRoomAnimatedLights(0.02);
    expect(tickIdle).toHaveBeenCalledTimes(3);
    expect(flushDirty).toHaveBeenCalledTimes(3);
    expect(bindArea).toHaveBeenCalledTimes(2);
  });
});
