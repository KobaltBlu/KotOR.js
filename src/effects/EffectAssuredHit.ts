import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectAssuredHit extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAssuredHit;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
