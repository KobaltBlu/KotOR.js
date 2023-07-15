import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectMissChance extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectMissChance;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

