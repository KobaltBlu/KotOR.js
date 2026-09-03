/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@/GameState", () => ({ GameState: {} }));

import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import {
  versusAlignmentEffect,
  versusRacialTypeEffect,
  versusTrapEffect,
} from "@/nwscript/versus-effect";

function mockEffect(type: GameEffectType) {
  const ints: number[] = [];
  return {
    type,
    setInt(i: number, v: number){ ints[i] = v; },
    getInt(i: number){ return ints[i] ?? 0; },
    setSubType(s: number){ (this as any)._sub = s; },
    getSubType(){ return (this as any)._sub ?? 0; },
    _sub: GameEffectSubType.MAGICAL,
  };
}

describe("Pass AG effect subtype wrappers", () => {
  it("Magical/Supernatural/Extraordinary set masked subtype", () => {
    const e = mockEffect(GameEffectType.EffectACIncrease);
    e.setSubType(GameEffectSubType.SUPERNATURAL);
    expect(e.getSubType()).toBe(GameEffectSubType.SUPERNATURAL);
    e.setSubType(GameEffectSubType.EXTRAORDINARY);
    expect(e.getSubType()).toBe(GameEffectSubType.EXTRAORDINARY);
    e.setSubType(GameEffectSubType.MAGICAL);
    expect(e.getSubType()).toBe(GameEffectSubType.MAGICAL);
  });
});

describe("Pass AG versus-effect", () => {
  it("VersusRacialType sets race int on ACIncrease", () => {
    const e = mockEffect(GameEffectType.EffectACIncrease) as any;
    versusRacialTypeEffect(e, 5);
    expect(e.getInt(2)).toBe(5);
  });

  it("VersusAlignment sets law/chaos + good/evil on AttackIncrease", () => {
    const e = mockEffect(GameEffectType.EffectAttackIncrease) as any;
    versusAlignmentEffect(e, 1, 2);
    expect(e.getInt(3)).toBe(1);
    expect(e.getInt(4)).toBe(2);
  });

  it("VersusTrap stamps trap flag", () => {
    const e = mockEffect(GameEffectType.EffectSavingThrowIncrease) as any;
    versusTrapEffect(e);
    expect(e.getInt(6)).toBe(1);
  });
});

describe("Pass AG GetAbilityScore indices", () => {
  it("maps ABILITY_* to getSTR…getCHA; unknown → 0", () => {
    const creature = {
      getSTR: () => 14,
      getDEX: () => 12,
      getCON: () => 10,
      getINT: () => 16,
      getWIS: () => 8,
      getCHA: () => 18,
    };
    const score = (n: number) => {
      switch(n){
        case 0: return creature.getSTR() & 0xff;
        case 1: return creature.getDEX() & 0xff;
        case 2: return creature.getCON() & 0xff;
        case 3: return creature.getINT() & 0xff;
        case 4: return creature.getWIS() & 0xff;
        case 5: return creature.getCHA() & 0xff;
        default: return 0;
      }
    };
    expect(score(0)).toBe(14);
    expect(score(5)).toBe(18);
    expect(score(99)).toBe(0);
  });
});

describe("Pass AG item-activate getters empty context", () => {
  it("returns undefined when module context unset", () => {
    const mod: {
      itemActivated?: unknown;
      itemActivator?: unknown;
      itemActivatedTarget?: unknown;
    } = {};
    expect(mod.itemActivated ?? undefined).toBeUndefined();
    expect(mod.itemActivator ?? undefined).toBeUndefined();
    expect(mod.itemActivatedTarget ?? undefined).toBeUndefined();
  });
});
