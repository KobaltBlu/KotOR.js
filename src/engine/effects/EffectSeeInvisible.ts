import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import type { Creature } from "@engine/module/Creature";
import { isCreature } from "@engine/module/guards/isCreature";
import {
  VISION_FLAG_SEE_INVISIBLE,
  recomputeVisionFlags,
} from "@engine/effects/EffectBlindness";

/**
 * EffectSeeInvisible — onApply sets detect flag 0x01.
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
    if(isCreature(this.object)){
      const creature = this.object as Creature;
      creature.visionFlags = (creature.visionFlags || 0) | VISION_FLAG_SEE_INVISIBLE;
    }
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      recomputeVisionFlags(this.object as Creature);
    }
  }
}
