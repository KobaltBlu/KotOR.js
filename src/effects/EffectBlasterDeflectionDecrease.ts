import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectBlasterDeflectionDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectBlasterDeflectionDecrease;

    //intList[0] : nChange
    //intList[1] : ???
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
