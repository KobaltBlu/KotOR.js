import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectACIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectACIncrease;

    //intList[0] : Modify Type
    //intList[1] : Amount
    //intList[2] : racialtypes.2da rowcount
    //intList[5] : Damage Type

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
