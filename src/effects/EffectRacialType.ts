import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectRacialType extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectRacialType;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

