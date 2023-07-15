import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectDamageReduction extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageReduction;

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

