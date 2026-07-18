import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectDamageReduction class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamageReduction.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamageReduction extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageReduction;
    // intList[0] : nAmount
    // intList[1] : nDamagePower (bypass threshold)
    // intList[2] : nLimit (0 = infinite)
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    // Mitigated in combat/damage-mitigation when damage is applied
  }

}

