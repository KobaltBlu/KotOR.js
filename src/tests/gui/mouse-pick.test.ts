/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import { Vector3 } from "three";

jest.mock("@/loaders", () => ({ TextureLoader: { Load: jest.fn() } }));
jest.mock("@/controls/Mouse", () => ({
  Mouse: { x: 0, y: 0, MouseDown: false },
}));
jest.mock("@/utility/ApplicationProfile", () => ({
  ApplicationProfile: { GAME_KEY: "KOTOR" },
}));
jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: {
      getCurrentPlayer: () => undefined,
      party: [],
    },
  },
}));
jest.mock("@/three/odyssey/OdysseyObject3D", () => ({
  OdysseyObject3D: class {},
}));
jest.mock("@/combat/combat-engagement", () => ({
  getClientCombatMode: () => false,
}));
jest.mock("@/gui/guiMatrix", () => ({
  commitGuiTransform: () => {},
}));

import {
  CursorManager,
  MOUSE_PICK_RANGE_SQ,
} from "@/managers/CursorManager";

describe("getStickyMouseThresholdSq (engine GetStickyMouseThreshhold)", () => {
  it("returns (w/10)² + (h/10)²", () => {
    expect(CursorManager.getStickyMouseThresholdSq(800, 600)).toBe(80 * 80 + 60 * 60);
    expect(CursorManager.getStickyMouseThresholdSq(640, 480)).toBe(64 * 64 + 48 * 48);
  });
});

describe("screenDistanceSq", () => {
  it("computes squared pixel distance", () => {
    expect(CursorManager.screenDistanceSq(100, 200, 103, 204)).toBe(9 + 16);
  });
});

describe("passesMousePickGates (engine ProcessInput)", () => {
  const cam = new Vector3(0, -10, 5);
  const player = new Vector3(0, 0, 0);

  it("accepts objects near the player in front of the camera half-space", () => {
    expect(CursorManager.passesMousePickGates(player, cam, new Vector3(2, 2, 0))).toBe(true);
  });

  it("rejects objects beyond XY range 30", () => {
    expect(CursorManager.passesMousePickGates(player, cam, new Vector3(31, 0, 0))).toBe(false);
    expect(CursorManager.passesMousePickGates(player, cam, new Vector3(30, 0, 0))).toBe(true);
  });

  it("rejects objects on the opposite side of the camera from the player", () => {
    // Camera at y=-10 looking toward +Y; object behind camera at y=-20
    expect(CursorManager.passesMousePickGates(player, cam, new Vector3(0, -20, 0))).toBe(false);
  });

  it("uses MOUSE_PICK_RANGE_SQ by default", () => {
    expect(MOUSE_PICK_RANGE_SQ).toBe(900);
  });
});
