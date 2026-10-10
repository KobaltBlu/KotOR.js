import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import type { Creature } from "@engine/module/Creature";
import { isCreature } from "@engine/module/guards/isCreature";
import {
  VISION_FLAG_ULTRA_VISION,
  recomputeVisionFlags,
} from "@engine/effects/EffectBlindness";

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
    if(isCreature(this.object)){
      const creature = this.object as Creature;
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
    if(isCreature(this.object)){
      recomputeVisionFlags(this.object as Creature);
    }
  }
}
