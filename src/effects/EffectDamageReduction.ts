import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectDamageReduction class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamageReduction.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamageReduction extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageReduction;

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

