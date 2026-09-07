import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";

/**
 * EffectSpellLevelAbsorption — create-only.
 * DoSpellLevelAbsorption is a stub (always returns -1).
 * Int layout matches NWScript EffectSpellLevelAbsorption:
 * int[0] max spell level, int[1] levels, int[2] school, int[3] unlimited flag.
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
