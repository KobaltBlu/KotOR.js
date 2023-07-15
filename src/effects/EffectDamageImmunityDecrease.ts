import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectDamageImmunityDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageImmunityDecrease;

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
