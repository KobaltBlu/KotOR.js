import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { VideoEffectManager } from "@/managers/VideoEffectManager";

/**
 * EffectForceSight — type 0x72 (NWScript EffectForceSight).
 * OnApply/OnRemove enable/disable force-sight video effect.
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
