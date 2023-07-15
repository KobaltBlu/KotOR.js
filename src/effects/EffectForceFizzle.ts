import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectForceFizzle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceFizzle;
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

