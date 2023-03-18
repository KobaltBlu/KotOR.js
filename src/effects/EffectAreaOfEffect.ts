import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectAreaOfEffect extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAreaOfEffect;

    // https://nwnlexicon.com/index.php?title=EffectAreaOfEffect#Area_of_Effect_Effect
    // intList[0] : nAreaEffectId - vfx_persistent.2da
    // stringList[0] : sOnEnterScript
    // stringList[1] : sHeartbeatScript
    // stringList[2] : sOnExitScript
    // objectList[0] : aoeObject
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