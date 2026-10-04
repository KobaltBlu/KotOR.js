import { describe, expect, it } from "@jest/globals";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import { AnimationPlaybackMode } from "@core/enums/animation/AnimationPlaybackMode";
import { isAnimation2DAFlagSet } from "@engine/module/animation/animation2daFlag";
import { resolvePlaybackMode } from "@engine/module/animation/resolvePlaybackMode";
import {
  flourishAnimationRow,
  meleeCombatWieldAnimationRow,
  meleeWieldAnimationRow,
} from "@engine/module/animation/combat-wield-digit";

describe("flourish-wield-dispatch", () => {
  it("maps MELEE_WIELD weapon types to G*F1 overlay rows", () => {
    expect(meleeWieldAnimationRow(1)).toBe(378);
    expect(meleeWieldAnimationRow(2)).toBe(377);
    expect(meleeWieldAnimationRow(4)).toBe(376);
  });

  it("maps MELEE_COMBAT_WIELD / FLOURISH to the same g*w1 fireforget rows", () => {
    expect(meleeCombatWieldAnimationRow(1)).toBe(91);
    expect(meleeCombatWieldAnimationRow(2)).toBe(132);
    expect(meleeCombatWieldAnimationRow(3)).toBe(173);
    expect(meleeCombatWieldAnimationRow(4)).toBe(214);
    expect(flourishAnimationRow(1)).toBe(91);
    expect(flourishAnimationRow(2)).toBe(132);
    expect(flourishAnimationRow(3)).toBe(173);
    expect(flourishAnimationRow(4)).toBe(214);
    expect(meleeCombatWieldAnimationRow(3)).toBe(flourishAnimationRow(3));
    expect(meleeCombatWieldAnimationRow(4)).toBe(flourishAnimationRow(4));
  });
});

describe("isAnimation2DAFlagSet", () => {
  it("accepts boolean true, numeric 1, and string '1'", () => {
    expect(isAnimation2DAFlagSet(true)).toBe(true);
    expect(isAnimation2DAFlagSet(1)).toBe(true);
    expect(isAnimation2DAFlagSet("1")).toBe(true);
  });

  it("rejects false, 0, '0', undefined", () => {
    expect(isAnimation2DAFlagSet(false)).toBe(false);
    expect(isAnimation2DAFlagSet(0)).toBe(false);
    expect(isAnimation2DAFlagSet("0")).toBe(false);
    expect(isAnimation2DAFlagSet(undefined)).toBe(false);
  });

  it("regression: String(true)==='1' was the broken overlay gate", () => {
    expect(String(true) === "1").toBe(false);
    expect(isAnimation2DAFlagSet(true)).toBe(true);
  });
});

describe("flourish moving overlay routing", () => {
  const ROW_NAME: Record<number, { name: string; overlay: boolean }> = {
    378: { name: "G3F1", overlay: true },
    91: { name: "g1w1", overlay: false },
  };

  /** Mirrors ModuleCreature.isFlourishMoving (PC axes path). */
  function isFlourishMoving(host: {
    isPlayer?: boolean;
    isPM?: boolean;
    isPC?: boolean;
    speed: number;
    force: number;
    playerControl?: { axisForward: number; axisRight: number };
  }): boolean {
    const pc = host.playerControl;
    if(pc && (host.isPlayer || host.isPM || host.isPC)){
      return Math.abs(pc.axisForward) > 1e-4 || Math.abs(pc.axisRight) > 1e-4;
    }
    return host.speed > 0.01 || host.force > 0.01;
  }

  /** Mirrors updateAnimationState overlayOk gate. */
  function overlayOk(animation: { overlay?: unknown } | undefined): boolean {
    return !!animation && isAnimation2DAFlagSet(animation.overlay);
  }

  function routeFlourish(moving: boolean, weaponType: number){
    if(moving){
      const row = meleeWieldAnimationRow(weaponType);
      return {
        path: "overlay" as const,
        serverId: ModuleCreatureAnimState.MELEE_WIELD,
        row,
        name: ROW_NAME[row].name.toLowerCase(),
        overlay: ROW_NAME[row].overlay,
      };
    }
    const row = meleeCombatWieldAnimationRow(weaponType);
    return {
      path: "fireforget" as const,
      serverId: ModuleCreatureAnimState.MELEE_COMBAT_WIELD,
      row,
      name: ROW_NAME[row]?.name?.toLowerCase() || "g1w1",
      overlay: ROW_NAME[row]?.overlay ?? false,
      duration: 1.5,
    };
  }

  it("while stick held routes to MELEE_WIELD overlay G*F1 even if speed is 0", () => {
    const host = {
      isPlayer: true,
      speed: 0,
      force: 0,
      playerControl: { axisForward: 1, axisRight: 0 },
    };
    expect(isFlourishMoving(host)).toBe(true);
    const route = routeFlourish(true, 1);
    expect(route.path).toBe("overlay");
    expect(route.serverId).toBe(ModuleCreatureAnimState.MELEE_WIELD);
    expect(route.name).toBe("g3f1");
    expect(overlayOk({ overlay: route.overlay })).toBe(true);
    expect(route.serverId).not.toBe(ModuleCreatureAnimState.FLOURISH);
  });

  it("while stick released takes standing path even if still coasting in anim", () => {
    const host = {
      isPlayer: true,
      speed: 3,
      force: 0,
      playerControl: { axisForward: 0, axisRight: 0 },
    };
    expect(isFlourishMoving(host)).toBe(false);
    const route = routeFlourish(false, 1);
    expect(route.path).toBe("fireforget");
    expect(route.serverId).toBe(ModuleCreatureAnimState.MELEE_COMBAT_WIELD);
    expect(route.duration).toBe(1.5);
  });

  it("strafe axis alone counts as moving", () => {
    expect(
      isFlourishMoving({
        isPC: true,
        speed: 0,
        force: 0,
        playerControl: { axisForward: 0, axisRight: -0.5 },
      })
    ).toBe(true);
  });

  it("NPC without playerControl falls back to speed/force", () => {
    expect(isFlourishMoving({ speed: 2, force: 0 })).toBe(true);
    expect(isFlourishMoving({ speed: 0, force: 0 })).toBe(false);
  });

  it("boolean overlay on SWAnimation shape opens the playback gate", () => {
    expect(overlayOk({ overlay: true })).toBe(true);
    expect(overlayOk({ overlay: false })).toBe(false);
    expect(overlayOk(undefined)).toBe(false);
  });
});

describe("resolvePlaybackMode boolean overlay fallback", () => {
  it("returns OVERLAY for SWAnimation.overlay === true", () => {
    expect(resolvePlaybackMode(10000, { overlay: true } as any)).toBe(
      AnimationPlaybackMode.OVERLAY
    );
  });
});
