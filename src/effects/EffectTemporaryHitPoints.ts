import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectTemporaryHitPoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTemporaryHitPoints;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    if(!this.object) return;
    this.object.addHP(this.getInt(0), true);
  }

}

