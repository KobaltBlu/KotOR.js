import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import type { Creature } from "@engine/module/Creature";
import { rebalanceHasteSlow } from "@engine/effects/haste-slow";
import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectHaste — outer type 0x01 (onApply / onRemove).
 * Net-balances against Slow; does not grant extra attacks per round
 * (CalculateOnHandAttacks ignores haste).
 *
 * @file EffectHaste.ts
 */
export class EffectHaste extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectHaste;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();
    if(isCreature(this.object)){
      rebalanceHasteSlow(this.object as Creature, this);
    }
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      rebalanceHasteSlow(this.object as Creature, this);
    }
  }
}
