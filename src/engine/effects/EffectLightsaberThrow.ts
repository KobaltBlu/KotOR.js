import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { DiceType } from "@core/enums/combat/DiceType";
import { Dice } from "@core/utility/Dice";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import type { Item } from "@engine/module/Item";
import type { GameObject } from "@engine/module/GameObject";
import { MDLLoader, TextureLoader } from "@engine/loaders";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import * as THREE from "three";

import { isCreature } from "@engine/module/guards/isCreature";
import { isGameObject } from "@engine/module/guards/isGameObject";

/** Default projectile rate when spells.2da speed unavailable (fallback). */
const DEFAULT_THROW_RATE = 37.0;
/** Travel VFX (temporary beam-like). */
const VFX_THROW_TRAVEL = 6000;
/** Impact VFX. */
const VFX_THROW_IMPACT = 0x1771;

/**
 * EffectLightsaberThrow — onApply / onRemove.
 * object[0..2] = up to 3 targets; int[0] selects spell speed row (0→spell 0x31, else 4).
 * Schedules travel VFX + ENERGY damage along the path, then return to thrower.
 * Client: hides hand saber and flies a weapon-model copy along the path.
 *
 * @file EffectLightsaberThrow.ts
 */
export class EffectLightsaberThrow extends GameEffect {
  private throwMesh: { dispose: () => void } | undefined;

  constructor(){
    super();
    this.type = GameEffectType.EffectLightSaberThrow;
  }

  private scheduleApply(target: GameObject, effect: GameEffect, delaySec: number){
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

  private getThrowRate(creature: Creature): number {
    const spellId = (this.getInt(0) || 0) === 0 ? 0x31 : 4;
    const spell = GameState.SWRuleSet?.spells?.[spellId];
    // reads projectile speed from the spell row (proj column when present).
    if(spell){
      const n = spell.proj | 0;
      if(n > 0) return n;
    }
    return DEFAULT_THROW_RATE;
  }

  private makeTravelVfx(dest: GameObject, thrower: Creature): GameEffect {
    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setDurationType(GameEffectDurationType.TEMPORARY);
    vfx.setInt(0, VFX_THROW_TRAVEL);
    vfx.setInt(2, 0);
    vfx.setObject(0, dest);
    vfx.setObject(1, thrower);
    vfx.setCreator(thrower);
    return vfx;
  }

  private makeImpactVfx(thrower: Creature): GameEffect {
    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setDurationType(GameEffectDurationType.INSTANT);
    vfx.setInt(0, VFX_THROW_IMPACT);
    vfx.setInt(2, 0);
    vfx.setObject(0, thrower);
    vfx.setCreator(thrower);
    return vfx;
  }

  private makeDamage(thrower: Creature, amount: number): GameEffect {
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

  private static resolveWeaponModelResRef(weapon: Item): string {
    const base = weapon.baseItem;
    if(!base) return '';
    const itemclass = String(base.itemClass || '')
      .replace(/\0[\s\S]*$/g, '')
      .trim()
      .toLowerCase();
    let defaultModel = String(base.defaultModel || '')
      .replace(/\0[\s\S]*$/g, '')
      .trim()
      .toLowerCase();
    if(!defaultModel || defaultModel === 'i_null') return '';
    const nth = weapon.getModelVariation?.() ?? 1;
    const value = String(nth);
    defaultModel = defaultModel.substr(0, defaultModel.length - value.length) + value;
    if(!parseInt(defaultModel.substr(-3))){
      defaultModel = itemclass + '_' + (('000' + nth).substr(-3));
    }
    return defaultModel;
  }

  private async spawnLightsaberThrowMesh(
    thrower: Creature,
    weapon: Item,
    path: GameObject[],
    throwRate: number
  ): Promise<{ dispose: () => void } | undefined> {
    if(!thrower || !weapon || !path?.length) return undefined;
    const resref = EffectLightsaberThrow.resolveWeaponModelResRef(weapon);
    if(!resref) return undefined;

    const handModel = weapon.model instanceof OdysseyModel3D ? weapon.model : undefined;
    const wasVisible = handModel ? handModel.visible !== false : true;
    if(handModel) handModel.visible = false;

    let disposed = false;
    let projectile: OdysseyModel3D | undefined;
    let raf = 0;
    const dispose = () => {
      if(disposed) return;
      disposed = true;
      if(raf){
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if(handModel) handModel.visible = wasVisible;
      if(projectile){
        try{
          projectile.parent?.remove(projectile);
          projectile.dispose();
        }catch(_e){ /* ignore */ }
        projectile = undefined;
      }
    };

    try{
      const mdl = await MDLLoader.loader.load(resref);
      if(!mdl || disposed){
        dispose();
        return undefined;
      }
      projectile = await OdysseyModel3D.FromMDL(mdl, {
        context: thrower.context || GameState,
        lighting: true,
      });
      if(!projectile || disposed){
        dispose();
        return undefined;
      }

      (thrower.context || GameState).group?.effects?.add(projectile);
      TextureLoader.LoadQueue?.();

      const waypoints: { pos: THREE.Vector3; arriveMs: number }[] = [];
      let elapsedMs = 0;
      waypoints.push({ pos: path[0].position.clone(), arriveMs: 0 });
      for(let seg = 1; seg < path.length; seg++){
        const from = path[seg - 1];
        const to = path[seg];
        if(!from || !to) continue;
        elapsedMs += throwRate > 0
          ? (from.position.distanceTo(to.position) / throwRate) * 2000.0
          : 0;
        waypoints.push({ pos: to.position.clone(), arriveMs: elapsedMs });
      }
      if(waypoints.length < 2){
        dispose();
        return undefined;
      }

      projectile.position.copy(waypoints[0].pos);
      try{
        projectile.playAnimation?.('powered');
      }catch(_e){ /* ignore */ }

      const start = performance.now();
      const totalMs = Math.max(1, waypoints[waypoints.length - 1].arriveMs);
      const tick = () => {
        if(disposed || !projectile) return;
        const tMs = performance.now() - start;
        if(tMs >= totalMs){
          projectile.position.copy(waypoints[waypoints.length - 1].pos);
          dispose();
          return;
        }
        let i = 1;
        while(i < waypoints.length && waypoints[i].arriveMs < tMs) i++;
        const from = waypoints[Math.max(0, i - 1)];
        const to = waypoints[Math.min(waypoints.length - 1, i)];
        const span = Math.max(1, to.arriveMs - from.arriveMs);
        const progress = Math.min(1, Math.max(0, (tMs - from.arriveMs) / span));
        projectile.position.lerpVectors(from.pos, to.pos, progress);
        const direction = to.pos.clone().sub(from.pos);
        if(direction.lengthSq() > 1e-6){
          projectile.lookAt(projectile.position.clone().add(direction));
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return { dispose };
    }catch(_e){
      dispose();
      return undefined;
    }
  }

  onApply(){
    if(this.applied) return;
    if(!isCreature(this.object)){
      return;
    }
    const thrower = this.object as Creature;
    if(!thrower.equipment?.RIGHTHAND){
      return;
    }

    super.onApply();
    thrower.throwingLightsaber = true;

    const targets: GameObject[] = [];
    for(let i = 0; i < 3; i++){
      const o = this.getObject(i);
      if(isGameObject(o) &&
         o.id !== GameObjectConstant.OBJECT_INVALID){
        targets.push(o);
      }
    }
    if(!targets.length) return;

    // Path waypoints: thrower → t1 → t2 → t3 → thrower (skip missing)
    const path: GameObject[] = [thrower];
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
    void this.spawnLightsaberThrowMesh(thrower, weapon, path, throwRate).then((handle) => {
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
      if(!isReturn && isCreature(to)){
        let amount = Dice.roll(diceCount, DiceType.d6, 0);
        // ResistDamage-style adjust vs ENERGY (0x1000) — use amount as mitigated
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
    if(!isCreature(this.object)) return;
    (this.object as Creature).throwingLightsaber = false;
  }
}
