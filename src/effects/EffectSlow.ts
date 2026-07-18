import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { hasImmunityType, rebalanceHasteSlow } from "@/effects/haste-slow";

/**
 * EffectSlow — retail outer type 0x03; immunity type 9 rejects apply.
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

    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      // IMMUNITY_TYPE_SLOW = 9
      if(hasImmunityType(this.object as ModuleCreature, 9)){
        return;
      }
    }

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
