import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectImmunity extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectImmunity;
    
    //intList[0] : immunityType

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

