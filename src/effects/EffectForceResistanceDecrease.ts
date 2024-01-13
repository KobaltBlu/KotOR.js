import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectForceResistanceDecrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectForceResistanceDecrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectForceResistanceDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceResistanceDecrease;
    
    //intList[0] : nAmount
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

