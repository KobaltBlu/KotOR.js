import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectInvisibility class.
 *
 * effect apply queues perception refresh.
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
    if(isCreature(this.object)){
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
