import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectForceJump extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceJump;
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}