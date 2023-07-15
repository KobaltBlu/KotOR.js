import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectDisease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDisease;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

