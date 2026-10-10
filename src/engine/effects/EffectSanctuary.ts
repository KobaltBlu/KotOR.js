import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import type { Creature } from "@engine/module/Creature";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectSanctuary — onApply.
 * int[4] = Will DC. Hostile observers must fail Will to see the target.
 * Full vis-node cache is approximated via Creature.isInvisibleToObserver.
 *
 * @file EffectSanctuary.ts
 */
export class EffectSanctuary extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSanctuary;
    // intList[4] : Will DC 
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(isCreature(this.object)){
      const self = this.object as Creature;
      self.perceptionTimer = 3;
      const area = self.area;
      if(area?.creatures){
        for(let i = 0; i < area.creatures.length; i++){
          area.creatures[i].perceptionTimer = 3;
        }
      }
    }
  }

  getWillDC(): number {
    return this.getInt(4) || 0;
  }
}
