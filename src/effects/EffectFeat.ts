import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectFeat class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectFeat.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectFeat extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectBonusFeat;
    
    //intList[0] : feat.2da id
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

