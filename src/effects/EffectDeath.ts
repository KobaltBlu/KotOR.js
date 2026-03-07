import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";
// import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";

/**
 * EffectDeath class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDeath.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
    
    if(!this.object) return;
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

