/**
 * @jest-environment node
 *
 * GetRoomIndex(pos, 0): vertical segment (x,y,z±1000) vs room AABB.
 */
import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));
jest.mock("@engine/render/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@engine/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@engine/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@engine/render/FollowerCamera", () => ({ FollowerCamera: {} }));

import { Area } from '@engine/module/Area';

function makeRoom(opts: {
  name: string;
  min: [number, number, number];
  max: [number, number, number];
  walkmesh?: { min: [number, number, number]; max: [number, number, number] };
}) {
  const box = new THREE.Box3(
    new THREE.Vector3(...opts.min),
    new THREE.Vector3(...opts.max),
  );
  const room: any = {
    roomName: opts.name,
    box,
    collisionManager: {},
  };
  if(opts.walkmesh){
    room.collisionManager.walkmesh = {
      box: new THREE.Box3(
        new THREE.Vector3(...opts.walkmesh.min),
        new THREE.Vector3(...opts.walkmesh.max),
      ),
    };
  }
  return room;
}

function makeArea(rooms: any[]): Area {
  const area = Object.create(Area.prototype) as Area;
  area.rooms = rooms;
  return area;
}

describe('Area.getRoomAtPosition (engine GetRoomIndex)', () => {
  test('camera above room still hits via vertical ±1000 probe', () => {
    const room = makeRoom({
      name: 'm01aa_01a',
      min: [0, 0, 0],
      max: [10, 10, 4],
    });
    const area = makeArea([room]);
    // Camera sits well above the room AABB (common dialog shot).
    const hit = area.getRoomAtPosition(new THREE.Vector3(5, 5, 50));
    expect(hit).toBe(room);
  });

  test('camera outside Z±1000 misses', () => {
    const room = makeRoom({
      name: 'm01aa_01a',
      min: [0, 0, 0],
      max: [10, 10, 4],
    });
    const area = makeArea([room]);
    const half = Area.ROOM_PROBE_HALF_HEIGHT;
    // Room max.z=4; probe [z-1000, z+1000] must not overlap room Z.
    const hit = area.getRoomAtPosition(new THREE.Vector3(5, 5, half + 5));
    expect(hit).toBeUndefined();
  });

  test('XY miss returns undefined', () => {
    const room = makeRoom({
      name: 'm01aa_01a',
      min: [0, 0, 0],
      max: [10, 10, 4],
    });
    const area = makeArea([room]);
    const hit = area.getRoomAtPosition(new THREE.Vector3(100, 100, 2));
    expect(hit).toBeUndefined();
  });

  test('prefers walkmesh AABB over room.box', () => {
    const room = makeRoom({
      name: 'm01aa_01a',
      min: [0, 0, 0],
      max: [100, 100, 20],
      walkmesh: { min: [0, 0, 0], max: [10, 10, 2] },
    });
    const area = makeArea([room]);
    // Inside model box but outside walkmesh XY → miss (CheckAABBWalkable).
    expect(area.getRoomAtPosition(new THREE.Vector3(50, 50, 1))).toBeUndefined();
    expect(area.getRoomAtPosition(new THREE.Vector3(5, 5, 1))).toBe(room);
  });

  test('returns first matching room in array order', () => {
    const roomA = makeRoom({
      name: 'a',
      min: [0, 0, 0],
      max: [10, 10, 4],
    });
    const roomB = makeRoom({
      name: 'b',
      min: [0, 0, 0],
      max: [10, 10, 4],
    });
    const area = makeArea([roomA, roomB]);
    expect(area.getRoomAtPosition(new THREE.Vector3(5, 5, 2))).toBe(roomA);
  });
});
