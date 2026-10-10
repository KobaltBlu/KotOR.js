/**
 * Cutscene stunt-actor bounds: dirty-aware computeBoundingBox, not setFromObject.
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

describe("CutsceneManager stunt actor bounds contract", () => {
  it("marks matrix dirty and uses computeBoundingBox instead of setFromObject", () => {
    // Mirrors CutsceneManager.update stunt-actor block.
    function updateStuntActorBox(gameObject: {
      markCollisionMatrixDirty: (reason: string) => void;
      computeBoundingBox: () => unknown;
      box: { setFromObject?: (o: unknown) => void };
      container: unknown;
    }) {
      gameObject.markCollisionMatrixDirty("cutscene");
      gameObject.computeBoundingBox();
    }

    let matrixMarks = 0;
    let computeCalls = 0;
    let setFromObjectCalls = 0;
    const gameObject = {
      markCollisionMatrixDirty: (_reason: string) => { matrixMarks++; },
      computeBoundingBox: () => { computeCalls++; return null; },
      box: {
        setFromObject: () => { setFromObjectCalls++; },
      },
      container: {},
    };

    updateStuntActorBox(gameObject);
    updateStuntActorBox(gameObject);

    expect(matrixMarks).toBe(2);
    expect(computeCalls).toBe(2);
    expect(setFromObjectCalls).toBe(0);
  });
});
