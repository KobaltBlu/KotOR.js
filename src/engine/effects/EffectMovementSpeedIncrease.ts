import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { normalizeSpeedIncreasePercent } from "@engine/pathfinding/locomotion";

/**
 * EffectMovementSpeedIncrease — NWScript / absolute speed percent.
 * n < 100 → n+100 (50 → 150%); n ≥ 100 used directly (200 → 2× before clamp).
 *
 * @file EffectMovementSpeedIncrease.ts
 */
export class EffectMovementSpeedIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectMovementSpeedIncrease;
    // intList[0] : absolute speed percent after normalize
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!this.object) return;
    this.setInt(0, normalizeSpeedIncreasePercent(this.getInt(0)));
    this.object.updateMovementSpeed();
  }

  onRemove(){
    super.onRemove();
    if(!this.object) return;
    this.object.updateMovementSpeed();
  }
}

