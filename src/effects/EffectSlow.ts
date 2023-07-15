import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectSlow extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSlow;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

