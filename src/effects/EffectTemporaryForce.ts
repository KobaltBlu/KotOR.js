import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectTemporaryForce extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTemporaryForce;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    this.object.addFP(this.getInt(0), true);
  }

}

