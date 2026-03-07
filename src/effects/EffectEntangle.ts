import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectEntangle class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectEntangle.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectEntangle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectEntangle;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

