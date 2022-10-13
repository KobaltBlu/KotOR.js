import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectTemporaryHitPoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTemporaryHitPoints;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.addHP(this.getInt(0), true);
  }

}

