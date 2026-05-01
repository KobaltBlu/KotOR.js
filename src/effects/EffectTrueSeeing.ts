import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectTrueSeeing class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file EffectTrueSeeing.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectTrueSeeing extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTrueseeing;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
  }

}
