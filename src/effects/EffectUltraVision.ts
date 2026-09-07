import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";
import {
  VISION_FLAG_ULTRA_VISION,
  recomputeVisionFlags,
} from "@/effects/EffectBlindness";

/**
 * EffectUltraVision — sets vision flag 0x02; pierces darkness-blind.
 *
 * @file EffectUltraVision.ts
 */
export class EffectUltraVision extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectUltraVision;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      const creature = this.object as ModuleCreature;
      creature.visionFlags = (creature.visionFlags || 0) | VISION_FLAG_ULTRA_VISION;
      // Strip darkness-linked miss chance (MissChance int[1]==1)
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
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      recomputeVisionFlags(this.object as ModuleCreature);
    }
  }
}
