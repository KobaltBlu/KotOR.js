import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectModifyNumAttacks — retail OnApplyModifyNumAttacks @ 004dbd90.
 * Adds int[0] into combatRound.effectAttacks, clamp cumulative to [0, 2].
 *
 * @file EffectModifyNumAttacks.ts
 */
export class EffectModifyNumAttacks extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectModifyNumAttacks;
    // int[0] : nAttacks (create allows 0..5; live stack caps at 2)
  }

  onApply(){
    if(this.applied)
      return;

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;
    const round = creature.combatRound;
    if(!round) return;

    if(round.effectAttacks > 2){
      return;
    }

    const amount = this.getInt(0) || 0;
    round.effectAttacks = clampAttacks(round.effectAttacks + amount);
    super.onApply();
  }

  onRemove(){
    super.onRemove();
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;
    const round = creature.combatRound;
    if(!round) return;
    const amount = this.getInt(0) || 0;
    round.effectAttacks = clampAttacks(round.effectAttacks - amount);
  }
}

function clampAttacks(n: number): number {
  if(n < 0) return 0;
  if(n > 2) return 2;
  return n | 0;
}
