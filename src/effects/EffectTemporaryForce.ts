import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectTemporaryForce extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTemporaryForce;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(!this.object) return;
    this.object.addFP(this.getInt(0), true);
  }

}

