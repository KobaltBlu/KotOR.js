import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectVPRegenModifier — type 0x71 (ExecuteCommandEffectVPRegenModifier).
 * int[0] = vitality/HP regen modifier amount.
 *
 * @file EffectVPRegenModifier.ts
 */
export class EffectVPRegenModifier extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectVPRegenModifier;
  }

  onApply(){
    if(this.applied) return;
    super.onApply();
  }
}
