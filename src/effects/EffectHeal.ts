import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectHeal extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectHeal;
    
    //intList[0] : heal amount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.addHP(this.getAmount());
  }

  getAmount(){
    return this.getInt(0);
  }

}

