import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";
import {
  VISION_FLAG_SEE_INVISIBLE,
  recomputeVisionFlags,
} from "@/effects/EffectBlindness";

/**
 * EffectSeeInvisible — retail OnApplySeeInvisible @ 004dcd00 sets detect flag 0x01.
 *
 * @file EffectSeeInvisible.ts
 */
export class EffectSeeInvisible extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSeeInvisible;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      const creature = this.object as ModuleCreature;
      creature.visionFlags = (creature.visionFlags || 0) | VISION_FLAG_SEE_INVISIBLE;
    }
  }

  onRemove(){
    super.onRemove();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      recomputeVisionFlags(this.object as ModuleCreature);
    }
  }
}
