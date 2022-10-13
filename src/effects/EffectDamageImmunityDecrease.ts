import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectDamageImmunityDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageImmunityDecrease;

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
