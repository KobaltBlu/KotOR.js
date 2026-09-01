import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { DiceType } from "@/enums/combat/DiceType";
import { BitWise } from "@/utility/BitWise";
import { Dice } from "@/utility/Dice";
import { GameState } from "@/GameState";
import {
  spawnLightsaberThrowMesh,
  type LightsaberThrowMeshHandle,
} from "@/combat/lightsaber-throw-mesh";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";

/** Default projectile rate when spells.2da speed unavailable (retail fallback). */
const DEFAULT_THROW_RATE = 37.0;
/** Travel VFX (temporary beam-like). */
const VFX_THROW_TRAVEL = 6000;
/** Impact VFX. */
const VFX_THROW_IMPACT = 0x1771;

/**
 * EffectLightsaberThrow — retail OnApplyLightsaberThrow / OnRemove.
 * object[0..2] = up to 3 targets; int[0] selects spell speed row (0→spell 0x31, else 4).
 * Schedules travel VFX + ENERGY damage along the path, then return to thrower.
 * Client: hides hand saber and flies a weapon-model copy along the path.
 *
 * @file EffectLightsaberThrow.ts
 */
export class EffectLightsaberThrow extends GameEffect {
  private throwMesh: LightsaberThrowMeshHandle | undefined;

  constructor(){
    super();
    this.type = GameEffectType.EffectLightSaberThrow;
  }

  private scheduleApply(target: ModuleObject, effect: GameEffect, delaySec: number){
    if(!GameState.module || !target) return;
    const future = GameState.module.timeManager.getFutureTimeFromSeconds(Math.max(0, delaySec));
    const event = new GameState.GameEventFactory.EventApplyEffect();
    event.setEffect(effect);
    event.setCaller(this.getCreator() || this.object);
    event.setObject(target);
    event.setDay(future.pauseDay);
    event.setTime(future.pauseTime);
    GameState.module.addEvent(event);
  }

  private getThrowRate(creature: ModuleCreature): number {
    const spellId = (this.getInt(0) || 0) === 0 ? 0x31 : 4;
    const spells = GameState.TwoDAManager.datatables.get('spells');
    const row = spells?.rows?.[spellId] || spells?.rows?.[String(spellId)];
    // Retail reads projectile speed from the spell row. Approx via proj / numeric columns if present.
    if(row){
      const candidates = [row.projectile_speed, row.projectilespeed, row.proj_speed, row.speed];
      for(let i = 0; i < candidates.length; i++){
        const n = parseFloat(candidates[i]);
        if(isFinite(n) && n > 0) return n;
      }
    }
    return DEFAULT_THROW_RATE;
  }

  private makeTravelVfx(dest: ModuleObject, thrower: ModuleCreature): GameEffect {
    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setDurationType(GameEffectDurationType.TEMPORARY);
    vfx.setInt(0, VFX_THROW_TRAVEL);
    vfx.setInt(2, 0);
    vfx.setObject(0, dest);
    vfx.setObject(1, thrower);
    vfx.setCreator(thrower);
    return vfx;
  }

  private makeImpactVfx(thrower: ModuleCreature): GameEffect {
    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setDurationType(GameEffectDurationType.INSTANT);
    vfx.setInt(0, VFX_THROW_IMPACT);
    vfx.setInt(2, 0);
    vfx.setObject(0, thrower);
    vfx.setCreator(thrower);
    return vfx;
  }

  private makeDamage(thrower: ModuleCreature, amount: number): GameEffect {
    const dmg = new GameState.GameEffectFactory.EffectDamage();
    dmg.setDurationType(GameEffectDurationType.TEMPORARY);
    dmg.setCreator(thrower);
    dmg.setNumIntegers(0x15);
    for(let i = 0; i < 15; i++) dmg.setInt(i, -1);
    // ENERGY channel 12 + script amount channel 14; already mitigated + shield-skip flags
    dmg.setInt(12, amount);
    dmg.setInt(14, amount);
    dmg.setInt(16, 0);
    dmg.setInt(19, 1);
    dmg.setInt(20, 1);
    return dmg;
  }

  onApply(){
    if(this.applied) return;
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const thrower = this.object as ModuleCreature;
    if(!thrower.equipment?.RIGHTHAND){
      return;
    }

    super.onApply();
    thrower.throwingLightsaber = true;

    const targets: ModuleObject[] = [];
    for(let i = 0; i < 3; i++){
      const o = this.getObject(i);
      if(BitWise.InstanceOfObject(o, ModuleObjectType.ModuleObject) &&
         o.id !== ModuleObjectConstant.OBJECT_INVALID){
        targets.push(o);
      }
    }
    if(!targets.length) return;

    // Path waypoints: thrower → t1 → t2 → t3 → thrower (skip missing)
    const path: ModuleObject[] = [thrower];
    for(let i = 0; i < targets.length; i++) path.push(targets[i]);
    path.push(thrower);

    // Total path length for throw rate
    let totalDist = 0;
    for(let i = 1; i < path.length; i++){
      totalDist += path[i - 1].position.distanceTo(path[i].position);
    }
    const speed = this.getThrowRate(thrower);
    const throwRate = speed > 0 ? (totalDist / speed) * 2000.0 : DEFAULT_THROW_RATE;
    thrower.lightsaberThrowRate = throwRate;

    const level = thrower.getTotalClassLevel(false);
    const diceCount = Math.max(1, Math.floor(level * 0.5));

    // Client projectile: hide hand saber + fly weapon mesh along path
    const weapon = thrower.equipment.RIGHTHAND;
    void spawnLightsaberThrowMesh({
      thrower,
      weapon,
      path,
      throwRate,
    }).then((handle) => {
      this.throwMesh = handle;
    });

    let elapsedMs = 0;
    // Segments 1..n: travel to each node; damage on non-thrower destinations
    for(let seg = 1; seg < path.length; seg++){
      const from = path[seg - 1];
      const to = path[seg];
      if(!from || !to) continue;

      const dist = from.position.distanceTo(to.position);
      const segMs = throwRate > 0 ? (dist / throwRate) * 2000.0 : 0;
      const delaySec = elapsedMs / 1000;

      this.scheduleApply(to, this.makeTravelVfx(to, thrower), delaySec);

      const isReturn = to === thrower;
      if(!isReturn && BitWise.InstanceOfObject(to, ModuleObjectType.ModuleCreature)){
        let amount = Dice.roll(diceCount, DiceType.d6, 0);
        // Retail ResistDamage-style adjust vs ENERGY (0x1000) — use amount as mitigated
        const impactDelay = (elapsedMs + segMs) / 1000;
        this.scheduleApply(to, this.makeDamage(thrower, amount), impactDelay);
        this.scheduleApply(to, this.makeImpactVfx(thrower), impactDelay);
      }

      elapsedMs += segMs;
    }
  }

  onRemove(){
    super.onRemove();
    this.throwMesh?.dispose();
    this.throwMesh = undefined;
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)) return;
    (this.object as ModuleCreature).throwingLightsaber = false;
  }
}
