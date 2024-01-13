import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectHealForcePoints class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectHealForcePoints.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectHealForcePoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectHealForcePoints;
    
    //intList[0] : heal amount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    if(!this.object) return;
    this.object.addFP(this.getAmount());
  }

  getAmount(){
    return this.getInt(0);
  }

}

