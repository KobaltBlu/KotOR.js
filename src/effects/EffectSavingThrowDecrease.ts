import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectSavingThrowDecrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectSavingThrowDecrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectSavingThrowDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSavingThrowDecrease;
    
    //intList[0] : amount
    //intList[1] : SAVING_THROW_*
    //intList[2] : SAVING_THROW_TYPE_*
    //intList[3] : racialtypes.2da rowcount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

