import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectAbilityDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAbilityDecrease;

    //intList[0] : nAbility
    //intList[1] : nPenalty

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
