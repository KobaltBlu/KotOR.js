import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectFPRegenModifier — retail type 0x70 (ExecuteCommandEffectFPRegenModifier).
 * int[0] = FP regen modifier amount.
 *
 * @file EffectFPRegenModifier.ts
 */
export class EffectFPRegenModifier extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectFPRegenModifier;
  }

  onApply(){
    if(this.applied) return;
    super.onApply();
  }
}
