import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

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

