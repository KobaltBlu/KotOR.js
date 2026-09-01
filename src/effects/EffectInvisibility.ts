import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectInvisibility class.
 *
 * Retail OnApplyInvisibility queues perception refresh.
 *
 * @file EffectInvisibility.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectInvisibility extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectInvisibility;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    // Force an immediate perception re-eval for nearby creatures
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      const self = this.object as ModuleCreature;
      self.perceptionTimer = 3;
      const area = self.area;
      if(area?.creatures){
        for(let i = 0; i < area.creatures.length; i++){
          area.creatures[i].perceptionTimer = 3;
        }
      }
    }
  }

}
