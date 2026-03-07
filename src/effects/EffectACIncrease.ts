import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectACIncrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectACIncrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectACIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectACIncrease;

    //intList[0] : Modify Type
    //intList[1] : Amount
    //intList[2] : racialtypes.2da rowcount
    //intList[5] : Damage Type

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
