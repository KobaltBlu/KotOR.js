import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectDamageShield class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamageShield.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamageShield extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageShield;

    //intList[0] : nDamageAmount
    //intList[1] : nRandomAmount (DAMAGE_BONUS_*)
    //intList[2] : nDamageType   (DAMAGE_TYPE_*)

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
