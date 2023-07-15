import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

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
    
    if(!this.object) return;
    this.object.addHP(this.getAmount());
  }

  getAmount(){
    return this.getInt(0);
  }

}

