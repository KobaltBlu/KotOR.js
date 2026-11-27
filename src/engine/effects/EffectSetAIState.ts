import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { isCreature } from "@engine/module/guards/isCreature";
import { applyAIStateMask, recomputeAIStateMask } from "@engine/module/creature/ai-state";

/**
 * EffectSetAIState — type 0x17.
 * int[0] : AI-state mask ANDed into the creature's mask while the effect lasts.
 *
 * @file EffectSetAIState.ts
 */
export class EffectSetAIState extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSetAIState;
  }

  onApply(){
    if(this.applied)
      return;
    if(!isCreature(this.object))
      return;
    super.onApply();
    applyAIStateMask(this.object as any, this.getInt(0));
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      recomputeAIStateMask(this.object as any, this);
    }
  }
}
