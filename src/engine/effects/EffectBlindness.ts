import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@core/enums/effects/GameEffectSubType";
import { GameState } from "@engine/runtime/GameState";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import { hasImmunityType } from "@engine/effects/haste-slow";

import { isCreature } from "@engine/module/guards/isCreature";

/** Vision flags (creature.visionFlags). */
export const VISION_FLAG_SEE_INVISIBLE = 0x01;
export const VISION_FLAG_ULTRA_VISION = 0x02;
export const VISION_FLAG_TRUE_SEEING = 0x04;
export const VISION_FLAG_DARKNESS_BLIND = 0x08;
export const VISION_FLAG_BLIND = 0x10;

/**
 * EffectBlindness — onApply.
 * int[0] must be 0x10 (true blind) or 8 (darkness-blind).
 * Spawns MissChance 50%, Vision(4), VFX 0x138A; ORs visionFlags.
 *
 * @file EffectBlindness.ts
 */
export class EffectBlindness extends GameEffect {
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectBlindness;
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;
    const mode = this.getInt(0);

    // : only 0x10 or 8 are valid apply modes
    if(mode !== VISION_FLAG_BLIND && mode !== VISION_FLAG_DARKNESS_BLIND){
      return;
    }
    if(creature.plot){
      return;
    }
    if(mode === VISION_FLAG_BLIND && hasImmunityType(creature, 7)){
      return;
    }
    // Darkness-blind blocked by UltraVision / TrueSeeing
    if(mode === VISION_FLAG_DARKNESS_BLIND){
      const vf = creature.visionFlags || 0;
      if((vf & VISION_FLAG_ULTRA_VISION) || (vf & VISION_FLAG_TRUE_SEEING)){
        return;
      }
      // Also check active effects
      if(
        creature.hasEffect(GameEffectType.EffectTrueseeing) ||
        creature.hasEffect(GameEffectType.EffectUltraVision)
      ){
        return;
      }
    }

    super.onApply();
    creature.visionFlags = (creature.visionFlags || 0) | mode;

    const miss = new GameState.GameEffectFactory.EffectMissChance();
    this.stampChild(miss);
    miss.setInt(0, 0x32); // 50%
    miss.setInt(1, mode === VISION_FLAG_DARKNESS_BLIND ? 1 : 0);
    creature.addEffect(miss, this.getDurationType(), this.duration);
    this.children.push(miss);

    try{
      const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
      this.stampChild(vfx);
      vfx.setInt(0, 0x138A);
      creature.addEffect(vfx, this.getDurationType(), this.duration);
      this.children.push(vfx);
    }catch(_e){ /* optional */ }
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      recomputeVisionFlags(this.object as ModuleCreature);
    }
    for(let i = 0; i < this.children.length; i++){
      this.object?.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
  }

  private stampChild(child: GameEffect){
    child.setCreator(this.getCreator() || this.creator);
    child.setSpellId(this.getSpellId());
    child.setDurationType(this.getDurationType() || GameEffectDurationType.TEMPORARY);
    child.setDuration(this.duration);
    child.setExpireDay(this.expireDay);
    child.setExpireTime(this.expireTime);
    child.setSubType(GameEffectSubType.MAGICAL);
    child.setSkipOnLoad(true);
  }
}

export function recomputeVisionFlags(creature: ModuleCreature){
  let flags = 0;
  const effects = creature.effects || [];
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e?.applied) continue;
    if(e.type === GameEffectType.EffectBlindness){
      flags |= e.getInt(0) || 0;
    }else if(e.type === GameEffectType.EffectSeeInvisible){
      flags |= VISION_FLAG_SEE_INVISIBLE;
    }else if(e.type === GameEffectType.EffectUltraVision){
      flags |= VISION_FLAG_ULTRA_VISION;
    }else if(e.type === GameEffectType.EffectTrueseeing){
      flags |= VISION_FLAG_TRUE_SEEING;
    }
  }
  creature.visionFlags = flags;
}

/** GetBlind */
export function isCreatureBlind(creature: ModuleCreature): boolean {
  const flags = creature.visionFlags || 0;
  if(flags & VISION_FLAG_BLIND) return true;
  if((flags & VISION_FLAG_DARKNESS_BLIND) && !(flags & VISION_FLAG_ULTRA_VISION)){
    return true;
  }
  // Fallback: active Blindness effect not yet reflected in flags
  return !!(creature.effects || []).find(
    e => e?.applied && e.type === GameEffectType.EffectBlindness &&
      (e.getInt(0) === VISION_FLAG_BLIND ||
        (e.getInt(0) === VISION_FLAG_DARKNESS_BLIND && !(flags & VISION_FLAG_ULTRA_VISION)))
  );
}
