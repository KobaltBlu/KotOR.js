import * as THREE from "three";
import { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import { OdysseyFace3 } from "@/three/odyssey/OdysseyFace3";
import { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";

function makeFace(wok: OdysseyWalkMesh, a: number, b: number, c: number): OdysseyFace3 {
  const face = new OdysseyFace3(a, b, c);
  face.walkmesh = wok;
  face.walkIndex = 0;
  face.triangle = new THREE.Triangle(wok.vertices[a], wok.vertices[b], wok.vertices[c]);
  face.normal = new THREE.Vector3(0, 0, 1);
  return face;
}

function makeEdge(
  wok: OdysseyWalkMesh,
  index: number,
  start: THREE.Vector3,
  end: THREE.Vector3
): WalkmeshEdge {
  const edge = new WalkmeshEdge(-1);
  edge.setWalkmesh(wok);
  edge.index = index;
  edge.line.start.copy(start);
  edge.line.end.copy(end);
  edge.box.makeEmpty();
  edge.box.expandByPoint(start);
  edge.box.expandByPoint(end);
  edge.line.at(0.5, edge.center_point);
  wok.edges.set(index, edge);
  return edge;
}

describe("OdysseyWalkMesh spatial helpers", () => {
  it("raycast respects candidate face subsets", () => {
    const wok = new OdysseyWalkMesh();
    wok.vertices = [
      new THREE.Vector3(-1, -1, 0),
      new THREE.Vector3(1, -1, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(9, -1, 0),
      new THREE.Vector3(11, -1, 0),
      new THREE.Vector3(10, 1, 0),
    ];
    const nearFace = makeFace(wok, 0, 1, 2);
    const farFace = makeFace(wok, 3, 4, 5);
    wok.faces = [nearFace, farFace];
    wok.mesh = new THREE.Mesh();
    wok.mesh.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      0,
      5
    );

    expect(wok.raycast(raycaster, [farFace])).toHaveLength(0);
    const hits = wok.raycast(raycaster, [nearFace]);
    expect(hits).toHaveLength(1);
    expect((hits[0] as any).face).toBe(nearFace);
  });

  it("getEdgesInBox uses the edge AABB tree and matches brute-force overlap", () => {
    const wok = new OdysseyWalkMesh();
    const near = makeEdge(
      wok,
      0,
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0)
    );
    const far = makeEdge(
      wok,
      1,
      new THREE.Vector3(20, 0, 0),
      new THREE.Vector3(22, 0, 0)
    );
    wok.buildEdgeAABBTree();
    expect(wok.hasEdgeBvh).toBe(true);

    const query = new THREE.Box3(
      new THREE.Vector3(-2, -1, -1),
      new THREE.Vector3(2, 1, 1)
    );
    const hits = wok.getEdgesInBox(query);
    expect(hits).toContain(near);
    expect(hits).not.toContain(far);

    // Brute-force reference with tree disabled (invalidate sector cache)
    const root = wok.edgeBvhRoot;
    wok.edgeBvhRoot = -1;
    wok.invalidateSpatialCaches();
    const brute = wok.getEdgesInBox(query);
    wok.edgeBvhRoot = root;
    expect(hits.map((e) => e.index).sort()).toEqual(brute.map((e) => e.index).sort());
  });

  it("getEdgesInBox BVH matches brute force over randomized edges and boxes", () => {
    const wok = new OdysseyWalkMesh();
    const rng = (seed: number) => {
      let s = seed >>> 0;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
      };
    };
    const rand = rng(0xC0FFEE);
    const edgeCount = 256;
    for(let i = 0; i < edgeCount; i++){
      const x = rand() * 40 - 5;
      const y = rand() * 40 - 5;
      const z = rand() * 2 - 1;
      const dx = rand() * 2 - 0.5;
      const dy = rand() * 2 - 0.5;
      makeEdge(
        wok,
        i,
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x + dx, y + dy, z)
      );
    }
    wok.buildEdgeAABBTree();
    expect(wok.hasEdgeBvh).toBe(true);

    const query = new THREE.Box3();
    const bvhOut: WalkmeshEdge[] = [];
    const bruteOut: WalkmeshEdge[] = [];
    for(let q = 0; q < 500; q++){
      const cx = rand() * 40 - 5;
      const cy = rand() * 40 - 5;
      const cz = rand() * 2 - 1;
      const hx = 0.2 + rand() * 2;
      const hy = 0.2 + rand() * 2;
      const hz = 0.2 + rand() * 1;
      query.min.set(cx - hx, cy - hy, cz - hz);
      query.max.set(cx + hx, cy + hy, cz + hz);

      wok.invalidateSpatialCaches();
      wok.getEdgesInBox(query, bvhOut);

      const root = wok.edgeBvhRoot;
      wok.edgeBvhRoot = -1;
      wok.invalidateSpatialCaches();
      wok.getEdgesInBox(query, bruteOut);
      wok.edgeBvhRoot = root;

      expect(bvhOut.map((e) => e.index).sort((a, b) => a - b)).toEqual(
        bruteOut.map((e) => e.index).sort((a, b) => a - b)
      );
    }
  });
});
