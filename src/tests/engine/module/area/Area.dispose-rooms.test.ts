/**
 * @jest-environment node
 *
 * AreaRoom is not a GameObject — destroy must not rely on detachObject.
 * dispose() must shift rooms so the while-loop terminates.
 */
import { describe, expect, test, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    PartyManager: { party: [] },
    walkmeshList: [],
    grassManager: undefined,
  },
}));
jest.mock('@engine/audio/AudioEngine', () => ({
  AudioEngine: {
    GetAudioEngine: () => ({
      fadeStopDialogAmbientTrack: jest.fn(),
      areaMusicLoaded: false,
      areaMusicNightLoaded: false,
    }),
  },
}));
jest.mock('@engine/managers', () => ({
  DirtyTextureManager: { dispose: jest.fn() },
  TextureAnimationManager: { dispose: jest.fn() },
}));
jest.mock('@engine/render/three/odyssey', () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock('@engine/render/three/odyssey/OdysseyModel3D', () => ({ OdysseyModel3D: class {} }));
jest.mock('three/examples/jsm/utils/BufferGeometryUtils', () => ({}));
jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: {} }));
jest.mock('@engine/nwscript/NWScriptInstance', () => ({ NWScriptInstance: class {} }));
jest.mock('@engine/render/FollowerCamera', () => ({ FollowerCamera: {} }));

import { Area } from '@engine/module/Area';

describe('Area.dispose rooms', () => {
  test('clears rooms even when destroy does not remove from the array', () => {
    const destroyCalls: string[] = [];
    const rooms = [
      { roomName: 'r0', destroy(){ destroyCalls.push(this.roomName); } },
      { roomName: 'r1', destroy(){ destroyCalls.push(this.roomName); } },
      { roomName: 'r2', destroy(){ destroyCalls.push(this.roomName); } },
    ];

    const area = Object.create(Area.prototype) as Area;
    area.areaMap = { dispose: jest.fn() } as any;
    area.corpseCache = { clear: jest.fn() } as any;
    area.miniGame = undefined;
    area.rooms = rooms as any;
    area.areaOfEffects = [];
    area.creatures = [];
    area.items = [];
    area.placeables = [];
    area.doors = [];
    area.triggers = [];
    area.waypoints = [];
    area.sounds = [];
    area.weather = { destroy: jest.fn() } as any;

    // Would hang forever if dispose used rooms[0].destroy() without shifting.
    const started = Date.now();
    area.dispose();
    expect(Date.now() - started).toBeLessThan(1000);

    expect(area.rooms).toHaveLength(0);
    expect(destroyCalls).toEqual(['r0', 'r1', 'r2']);
  });
});
