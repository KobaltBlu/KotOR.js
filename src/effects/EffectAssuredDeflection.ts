import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectAssuredDeflection extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAssuredDeflection;

    // intList[0] : nReturnDamage
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