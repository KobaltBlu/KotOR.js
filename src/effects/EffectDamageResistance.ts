import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";

export class EffectDamageResistance extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageResistance;
    
    //intList[0] : nDamageType
    //intList[1] : nDamageLimit
    //intList[2] : nDamageLimit
    //intList[3] : nVulnerabilityFlags ???

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

