import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";
import {
  VISION_FLAG_TRUE_SEEING,
  recomputeVisionFlags,
} from "@/effects/EffectBlindness";

/**
 * EffectTrueSeeing — onApply sets detect flag 0x04.
 * Strips darkness-blind MissChance children (int[1]==1).
 *
 * @file EffectTrueSeeing.ts
 */
export class EffectTrueSeeing extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTrueseeing;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(isCreature(this.object)){
      const creature = this.object as ModuleCreature;
      creature.visionFlags = (creature.visionFlags || 0) | VISION_FLAG_TRUE_SEEING;
      const effects = creature.effects ? creature.effects.slice() : [];
      for(let i = 0; i < effects.length; i++){
        const e = effects[i];
        if(e?.type === GameEffectType.EffectMissChance && e.getInt(1) === 1){
          creature.removeEffect(e);
        }
      }
    }
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      recomputeVisionFlags(this.object as ModuleCreature);
    }
  }
}
