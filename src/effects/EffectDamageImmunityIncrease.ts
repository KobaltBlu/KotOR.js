import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectDamageImmunityIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageImmunityIncrease;

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.object instanceof ModuleObject){
      //
    }
  }

}
