import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectHitPointChangeWhenDying — OnApply / OnRemove.
 *
 * Instant + |float0| ≥ 0.1 → temporary lasting |6 / float0| seconds.
 * On expiry: ±1 HP; negative also applies blood VFX (BLOODCOLR).
 * K1 `GetPlayerIsDying` is stubbed to always-false, so the engine does **not**
 * re-chain this effect (scripts may re-apply via OnPlayerDying).
 *
 * @file EffectHitPointChangeWhenDying.ts
 */
export class EffectHitPointChangeWhenDying extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectHitPointChangeWhenDying;
    // floatList[0] : HP change rate (per 6s window)
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;
    // PC only (creature_stats->is_pc)
    if(!creature.isPC){
      return;
    }

    const rate = this.getFloat(0);
    if(!rate){
      return;
    }

    // Instant apply with |rate| ≥ 0.1: become temporary |6/rate|
    if(this.getDurationType() === GameEffectDurationType.INSTANT){
      if(Math.abs(rate) < 0.1){
        return;
      }
      const period = Math.abs(6.0 / rate);
      this.setDurationType(GameEffectDurationType.TEMPORARY);
      this.setDuration(period);
      const future = GameState.module.timeManager.getFutureTimeFromSeconds(period);
      this.setExpireDay(future.pauseDay);
      this.setExpireTime(future.pauseTime);
    }

    // Pass AL — OnPlayerDying module context (GetLastPlayerDying)
    GameState.module?.notifyPlayerDying?.(creature);

    super.onApply();
  }

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;
    if(!creature.isPC){
      return;
    }

    const rate = this.getFloat(0);
    if(rate > 0){
      creature.addHP(1);
    }else if(rate < 0){
      creature.addHP(-1);
      this.applyBloodVfx(creature);
    }

    // K1 GetPlayerIsDying always 0 → no reapply. Death if already dead.
    if(creature.isDead() || creature.deathStarted){
      const death = new GameState.GameEffectFactory.EffectDeath();
      death.setCreator(this.getCreator());
      death.setInt(0, 0);
      death.setInt(1, 1);
      creature.addEffect(death, GameEffectDurationType.INSTANT);
    }
  }

  private applyBloodVfx(creature: ModuleCreature){
    const color = String(creature.getAppearance()?.bloodcolr || '').toUpperCase();
    let vfxId = 0;
    if(color === 'R') vfxId = 0x9e;
    else if(color === 'G') vfxId = 0x9f;
    else if(color === 'Y') vfxId = 0xa0;
    if(!vfxId) return;

    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setCreator(this.getCreator());
    vfx.setDurationType(GameEffectDurationType.INSTANT);
    vfx.setInt(0, vfxId);
    creature.addEffect(vfx, GameEffectDurationType.INSTANT);
  }
}
