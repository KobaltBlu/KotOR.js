import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectAreaOfEffect extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAreaOfEffect;

    // intList[0] : nAreaEffectId
    // stringList[0] : sOnEnterScript
    // stringList[1] : sHeartbeatScript
    // stringList[2] : sOnExitScript
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