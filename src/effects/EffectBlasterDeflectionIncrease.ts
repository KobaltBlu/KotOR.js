import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectBlasterDeflectionIncrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectBlasterDeflectionIncrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectBlasterDeflectionIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectBlasterDeflectionIncrease;

    //intList[0] : nChange
    //intList[1] : ???

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
