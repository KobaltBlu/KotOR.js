/**
 * @jest-environment node
 *
 * Placeable OnDamaged / OnAttacked contract after polymorphism move out of
 * ModuleObject. Does not import ModulePlaceable (window-dependent import graph);
 * mirrors the override bodies and asserts peer broadcast + script slot selection.
 */
import { describe, expect, it, jest } from "@jest/globals";
import { CombatActionType } from "@/enums";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { isCreature } from "@/module/guards/isCreature";
import type { ModuleCreature } from "@/module/ModuleCreature";

/** Mirrors ModulePlaceable.onDamaged after the ModuleObject branch move. */
function placeableOnDamaged(self: {
  isDead: () => boolean;
  combatData: { lastDamager?: unknown; lastAttacker?: unknown };
  scripts: Record<string, { run: (o: unknown) => void } | undefined>;
}){
  if(self.isDead())
    return true;

  const damager = self.combatData.lastDamager ?? self.combatData.lastAttacker;
  if(isCreature(damager as any)){
    (damager as ModuleCreature).broadcastCombatStateToParty();
  }

  const onDamaged = self.scripts[ModuleObjectScript.PlaceableOnDamaged];
  if(onDamaged){
    onDamaged.run(self);
  }
}

/** Mirrors ModulePlaceable.onAttacked after the ModuleObject branch move. */
function placeableOnAttacked(
  self: {
    combatData: { lastAttacker?: unknown };
    scripts: Record<string, { run: (o: unknown) => void } | undefined>;
  },
  attackType: CombatActionType,
){
  const attacker = self.combatData.lastAttacker;
  if(isCreature(attacker as any)){
    const atk = attacker as ModuleCreature;
    atk.broadcastCombatStateToParty();
    atk.removeCombatInvisibilityEffects();
  }
  const isSpell = attackType == CombatActionType.CAST_SPELL || attackType == CombatActionType.ITEM_CAST_SPELL;
  const onAttacked = self.scripts[
    isSpell ? ModuleObjectScript.PlaceableOnSpellCastAt : ModuleObjectScript.PlaceableOnMeleeAttacked
  ];
  if(onAttacked){
    onAttacked.run(self);
  }
}

function makeCreaturePeer(){
  return {
    objectType: ModuleObjectType.ModuleObject | ModuleObjectType.ModuleCreature,
    broadcastCombatStateToParty: jest.fn(),
    removeCombatInvisibilityEffects: jest.fn(),
  };
}

describe("placeable script events (polymorphic contract)", () => {
  it("onDamaged broadcasts via creature damager and runs PlaceableOnDamaged", () => {
    const damager = makeCreaturePeer();
    const run = jest.fn();
    const placeable = {
      isDead: () => false,
      combatData: { lastDamager: damager },
      scripts: {
        [ModuleObjectScript.PlaceableOnDamaged]: { run },
      },
    };

    placeableOnDamaged(placeable);

    expect(damager.broadcastCombatStateToParty).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(placeable);
  });

  it("onDamaged early-outs when dead without broadcasting or running script", () => {
    const damager = makeCreaturePeer();
    const run = jest.fn();
    const placeable = {
      isDead: () => true,
      combatData: { lastDamager: damager },
      scripts: {
        [ModuleObjectScript.PlaceableOnDamaged]: { run },
      },
    };

    expect(placeableOnDamaged(placeable)).toBe(true);
    expect(damager.broadcastCombatStateToParty).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("onAttacked melee uses PlaceableOnMeleeAttacked and strips invis", () => {
    const attacker = makeCreaturePeer();
    const meleeRun = jest.fn();
    const spellRun = jest.fn();
    const placeable = {
      combatData: { lastAttacker: attacker },
      scripts: {
        [ModuleObjectScript.PlaceableOnMeleeAttacked]: { run: meleeRun },
        [ModuleObjectScript.PlaceableOnSpellCastAt]: { run: spellRun },
      },
    };

    placeableOnAttacked(placeable, CombatActionType.ATTACK);

    expect(attacker.broadcastCombatStateToParty).toHaveBeenCalledTimes(1);
    expect(attacker.removeCombatInvisibilityEffects).toHaveBeenCalledTimes(1);
    expect(meleeRun).toHaveBeenCalledWith(placeable);
    expect(spellRun).not.toHaveBeenCalled();
  });

  it("onAttacked spell uses PlaceableOnSpellCastAt", () => {
    const attacker = makeCreaturePeer();
    const meleeRun = jest.fn();
    const spellRun = jest.fn();
    const placeable = {
      combatData: { lastAttacker: attacker },
      scripts: {
        [ModuleObjectScript.PlaceableOnMeleeAttacked]: { run: meleeRun },
        [ModuleObjectScript.PlaceableOnSpellCastAt]: { run: spellRun },
      },
    };

    placeableOnAttacked(placeable, CombatActionType.CAST_SPELL);

    expect(spellRun).toHaveBeenCalledWith(placeable);
    expect(meleeRun).not.toHaveBeenCalled();
  });
});
