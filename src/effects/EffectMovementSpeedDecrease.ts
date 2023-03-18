import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

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
    
    if(this.getInt(0) <= 99){
      if(this.object)
        this.object.updateMovementSpeed();
    }
  }

  onRemove(){
    super.onRemove();
    if(this.object)
      this.object.updateMovementSpeed();
  }

}

