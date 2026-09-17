/**
 * Pure walkable room/face probe for movement commit attachment.
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/GameState", () => ({ GameState: {} }));

import { findWalkableAttachmentAt } from "@/engine/movement/area-movement-queries";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleRoom } from "@/module/ModuleRoom";
import type { OdysseyFace3 } from "@/three/odyssey";

function pointInTri(
  pt: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  v3: THREE.Vector3
): boolean {
  const sign = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(pt, v1, v2);
  const d2 = sign(pt, v2, v3);
  const d3 = sign(pt, v3, v1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function makeRoom(
  name: string,
  verts: [THREE.Vector3, THREE.Vector3, THREE.Vector3]
): ModuleRoom {
  const face = {
    walkIndex: 1,
    triangle: new THREE.Triangle(verts[0], verts[1], verts[2]),
    pointInFace2d(pt: THREE.Vector3){
      return pointInTri(pt, verts[0], verts[1], verts[2]);
    },
  } as unknown as OdysseyFace3;
  return {
    roomName: name,
    collisionManager: {
      walkmesh: {
        name,
        walkableFaces: [face],
      },
    },
  } as unknown as ModuleRoom;
}

describe("findWalkableAttachmentAt", () => {
  const roomA = makeRoom("roomA", [
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(2, 0, 1),
    new THREE.Vector3(1, 2, 1),
  ]);
  const roomB = makeRoom("roomB", [
    new THREE.Vector3(10, 10, 2),
    new THREE.Vector3(12, 10, 2),
    new THREE.Vector3(11, 12, 2),
  ]);
  const area = { rooms: [roomA, roomB] } as unknown as ModuleArea;

  it("prefers the current room when the point still lies on its face", () => {
    const pt = new THREE.Vector3(1, 0.5, 0);
    const hit = findWalkableAttachmentAt(area, pt, roomA);
    expect(hit?.room).toBe(roomA);
    expect(hit?.z).toBeCloseTo(1.005);
  });

  it("finds another room when feet leave the preferred wok", () => {
    // Live-style: stale preferRoom 02j while standing on 02e
    const pt = new THREE.Vector3(11, 10.5, 0);
    const hit = findWalkableAttachmentAt(area, pt, roomA);
    expect(hit?.room).toBe(roomB);
    expect(hit?.face).toBe(roomB.collisionManager.walkmesh!.walkableFaces[0]);
    expect(hit?.z).toBeCloseTo(2.005);
  });

  it("returns undefined when no walkable face contains the point", () => {
    const hit = findWalkableAttachmentAt(
      area,
      new THREE.Vector3(50, 50, 0),
      roomA
    );
    expect(hit).toBeUndefined();
  });
});
