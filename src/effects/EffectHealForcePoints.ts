import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectHealForcePoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectHealForcePoints;
    
    //intList[0] : heal amount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    if(!this.object) return;
    this.object.addFP(this.getAmount());
  }

  getAmount(){
    return this.getInt(0);
  }

}

