import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectConcealment extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectConcealment;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

