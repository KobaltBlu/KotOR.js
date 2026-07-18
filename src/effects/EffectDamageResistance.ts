import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectDamageResistance class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamageResistance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamageResistance extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageResistance;
    
    // intList[0] : nDamageType flags (DAMAGE_TYPE_*)
    // intList[1] : nAmount absorbed per hit
    // intList[2] : nLimit total pool (0 = infinite)
    // intList[3] : vulnerability / double-cost flags (retail)

  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    // Mitigated in combat/damage-mitigation when damage is applied
  }

}

