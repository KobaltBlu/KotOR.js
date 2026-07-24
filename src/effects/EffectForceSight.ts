import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { VideoEffectManager } from "@/managers/VideoEffectManager";

/**
 * EffectForceSight — retail type 0x72 (ExecuteCommandEffectForceSight @ K2 00789df0).
 * OnApply/OnRemove → AurEnableForceSight / AurDisableForceSight.
 *
 * @file EffectForceSight.ts
 */
export class EffectForceSight extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceSight;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();
    VideoEffectManager.SetForceSight(true);
  }

  onRemove(){
    super.onRemove();
    VideoEffectManager.SetForceSight(false);
  }
}
