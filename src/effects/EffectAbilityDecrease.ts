import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectAbilityDecrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectAbilityDecrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectAbilityDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAbilityDecrease;

    //intList[0] : nAbility
    //intList[1] : nPenalty

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
