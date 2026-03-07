import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectDamageImmunityDecrease class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamageImmunityDecrease.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamageImmunityDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageImmunityDecrease;

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}
