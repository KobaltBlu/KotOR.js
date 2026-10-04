import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";

/**
 * EffectFury — type 0x6F (ExecuteCommandEffectFury).
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
