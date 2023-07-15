import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectFeat extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectBonusFeat;
    
    //intList[0] : feat.2da id
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

