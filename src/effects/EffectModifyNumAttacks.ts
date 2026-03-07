import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectModifyNumAttacks class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectModifyNumAttacks.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectModifyNumAttacks extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectModifyNumAttacks;

    //intList[0] : nAttacks (max 5)

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
