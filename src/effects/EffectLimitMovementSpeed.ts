import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectLimitMovementSpeed — retail slow child sets run-limit flag (0x8E8).
 *
 * @file EffectLimitMovementSpeed.ts
 */
export class EffectLimitMovementSpeed extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectLimitMovementSpeed;
    // int[0] : unused / mode
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      (this.object as ModuleCreature).limitMovementSpeed = true;
    }
  }

  onRemove(){
    super.onRemove();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      const creature = this.object as ModuleCreature;
      const still = (creature.effects || []).some(
        e => e && e !== this && e.type === GameEffectType.EffectLimitMovementSpeed
      );
      if(!still) creature.limitMovementSpeed = false;
    }
  }
}
