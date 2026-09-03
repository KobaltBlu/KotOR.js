import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectFury — retail type 0x6F (ExecuteCommandEffectFury).
 *
 * @file EffectFury.ts
 */
export class EffectFury extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectFury;
  }

  onApply(){
    if(this.applied) return;
    super.onApply();
  }
}
