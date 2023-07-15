import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectAttackDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAttackDecrease;

    //intList[0] : nPenalty
    //intList[1] : nDamageType

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
