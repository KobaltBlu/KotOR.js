import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectDamageResistance class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamageResistance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamageResistance extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageResistance;
    
    //intList[0] : nDamageType
    //intList[1] : nDamageLimit
    //intList[2] : nDamageLimit
    //intList[3] : nVulnerabilityFlags ???

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

