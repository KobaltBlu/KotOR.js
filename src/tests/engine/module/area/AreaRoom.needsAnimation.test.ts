/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { AreaRoom } from "@engine/module/area/AreaRoom";
import { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";
import { AuroraAnimationFlag } from "@core/enums/animation/AuroraAnimationFlag";

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

  it("is true while a script-started room animation is running", () => {
    expect(
      AreaRoom.roomModelNeedsAnimation({
        animationManager: { runs: [{}] },
        animLoops: [],
        emitters: [],
        danglyMeshes: [],
        animDummyInstanceBatches: [],
      } as unknown as OdysseyModel3D)
    ).toBe(true);
  });
});

describe("AreaRoom.playScriptAnimation (PlayRoomAnimation)", () => {
  const makeRoom = (clipNames: string[]) => {
    const model = Object.create(OdysseyModel3D.prototype) as OdysseyModel3D;
    const playAnimation = jest.fn((clip: unknown) => ({ animation: clip }));
    (model as any).odysseyAnimationMap = new Map(clipNames.map((n) => [n, { name: n }]));
    (model as any).animationManager = { playAnimation };
    const room = Object.create(AreaRoom.prototype) as AreaRoom;
    room.model = model;
    return { room, playAnimation };
  };

  it("plays scriptloopNN as a looping overlay (retail flags: no fire-and-forget)", () => {
    const { room, playAnimation } = makeRoom(["scriptloop03"]);
    expect(room.playScriptAnimation(3)).toBe(true);
    expect(playAnimation).toHaveBeenCalledWith(
      { name: "scriptloop03" },
      AuroraAnimationFlag.OVERLAY_SLOT | AuroraAnimationFlag.LOOPING
    );
    const flags = playAnimation.mock.calls[0][1] as number;
    expect(flags & AuroraAnimationFlag.FIRE_FORGET).toBe(0);
  });

  it("formats two-digit and three-digit indices like retail", () => {
    const { room, playAnimation } = makeRoom(["scriptloop10", "scriptloop123"]);
    expect(room.playScriptAnimation(10)).toBe(true);
    expect(room.playScriptAnimation(123)).toBe(true);
    expect(playAnimation.mock.calls.map((c) => (c[0] as any).name)).toEqual([
      "scriptloop10",
      "scriptloop123",
    ]);
  });

  it("returns false when the clip does not exist", () => {
    const { room, playAnimation } = makeRoom(["scriptloop01"]);
    expect(room.playScriptAnimation(7)).toBe(false);
    expect(playAnimation).not.toHaveBeenCalled();
  });
});
