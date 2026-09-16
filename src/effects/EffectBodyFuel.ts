import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectBodyFuel — onApply / onRemove.
 * Sets bodyFuel flag. While active:
 * - Force menu enable uses HP as resource (GetSelf/HostileForcePowers)
 * - end combat round refills temporaryForce to max FP
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
    if(!isCreature(this.object)){
      return;
    }
    super.onApply();
    (this.object as ModuleCreature).bodyFuel = true;
  }

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)) return;
    const creature = this.object as ModuleCreature;
    const still = (creature.effects || []).some(
      (e) => e !== this && e?.type === GameEffectType.EffectBodyFuel
    );
    if(!still) creature.bodyFuel = false;
  }
}
