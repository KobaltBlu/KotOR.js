import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectLimitMovementSpeed — slow child sets run-limit flag (0x8E8).
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
    if(isCreature(this.object)){
      (this.object as ModuleCreature).limitMovementSpeed = true;
    }
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      const creature = this.object as ModuleCreature;
      const still = (creature.effects || []).some(
        e => e && e !== this && e.type === GameEffectType.EffectLimitMovementSpeed
      );
      if(!still) creature.limitMovementSpeed = false;
    }
  }
}
