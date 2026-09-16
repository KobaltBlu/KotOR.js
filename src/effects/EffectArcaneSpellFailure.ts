import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectArcaneSpellFailure — onApply.
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
    if(!isCreature(this.object)){
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
    if(!isCreature(this.object)) return;
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
