import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectResurrection extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectResurrection;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

