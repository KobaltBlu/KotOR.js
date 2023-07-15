import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectForceResisted extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceResisted;
    
    //objectList[0] : oTarget
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

