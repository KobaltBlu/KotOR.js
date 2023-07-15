import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectForceResistanceInecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceResistanceIncrease;
    
    //intList[0] : nAmount
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
