import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectMovementSpeedIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectMovementSpeedIncrease;
    
    //intList[0] : nPercentChange

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(!this.object) return;
    if(this.getInt(0) < 100){
      this.setInt(0, this.getInt(0) + 100);
    }

    this.object.updateMovementSpeed();
  }

  onRemove(){
    super.onRemove();

    if(!this.object) return;
    this.object.updateMovementSpeed();
  }

}

