import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectSavingThrowDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSavingThrowDecrease;
    
    //intList[0] : amount
    //intList[1] : SAVING_THROW_*
    //intList[2] : SAVING_THROW_TYPE_*
    //intList[3] : racialtypes.2da rowcount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

