import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";

/**
 * EffectAreaOfEffect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectAreaOfEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
  }

}