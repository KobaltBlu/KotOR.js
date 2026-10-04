import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { ResourceLoader } from "@engine/loaders";
import { GFFObject } from "@core/resource/GFFObject";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { GameState } from "@engine/runtime/GameState";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModuleArea } from "@engine/module/ModuleArea";
import * as THREE from "three";
import { findOpenWalkLocation } from "@engine/pathfinding/open-walk-location";

import { isArea } from "@engine/module/guards/isArea";
import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectSummonCreature — onApply / onRemove.
 * string[0] = UTC resref; int[0] = appear VFX (−1 = none); float[0..2] = pos;
 * float[3] = delay seconds; object[0] = area; object[1] = summoned creature (set on apply).
 *
 * @file EffectSummonCreature.ts
 */
export class EffectSummonCreature extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSummonCreature;
  }

  onApply(){
    if(this.applied) return;
    if(!this.object || !GameState.module) return;

    // skips spawn when loading from save; creature already exists
    if(this.skipOnLoad && this.getObject(1)){
      super.onApply();
      return;
    }

    const owner = this.object as ModuleCreature;
    let area = this.getObject(0) as ModuleArea | undefined;
    if(!isArea(area)){
      area = (owner.area || GameState.module.area) as ModuleArea;
      if(area) this.setObject(0, area as any);
    }
    if(!area) return;

    let x = this.getFloat(0);
    let y = this.getFloat(1);
    let z = this.getFloat(2);
    if(!x && !y && !z && isCreature(owner)){
      x = owner.position.x;
      y = owner.position.y;
      z = owner.position.z;
      this.setFloat(0, x);
      this.setFloat(1, y);
      this.setFloat(2, z);
    }

    const resref = (this.getString(0) || '').toLowerCase().replace(/\.utc$/i, '');
    if(!resref) return;

    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], resref);
    if(!buffer){
      console.warn('EffectSummonCreature: failed to load', resref);
      return;
    }

    // find safe location(area, requested, 20.0, pathfind, 0, out)
    const requested = new THREE.Vector3(x, y, z);
    const safe = new THREE.Vector3();
    if(findOpenWalkLocation(area, requested, safe, { radius: 20, owner })){
      x = safe.x;
      y = safe.y;
      z = safe.z;
      this.setFloat(0, x);
      this.setFloat(1, y);
      this.setFloat(2, z);
    }

    super.onApply();

    const creature = new GameState.Module.ModuleArea.ModuleCreature(new GFFObject(buffer));
    creature.load();
    creature.clearAllActions?.();
    creature.position.set(x, y, z);
    if(isCreature(owner)){
      creature.setFacing?.(owner.getFacing?.() ?? 0, true);
    }
    GameState.ModuleObjectManager.RegisterObject(creature);
    this.setObject(1, creature);

    const vfxId = this.getInt(0);
    if(typeof vfxId === 'number' && vfxId !== -1 && vfxId > 0){
      const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
      vfx.setInt(0, vfxId);
      vfx.setCreator(this.getCreator() || this.creator);
      // Apply at location via area owner if supported; else on summoner
      owner.addEffect?.(vfx);
    }

    const delay = Math.max(0, this.getFloat(3) || 0);
    const future = GameState.module.timeManager.getFutureTimeFromSeconds(delay);
    const event = new GameState.GameEventFactory.EventSummonCreature();
    event.summonId = creature.id;
    event.position = new THREE.Vector3(x, y, z);
    event.setCaller(isCreature(owner) ? owner : area as any);
    event.setObject(area as any);
    event.setDay(future.pauseDay);
    event.setTime(future.pauseTime);
    GameState.module.addEvent(event);
  }

  onRemove(){
    super.onRemove();
    const summoned = this.getObject(1) as ModuleCreature | undefined;
    if(!isCreature(summoned)) return;
    // UnsummonMyself — destroy summoned creature
    try{
      summoned.destroy?.();
    }catch(e){
      console.warn('EffectSummonCreature: unsummon failed', e);
    }
  }
}
