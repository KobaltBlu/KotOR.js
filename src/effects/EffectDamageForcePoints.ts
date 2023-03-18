import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectDamageForcePoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageForcePoints;
    
    //intList[0] : damage amount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    this.object.subtractFP(this.getAmount());
  }

  getAmount(){
    return this.getInt(0);
  }

}
