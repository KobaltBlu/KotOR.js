import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import { hasImmunityType, rebalanceHasteSlow } from "@engine/effects/haste-slow";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectSlow — outer type 0x03 (onApply / onRemove).
 * Immunity type 9 rejects onApply; otherwise net-balances against Haste.
 *
 * @file EffectSlow.ts
 */
export class EffectSlow extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSlow;
  }

  onApply(){
    if(this.applied)
      return;

    if(isCreature(this.object)){
      // IMMUNITY_TYPE_SLOW = 9
      if(hasImmunityType(this.object as ModuleCreature, 9)){
        return;
      }
    }

    super.onApply();
    if(isCreature(this.object)){
      rebalanceHasteSlow(this.object as ModuleCreature, this);
    }
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      rebalanceHasteSlow(this.object as ModuleCreature, this);
    }
  }
}
