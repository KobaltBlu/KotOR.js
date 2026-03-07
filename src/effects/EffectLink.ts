import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectLink class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectLink.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectLink extends GameEffect {
  effect1: GameEffect;
  effect2: GameEffect;
  constructor(effect1: GameEffect = undefined, effect2: GameEffect = undefined){
    super();
    this.type = GameEffectType.EffectLink;
    this.effect1 = effect1;
    this.effect2 = effect2;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

