/**
 * Placeable PWK wedge: capsule stuck between two partpiles (gap < 2*radius).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { composeObjectWalkmeshLocalToWorld } from "@engine/pathfinding/door-walkmesh-matrix";
import { isStaticWalkClearOnWalkMesh } from "@engine/pathfinding/static-walk-blockers-mesh";
import { isStaticWalkClearDetailed } from "@engine/pathfinding/static-walk-blockers";
import { collectBlockingWalkEdgeNormals } from "@engine/movement/wall-slide";
import type { Area } from "@engine/module/Area";
import type { Placeable } from "@engine/module/Placeable";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";

/** Retail plc_partpile-style diamond (flat Nonwalk, zero face normals). */
function makePartpileWok(headerPosition: THREE.Vector3): OdysseyWalkMesh {
  const vertices = [
    new THREE.Vector3(-0.009178999811410904, 0.5731179714202881, 0),
    new THREE.Vector3(-0.474606990814209, -0.009565429762005806, 0),
    new THREE.Vector3(0.029141699895262718, -0.5680350065231323, 0),
    new THREE.Vector3(0.449753999710083, -0.015190400183200836, 0),
  ];
  const surfacemat = { walk: false, walkCheck: true, label: "Nonwalk" };
  const zeroN = () => new THREE.Vector3(0, 0, 0);
  const pointInFace2d = function(this: OdysseyFace3, pt: THREE.Vector3){
    const wm = this.walkmesh!;
    const v1 = wm.vertices[this.a];
    const v2 = wm.vertices[this.b];
    const v3 = wm.vertices[this.c];
    const sign = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) =>
      (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign(pt, v1, v2);
    const d2 = sign(pt, v2, v3);
    const d3 = sign(pt, v3, v1);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };
  const face0 = {
    a: 3, b: 0, c: 1,
    surfacemat,
    walk: false,
    walkCheck: true,
    materialIndex: 7,
    walkIndex: 7,
    normal: zeroN(),
    pointInFace2d,
  } as unknown as OdysseyFace3;
  const face1 = {
    a: 3, b: 1, c: 2,
    surfacemat,
    walk: false,
    walkCheck: true,
    materialIndex: 7,
    walkIndex: 7,
    normal: zeroN(),
    pointInFace2d,
  } as unknown as OdysseyFace3;
  const wok = {
    header: { position: headerPosition.clone() },
    vertices,
    faces: [face0, face1],
    walkableFaces: [],
    matrixWorld: new THREE.Matrix4(),
    mat4: new THREE.Matrix4(),
  } as unknown as OdysseyWalkMesh;
  face0.walkmesh = wok;
  face1.walkmesh = wok;
  return wok;
}

function makePlaceable(
  id: number,
  pos: THREE.Vector3,
  wok: OdysseyWalkMesh,
  headerPos: THREE.Vector3
): Placeable {
  composeObjectWalkmeshLocalToWorld(
    wok.matrixWorld, pos, new THREE.Euler(0, 0, 0), headerPos
  );
  // Approximate AABB from transformed verts
  const box = new THREE.Box3();
  for(let i = 0; i < wok.vertices.length; i++){
    box.expandByPoint(wok.vertices[i].clone().applyMatrix4(wok.matrixWorld));
  }
  box.min.z = -0.1;
  box.max.z = 1;
  return {
    id,
    position: pos.clone(),
    rotation: new THREE.Euler(0, 0, 0),
    box,
    syncWalkmeshMatrix(){
      composeObjectWalkmeshLocalToWorld(
        wok.matrixWorld, this.position, this.rotation, headerPos
      );
    },
    collisionManager: { walkmesh: wok },
  } as unknown as Placeable;
}

describe("placeable partpile wedge escape", () => {
  // Live m02ac: two plc_partpile. Origin is 0.368 from the south pile and
  // 0.388 from the north pile, so a 0.4 capsule is genuinely wedged (exact
  // circle test; the old rectangle stadium wedged even a 0.36 capsule).
  const headerPos = new THREE.Vector3(-0.13, -0.02, 0);
  const southPos = new THREE.Vector3(56.62822723388672, 67.28730010986328, 0.005);
  const northPos = new THREE.Vector3(56.553409576416016, 68.72248077392578, 0.005);
  const origin = new THREE.Vector3(56.8347905690174, 67.99589535341013, 0.005);
  const radius = 0.4;

  it("hard-blocks every lateral probe while wedged (no soft-clear)", () => {
    const south = makePartpileWok(headerPos);
    composeObjectWalkmeshLocalToWorld(
      south.matrixWorld, southPos, new THREE.Euler(0, 0, 0), headerPos
    );
    const east = origin.clone();
    east.x += 0.5;
    const hard = isStaticWalkClearOnWalkMesh(south, origin, east, {
      personalSpace: radius,
      softClearStartOverlap: false,
    });
    expect(hard.clear).toBe(false);
  });

  it("softClearStartOverlap allows dest-only escape east of the wedge", () => {
    const southWok = makePartpileWok(headerPos);
    const northWok = makePartpileWok(headerPos);
    const south = makePlaceable(138, southPos, southWok, headerPos);
    const north = makePlaceable(139, northPos, northWok, headerPos);
    const area = {
      doors: [],
      placeables: [south, north],
    } as unknown as Area;

    const dest = new THREE.Vector3(57.5, origin.y, origin.z);

    const hard = isStaticWalkClearDetailed(area, origin, dest, {
      personalSpace: radius,
      skipMesh: true,
      softClearStartOverlap: false,
    });
    expect(hard.clear).toBe(false);

    const soft = isStaticWalkClearDetailed(area, origin, dest, {
      personalSpace: radius,
      skipMesh: true,
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(true);
  });

  it("softClearStartOverlap still blocks a dest that stays in the wedge", () => {
    const southWok = makePartpileWok(headerPos);
    const northWok = makePartpileWok(headerPos);
    const south = makePlaceable(138, southPos, southWok, headerPos);
    const north = makePlaceable(139, northPos, northWok, headerPos);
    const area = {
      doors: [],
      placeables: [south, north],
    } as unknown as Area;

    // Step into the north pile footprint — dest-only must still reject
    const dest = origin.clone();
    dest.y += 0.35;
    const soft = isStaticWalkClearDetailed(area, origin, dest, {
      personalSpace: radius,
      skipMesh: true,
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(false);
  });

  it("collectBlockingWalkEdgeNormals includes placeable edge normals in the gap", () => {
    const southWok = makePartpileWok(headerPos);
    const northWok = makePartpileWok(headerPos);
    const south = makePlaceable(138, southPos, southWok, headerPos);
    const north = makePlaceable(139, northPos, northWok, headerPos);
    const area = {
      walkEdges: [],
      placeables: [south, north],
    } as unknown as Area;

    const normals = collectBlockingWalkEdgeNormals(area, origin, radius);
    expect(normals.length).toBeGreaterThanOrEqual(1);
    // Opposing piles should contribute distinct normals (not a single deduped one).
    expect(normals.length).toBeGreaterThanOrEqual(2);
  });

  it("uses an exact capsule: a vertex 0.42 away on the diagonal does not block r=0.4", () => {
    // Pile at the origin with no header offset; point diagonal from the
    // right-most vertex. The old rectangle stadium reached r·√2 ≈ 0.57 at
    // its corners and reported a block for this tiny eastward step.
    const wok = makePartpileWok(new THREE.Vector3());
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld, new THREE.Vector3(), new THREE.Euler(0, 0, 0), new THREE.Vector3()
    );
    const from = new THREE.Vector3(0.449753999710083 + 0.3, -0.015190400183200836 + 0.3, 0);
    const to = from.clone();
    to.x += 0.01;
    const r = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      softClearStartOverlap: false,
    });
    expect(r.clear).toBe(true);

    // Same geometry with a capsule that really reaches the vertex still blocks.
    const r2 = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.43,
      softClearStartOverlap: false,
    });
    expect(r2.clear).toBe(false);
  });
});
