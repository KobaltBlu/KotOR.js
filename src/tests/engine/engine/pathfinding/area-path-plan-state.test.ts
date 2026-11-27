/**
 * AreaPath.traverseToPoint plan-state hygiene:
 * - the temporary origin/destination links never stay on the shared PTH nodes,
 *   including when the tick budget is spent before the search runs;
 * - a DFS resume left for other endpoints does not suppress the direct-line test;
 * - clearOwnerPlanState drops the owner's pending DFS resume.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const budget = {
  exhausted: false,
  take: 4,
  remaining: 4,
};
const hasClearWalkLine = jest.fn<(...args: unknown[]) => boolean>();
const search = jest.fn<(self: any, opts: any) => void>();

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));
jest.mock("@engine/loaders", () => ({ ResourceLoader: {} }));
jest.mock("@core/resource/GFFObject", () => ({ GFFObject: class {} }));
jest.mock("@engine/runtime/EngineDebugController", () => ({ EngineDebugController: {} }));
jest.mock("@engine/pathfinding/path-plan-budget", () => ({
  isPathPlanBudgetExhausted: () => budget.exhausted,
  takePathPlanSearchBudgetMs: () => budget.take,
  pathPlanBudgetRemainingMs: () => budget.remaining,
  PATH_PLAN_SEARCH_SLICE_MS: 3,
}));
jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  hasClearWalkLine: (...args: unknown[]) => hasClearWalkLine(...args),
  farthestClearPoint: (_area: unknown, from: THREE.Vector3) => from.clone(),
}));
jest.mock("@engine/pathfinding/build-grid-path", () => ({ buildGridPath: (): undefined => undefined }));
jest.mock("@engine/pathfinding/pth-edge-clear", () => ({
  ensurePthStaticEdgeTable: () => {},
  isPthThinLineClear: () => true,
}));
jest.mock("@engine/pathfinding/path-hops-clear", () => ({
  isWalkmeshEdgeWalkClear: () => true,
}));
jest.mock("@engine/pathfinding/ComputedPath", () => {
  class ComputedPath {
    points: any[] = [];
    incomplete = false;
    realtime = false;
    timer = 0;
    dfsResume: any;
    smoothResume: any;
    smoothCornerResume: any;
    constructor(public owner?: any, public origin?: any, public destination?: any){}
    setOwner(owner: any){ this.owner = owner; }
    search(opts: any){ search(this, opts); return this; }
    static FromPointsList(points: any[]){
      const p = new ComputedPath();
      p.points = points;
      return p;
    }
  }
  return { ComputedPath };
});

import { AreaPath } from "@engine/module/area/AreaPath";
import { PathPoint } from "@engine/pathfinding/PathPoint";

function makeAreaPath(): AreaPath {
  const ap = new AreaPath({
    name: "test",
    getNearestWalkablePoint: (v: THREE.Vector3) => v.clone(),
  } as any);
  const a = PathPoint.FromVector3(new THREE.Vector3(1, 0, 0));
  const b = PathPoint.FromVector3(new THREE.Vector3(9, 0, 0));
  a.addConnection(b);
  ap.points = [a, b];
  return ap;
}

function linkCounts(ap: AreaPath){
  return ap.points.map((p) => p.connections.length);
}

const owner = { id: 42 } as any;
const origin = new THREE.Vector3(0, 0, 0);
const dest = new THREE.Vector3(10, 0, 0);

describe("AreaPath.traverseToPoint plan state", () => {
  beforeEach(() => {
    budget.exhausted = false;
    budget.take = 4;
    budget.remaining = 4;
    hasClearWalkLine.mockReset();
    hasClearWalkLine.mockReturnValue(false);
    search.mockReset();
  });

  it("does not leave endpoint links on PTH nodes when the search budget is spent", () => {
    const ap = makeAreaPath();
    budget.take = 0;
    const r = ap.traverseToPoint(owner, origin, dest);
    expect(r.incomplete).toBe(true);
    expect(linkCounts(ap)).toEqual([1, 1]);
    expect(search).not.toHaveBeenCalled();
  });

  it("does not leave endpoint links when the slice has no time left", () => {
    const ap = makeAreaPath();
    budget.remaining = 0;
    ap.traverseToPoint(owner, origin, dest);
    expect(linkCounts(ap)).toEqual([1, 1]);
  });

  it("removes endpoint links after a search, even one that throws", () => {
    const ap = makeAreaPath();
    search.mockImplementation((self) => {
      // Links are in place while the search runs.
      expect(ap.points[0].connections).toContain(self.origin);
      expect(ap.points[1].connections).toContain(self.destination);
      throw new Error("boom");
    });
    expect(() => ap.traverseToPoint(owner, origin, dest)).toThrow("boom");
    expect(linkCounts(ap)).toEqual([1, 1]);
  });

  it("runs the direct-line test when the pending resume is for other endpoints", () => {
    const ap = makeAreaPath();
    // First plot times out and leaves a resume for (origin → dest).
    search.mockImplementationOnce((self) => {
      self.incomplete = true;
      self.dfsResume = { startX: 0, startY: 0, endX: 10, endY: 0, transTable: {}, costBudget: 1 };
    });
    ap.traverseToPoint(owner, origin, dest);

    // Same endpoints: resume continues, direct line not re-tested.
    hasClearWalkLine.mockClear();
    ap.traverseToPoint(owner, origin, dest);
    expect(hasClearWalkLine).not.toHaveBeenCalled();

    // Re-seed the resume, then plot somewhere else that is in plain view.
    search.mockImplementationOnce((self) => {
      self.incomplete = true;
      self.dfsResume = { startX: 0, startY: 0, endX: 10, endY: 0, transTable: {}, costBudget: 1 };
    });
    ap.traverseToPoint(owner, origin, dest);
    hasClearWalkLine.mockClear();
    hasClearWalkLine.mockReturnValue(true);
    const other = new THREE.Vector3(10, 0.5, 0);
    const r = ap.traverseToPoint(owner, origin, other);
    expect(hasClearWalkLine).toHaveBeenCalledTimes(1);
    expect(r.points.length).toBe(2);
  });

  it("clearOwnerPlanState drops the pending resume", () => {
    const ap = makeAreaPath();
    search.mockImplementationOnce((self) => {
      self.incomplete = true;
      self.dfsResume = { startX: 0, startY: 0, endX: 10, endY: 0, transTable: {}, costBudget: 1 };
    });
    ap.traverseToPoint(owner, origin, dest);
    ap.clearOwnerPlanState(owner.id);

    hasClearWalkLine.mockClear();
    ap.traverseToPoint(owner, origin, dest);
    expect(hasClearWalkLine).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[search.mock.calls.length - 1][1].resume).toBeUndefined();
  });
});
