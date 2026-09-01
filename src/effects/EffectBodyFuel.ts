import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectBodyFuel — retail OnApplyBodyFuel / OnRemove.
 * Sets bodyFuel flag. While active:
 * - Force menu enable uses HP as resource (GetSelf/HostileForcePowers)
 * - EndCombatRound refills temporaryForce to max FP
 *
 * @file EffectBodyFuel.ts
 */
export class EffectBodyFuel extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectBodyFuel;
  }

  onApply(){
    if(this.applied) return;
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    super.onApply();
    (this.object as ModuleCreature).bodyFuel = true;
  }

  onRemove(){
    super.onRemove();
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)) return;
    const creature = this.object as ModuleCreature;
    const still = (creature.effects || []).some(
      (e) => e !== this && e?.type === GameEffectType.EffectBodyFuel
    );
    if(!still) creature.bodyFuel = false;
  }
}
