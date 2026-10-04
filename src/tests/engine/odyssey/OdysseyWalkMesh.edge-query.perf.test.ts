/**
 * @jest-environment node
 *
 * Opt-in microbench for getEdgesInBox. Run with:
 *   KOTOR_PERF=1 npx jest src/tests/odyssey/OdysseyWalkMesh.edge-query.perf.test.ts
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";

const RUN_PERF = process.env.KOTOR_PERF === "1";

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

/** Synthetic grid of ~2k edges spanning a 50x50 room. */
function buildSyntheticWalkmesh(edgeCount = 2048): OdysseyWalkMesh {
  const wok = new OdysseyWalkMesh();
  const cols = Math.ceil(Math.sqrt(edgeCount));
  let n = 0;
  for(let y = 0; y < cols && n < edgeCount; y++){
    for(let x = 0; x < cols && n < edgeCount; x++){
      const ox = x * 1.0;
      const oy = y * 1.0;
      makeEdge(
        wok,
        n++,
        new THREE.Vector3(ox, oy, 0),
        new THREE.Vector3(ox + 0.8, oy, 0)
      );
    }
  }
  wok.buildEdgeAABBTree();
  return wok;
}

function timeQueries(wok: OdysseyWalkMesh, iterations: number, warm: boolean): number {
  const query = new THREE.Box3();
  const out: WalkmeshEdge[] = [];
  if(warm){
    // Touch a few sectors so the LRU is hot before the timed loop.
    for(let i = 0; i < 64; i++){
      const cx = (i % 8) * 6 + 0.5;
      const cy = Math.floor(i / 8) * 6 + 0.5;
      query.set(
        new THREE.Vector3(cx - 0.5, cy - 0.5, -0.5),
        new THREE.Vector3(cx + 0.5, cy + 0.5, 0.5)
      );
      wok.getEdgesInBox(query, out);
    }
  }else{
    wok.invalidateSpatialCaches();
  }

  const t0 = performance.now();
  for(let i = 0; i < iterations; i++){
    const cx = (i * 0.37) % 48;
    const cy = (i * 0.71) % 48;
    query.min.set(cx - 0.5, cy - 0.5, -0.5);
    query.max.set(cx + 0.5, cy + 0.5, 0.5);
    wok.getEdgesInBox(query, out);
  }
  return performance.now() - t0;
}

(RUN_PERF ? describe : describe.skip)("OdysseyWalkMesh getEdgesInBox perf", () => {
  it("times cold and warm queries over a ~2k edge mesh", () => {
    const wok = buildSyntheticWalkmesh(2048);
    expect(wok.hasEdgeBvh).toBe(true);
    expect(wok.edges.size).toBeGreaterThanOrEqual(2000);

    const iterations = 100_000;
    const coldMs = timeQueries(wok, iterations, false);
    const warmMs = timeQueries(wok, iterations, true);

    // eslint-disable-next-line no-console
    console.log(
      `[getEdgesInBox] edges=${wok.edges.size} iterations=${iterations} ` +
      `cold=${coldMs.toFixed(2)}ms warm=${warmMs.toFixed(2)}ms ` +
      `(${(iterations / warmMs * 1000).toFixed(0)} q/s warm)`
    );

    expect(coldMs).toBeGreaterThan(0);
    expect(warmMs).toBeGreaterThan(0);
  });
});
