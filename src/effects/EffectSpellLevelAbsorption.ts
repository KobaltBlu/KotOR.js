import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectSpellLevelAbsorption — create-only.
 * Retail DoSpellLevelAbsorption @ 004d13a0 is a stub (always returns -1).
 * Ints match ExecuteCommandEffectSpellLevelAbsorption @ 00533fa0:
 *   int[0] max spell level, int[1] levels, int[2] school, int[3] unlimited flag.
 *
 * @file EffectSpellLevelAbsorption.ts
 */
export class EffectSpellLevelAbsorption extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSpellLevelAbsorption;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();
  }
}
