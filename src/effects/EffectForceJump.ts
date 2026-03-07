import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectForceJump class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectForceJump.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectForceJump extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceJump;
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}