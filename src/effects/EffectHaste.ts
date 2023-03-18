import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectHaste extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectHaste;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
  }

}

