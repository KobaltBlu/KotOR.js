/**
 * @jest-environment node
 *
 * Large forceVector must not tunnel through a room wall edge.
 */
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import * as THREE from 'three';
import { CollisionManager } from '@/engine/CollisionManager';

jest.mock('@/GameState', () => {
  const THREE = require('three');
  return {
    GameState: {
      raycaster: new THREE.Raycaster(),
      group: { collision_helpers: { add: jest.fn() } },
      module: { area: { creatures: [], rooms: [] as any[] } },
      PartyManager: { party: [] },
      debug: {},
    },
  };
});

jest.mock('@/odyssey', () => ({
  OdysseyWalkMesh: class {},
}));

jest.mock('@/three/odyssey', () => ({
  OdysseyFace3: class {},
}));

jest.mock('@/module/guards/isCreature', () => ({
  isCreature: () => true,
}));

import { GameState } from '@/GameState';

afterEach(() => {
  jest.restoreAllMocks();
});

function makeWalkableFace(){
  return {
    walkIndex: 0,
    pointInFace2d: () => true,
    triangle: {
      closestPointToPoint: (pos: THREE.Vector3, out: THREE.Vector3) => {
        out.set(pos.x, pos.y, 0);
        return out;
      },
    },
  };
}

/**
 * Wall along X at y=0, normal +Y (blocks movement from +Y toward −Y).
 */
function makeWallRoom(){
  const wallEdge = {
    transition: -1,
    normal: new THREE.Vector3(0, 1, 0),
    line: new THREE.Line3(
      new THREE.Vector3(-20, 0, 0),
      new THREE.Vector3(20, 0, 0)
    ),
  };

  const face = makeWalkableFace();
  const edgesMap = new Map<number, typeof wallEdge>([[0, wallEdge]]);

  const walkmesh = {
    edges: edgesMap,
    walkableFaces: [face],
  };

  const roomCollision = {
    walkmesh,
    edges: [wallEdge],
  };

  const room: any = {
    placeables: [],
    doors: [],
    collisionManager: roomCollision,
    findWalkableFace(object: any){
      object.collisionManager.groundFace = face;
      object.collisionManager.lastGroundFace = face;
      object.collisionManager.surfaceId = 0;
      object.attachToRoom(this);
      return face;
    },
  };

  return { room, wallEdge, face };
}

function makeCreature(room: any){
  const container = new THREE.Object3D();
  const model = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 1),
    new THREE.MeshBasicMaterial()
  );
  container.add(model);
  container.updateMatrix();
  container.updateMatrixWorld(true);

  const object: any = {
    model,
    container,
    position: new THREE.Vector3(0, 1.5, 0),
    box: new THREE.Box3(),
    sphere: new THREE.Sphere(),
    forceVector: new THREE.Vector3(),
    collisionBoundsDirty: true,
    collisionMatrixDirty: true,
    collisionTimer: 0,
    blockingTimer: 0,
    room,
    area: {
      creatures: [],
      rooms: [room],
    },
    getAppearance: () => ({ creperspace: 0.4 }),
    markCollisionMatrixDirty: jest.fn(),
    attachToRoom: jest.fn(function (this: any, r: any){ this.room = r; }),
  };

  object.collisionManager = new CollisionManager(object);
  object.collisionManager.groundFace = room.collisionManager.walkmesh.walkableFaces[0];
  return object;
}

describe('CollisionManager large-step wall tunneling', () => {
  beforeEach(() => {
    (GameState.module as any).area = { creatures: [], rooms: [] };
    (GameState as any).PartyManager = { party: [] };
  });

  test('large forceVector toward a wall does not cross to the far side', () => {
    const { room } = makeWallRoom();
    (GameState.module as any).area.rooms = [room];

    const object = makeCreature(room);
    // Start outside creperspace (0.4); step would cross y=0 without sweep/substeps
    object.position.set(0, 1.5, 0);
    object.forceVector.set(0, -5, 0);

    object.collisionManager.updateCollision(1.0);

    expect(object.position.y).toBeGreaterThan(0);
    // Stay on the walkable side of the wall (normal +Y), within personal space of the edge
    expect(object.position.y).toBeGreaterThanOrEqual(0.4 - 0.05);
  });

  test('small forceVector still advances toward the wall without jittering past it', () => {
    const { room } = makeWallRoom();
    (GameState.module as any).area.rooms = [room];

    const object = makeCreature(room);
    object.position.set(0, 1.0, 0);
    object.forceVector.set(0, -0.05, 0);

    const yBefore = object.position.y;
    object.collisionManager.updateCollision(1 / 60);

    expect(object.position.y).toBeLessThanOrEqual(yBefore + 1e-6);
    expect(object.position.y).toBeGreaterThan(0.4 - 0.05);
    expect(Math.abs(object.position.x)).toBeLessThan(1e-6);
  });
});
