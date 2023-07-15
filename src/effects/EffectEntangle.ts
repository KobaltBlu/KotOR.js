import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectEntangle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectEntangle;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

