import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectForceResistanceDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceResistanceDecrease;
    
    //intList[0] : nAmount
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

