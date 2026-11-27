import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";

/**
 * EffectForceBody — type 0x6E (TSL).
 * int[0] = level (0 Force Body, 1 Improved, 2 Master). Apply / remove do
 * nothing; the Force-point spend reads it (see getForceBodyCostSplit).
 *
 * @file EffectForceBody.ts
 */
export class EffectForceBody extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceBody;
  }

  onApply(){
    if(this.applied) return;
    super.onApply();
  }
}

/**
 * Force Body cost split for a power costing `cost` Force points.
 * Levels 0 / 1 / 2 pay 50 / 40 / 30 % of the cost in Force points, and the
 * same amount in vitality when temporary Force points cannot cover it.
 * Without Force Body (level -1) the full cost is Force points only.
 */
export function getForceBodyCostSplit(level: number, cost: number): { fp: number; hp: number } {
  if(level < 0) return { fp: cost, hp: 0 };
  let pct = 0;
  switch(level){
    case 0: pct = 50; break;
    case 1: pct = 40; break;
    case 2: pct = 30; break;
  }
  const share = Math.trunc((pct * cost) / 100);
  return { fp: share, hp: share };
}
