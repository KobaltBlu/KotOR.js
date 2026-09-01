import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectArcaneSpellFailure — retail OnApplyArcaneSpellFailure.
 * int[0] = percent chance to fail Force/spell cast.
 *
 * @file EffectArcaneSpellFailure.ts
 */
export class EffectArcaneSpellFailure extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectArcaneSpellFailure;
  }

  onApply(){
    if(this.applied) return;
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    super.onApply();
    const creature = this.object as ModuleCreature;
    creature.arcaneSpellFailure = Math.max(
      creature.arcaneSpellFailure || 0,
      this.getInt(0) || 0
    );
  }

  onRemove(){
    super.onRemove();
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)) return;
    const creature = this.object as ModuleCreature;
    let max = 0;
    for(let i = 0; i < (creature.effects || []).length; i++){
      const e = creature.effects[i];
      if(e !== this && e?.type === GameEffectType.EffectArcaneSpellFailure){
        max = Math.max(max, e.getInt(0) || 0);
      }
    }
    creature.arcaneSpellFailure = max;
  }
}
