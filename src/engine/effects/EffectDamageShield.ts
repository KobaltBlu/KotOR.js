import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";

/**
 * EffectDamageShield — no dedicated OnApply in; resolved in ResolveDamageShields.
 * int[0] flat amount, int[1] DAMAGE_BONUS dice code, int[2] DAMAGE_TYPE_* flags.
 *
 * @file EffectDamageShield.ts
 */
export class EffectDamageShield extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageShield;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();
  }

  getFlatAmount(): number {
    return Math.max(0, Math.min(10000, this.getInt(0) || 0));
  }

  getDiceBonusCode(): number {
    return this.getInt(1) || 0;
  }

  getDamageTypeFlags(): number {
    return this.getInt(2) || 0;
  }
}
