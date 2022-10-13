import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

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

