import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectMovementSpeedDecrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectMovementSpeedDecrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectMovementSpeedDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectMovementSpeedDecrease;
    
    //intList[0] : nPercentChange

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(!this.object) return;
    if(this.getInt(0) <= 99){
      this.object.updateMovementSpeed();
    }
  }

  onRemove(){
    super.onRemove();

    if(!this.object) return;
    this.object.updateMovementSpeed();
  }

}

