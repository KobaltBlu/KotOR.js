import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { rebalanceHasteSlow } from "@/effects/haste-slow";
import { isCreature } from "@/module/guards/isCreature";

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
