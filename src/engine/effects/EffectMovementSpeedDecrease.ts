import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";

/**
 * EffectMovementSpeedDecrease — NWScript nPercentChange 1–99.
 * ≥100 deletes (no apply); negative would increase (treated as no-op here).
 *
 * @file EffectMovementSpeedDecrease.ts
 */
export class EffectMovementSpeedDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectMovementSpeedDecrease;
    // intList[0] : percent reduction (1–99)
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!this.object) return;
    const pct = this.getInt(0) | 0;
    // : n >= 100 → effect deleted / ignored
    if(pct < 1 || pct >= 100) return;
    this.object.updateMovementSpeed();
  }

  onRemove(){
    super.onRemove();
    if(!this.object) return;
    this.object.updateMovementSpeed();
  }
}

