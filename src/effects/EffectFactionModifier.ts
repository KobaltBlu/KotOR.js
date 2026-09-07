import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectFactionModifier — type 0x73 (ExecuteCommandEffectFactionModifier).
 * int[0] = faction modifier value.
 *
 * @file EffectFactionModifier.ts
 */
export class EffectFactionModifier extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectFactionModifier;
  }

  onApply(){
    if(this.applied) return;
    super.onApply();
  }
}
