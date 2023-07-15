import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

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

