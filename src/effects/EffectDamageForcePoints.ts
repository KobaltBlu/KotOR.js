import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectDamageForcePoints class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamageForcePoints.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamageForcePoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageForcePoints;
    
    //intList[0] : damage amount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    if(!this.object) return;
    this.object.subtractFP(this.getAmount());
  }

  getAmount(){
    return this.getInt(0);
  }

}
