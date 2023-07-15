import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectDamageDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageDecrease;

    //intList[0] : nPenalty
    //intList[1] : DamageType
    //intList[2] : racialtypes.2da rowcount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
