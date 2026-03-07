import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectSlow class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectSlow.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectSlow extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSlow;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

