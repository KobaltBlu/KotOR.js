import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectTemporaryHitPoints class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectTemporaryHitPoints.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectTemporaryHitPoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTemporaryHitPoints;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    if(!this.object) return;
    this.object.addHP(this.getInt(0), true);
  }

}

