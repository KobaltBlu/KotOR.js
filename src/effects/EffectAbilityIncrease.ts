import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectAbilityIncrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectAbilityIncrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectAbilityIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAbilityIncrease;

    //intList[0] : nAbility
    //intList[1] : nAmount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
