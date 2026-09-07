import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectForceDrain — effect apply.
 * Instant: subtract int[0] FP (clamped ≥ 0). Returns remove-after-apply.
 *
 * @file EffectForceDrain.ts
 */
export class EffectForceDrain extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceDrain;
    // intList[0] : FP to drain
  }

  onApply(){
    if(this.applied) return;
    super.onApply();
    if(!this.object) return;
    const amount = Math.max(0, this.getInt(0) || 0);
    if(amount > 0){
      this.object.subtractFP(amount);
    }
  }
}
