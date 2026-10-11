/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { AreaRoom } from "@engine/module/area/AreaRoom";
import type { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";

describe("AreaRoom.roomModelNeedsAnimation", () => {
  it("is false for empty static room models", () => {
    const model = {
      animLoops: [],
      emitters: [],
      danglyMeshes: [],
      animDummyInstanceBatches: [],
    } as unknown as OdysseyModel3D;
    expect(AreaRoom.roomModelNeedsAnimation(model)).toBe(false);
  });

  it("is true when any dynamic content exists", () => {
    expect(
      AreaRoom.roomModelNeedsAnimation({
        animLoops: [{}],
        emitters: [],
        danglyMeshes: [],
        animDummyInstanceBatches: [],
      } as unknown as OdysseyModel3D)
    ).toBe(true);
    expect(
      AreaRoom.roomModelNeedsAnimation({
        animLoops: [],
        emitters: [{}],
        danglyMeshes: [],
        animDummyInstanceBatches: [],
      } as unknown as OdysseyModel3D)
    ).toBe(true);
    expect(
      AreaRoom.roomModelNeedsAnimation({
        animLoops: [],
        emitters: [],
        danglyMeshes: [{}],
        animDummyInstanceBatches: [],
      } as unknown as OdysseyModel3D)
    ).toBe(true);
  });
});
