import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { ModuleObject } from "../module";

export class EffectDeath extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDeath;
    
    //intList[0] : isSpectacularDeath

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.setHP(-11);
    if(this.isSpeactacular()){
      //this.object.animState = ModuleCreatureAnimState.DEAD;
    }else{
      // this.object.animState = ModuleCreatureAnimState.DEAD;
    }
  }

  isSpeactacular(){
    return this.getInt(0);
  }

}

