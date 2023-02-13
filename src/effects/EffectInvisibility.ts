import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectInvisibility extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectInvisibility;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

