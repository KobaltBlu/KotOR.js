import { describe, expect, it } from "@jest/globals";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import {
  flourishAnimationRow,
  meleeCombatWieldAnimationRow,
  meleeWieldAnimationRow,
} from "@/module/animation/combat-wield-digit";

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

describe("flourish moving overlay routing (smoke)", () => {
  const ROW_NAME: Record<number, { name: string; overlay: string }> = {
    378: { name: "G3F1", overlay: "1" },
    91: { name: "g1w1", overlay: "0" },
  };

  function isFlourishMoving(host: {
    speed: number;
    force: number;
    animationState: { index: number };
  }): boolean {
    if(host.speed > 0.01 || host.force > 0.01){
      return true;
    }
    const idx = host.animationState?.index;
    return (
      idx === ModuleCreatureAnimState.WALKING ||
      idx === ModuleCreatureAnimState.RUNNING ||
      idx === ModuleCreatureAnimState.WALKING_BACK
    );
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
      overlay: ROW_NAME[row]?.overlay || "0",
    };
  }

  it("while moving routes to MELEE_WIELD overlay G*F1, not FLOURISH base", () => {
    const host = {
      speed: 0,
      force: 0,
      animationState: { index: ModuleCreatureAnimState.RUNNING },
    };
    expect(isFlourishMoving(host)).toBe(true);
    const route = routeFlourish(true, 1);
    expect(route.path).toBe("overlay");
    expect(route.serverId).toBe(ModuleCreatureAnimState.MELEE_WIELD);
    expect(route.name).toBe("g3f1");
    expect(route.overlay).toBe("1");
    expect(route.serverId).not.toBe(ModuleCreatureAnimState.FLOURISH);
  });

  it("while standing routes to MELEE_COMBAT_WIELD fireforget", () => {
    const host = {
      speed: 0,
      force: 0,
      animationState: { index: ModuleCreatureAnimState.PAUSE },
    };
    expect(isFlourishMoving(host)).toBe(false);
    const route = routeFlourish(false, 1);
    expect(route.path).toBe("fireforget");
    expect(route.serverId).toBe(ModuleCreatureAnimState.MELEE_COMBAT_WIELD);
  });
});
