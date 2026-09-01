import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { rebalanceHasteSlow } from "@/effects/haste-slow";

/**
 * EffectHaste — retail outer type 0x01; net-balance via OnApplyHasteOrSlow.
 * Does not grant extra attacks per round (retail CalculateOnHandAttacks ignores haste).
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
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      rebalanceHasteSlow(this.object as ModuleCreature, this);
    }
  }

  onRemove(){
    super.onRemove();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      rebalanceHasteSlow(this.object as ModuleCreature, this);
    }
  }
}
