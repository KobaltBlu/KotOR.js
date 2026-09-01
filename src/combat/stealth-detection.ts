import * as THREE from "three";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { Dice } from "@/utility/Dice";
import { DiceType } from "@/enums/combat/DiceType";
import {
  DETECT_FLAG_SEE_INVISIBLE,
  DETECT_FLAG_TRUE_SEEING,
  DETECT_FLAG_ULTRA_VISION,
  getDetectFlags,
} from "@/effects/effect-bonuses";
import type { EffectSanctuary } from "@/effects/EffectSanctuary";
import { isCreatureBlind } from "@/effects/EffectBlindness";

/**
 * Contested stealth detection helpers.
 * Retail: DoSpotDetection / DoListenDetection
 * GetInvisible.
 */

function isStealthedOrInvisible(target: ModuleCreature): boolean {
  if(target.stealthMode) return true;
  if(target.hasEffect?.(GameEffectType.EffectInvisibility)) return true;
  if(target.hasEffect?.(GameEffectType.EffectSanctuary)) return true;
  return false;
}

/**
 * Retail GetInvisible — true if `target` is effect-hidden from `observer`.
 */
export function isInvisibleToObserver(observer: ModuleCreature, target: ModuleCreature): boolean {
  if(!observer || !target || observer === target) return false;

  const detect = getDetectFlags(observer);
  if(detect & DETECT_FLAG_TRUE_SEEING){
    return false;
  }
  const seeInvis = !!(detect & DETECT_FLAG_SEE_INVISIBLE);
  const pierceDark = !!(detect & (DETECT_FLAG_ULTRA_VISION | DETECT_FLAG_TRUE_SEEING));

  const effects = target.effects || [];
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e) continue;

    if(e.type === GameEffectType.EffectInvisibility){
      const mode = e.getInt(0) || 1;
      // mode 2 (darkness): UltraVision / True Seeing pierce
      if(mode === 2){
        if(!pierceDark) return true;
      }else if(mode === 1 || mode === 4){
        if(!seeInvis) return true;
      }else if(!seeInvis){
        return true;
      }
    }

    if(e.type === GameEffectType.EffectSanctuary){
      const hostile = typeof (observer as any).isHostile === 'function'
        ? (observer as any).isHostile(target)
        : (observer.factionId !== target.factionId);
      if(!hostile) continue;
      const dc = (e as EffectSanctuary).getWillDC?.() || e.getInt(4) || 0;
      if(dc <= 0 || !observer.willSave?.(dc, 0, target)){
        return true;
      }
    }
  }

  return false;
}

/**
 * Spot check: observer Awareness vs target Hide while stealthed.
 * Returns true if the observer sees the target.
 */
export function doSpotDetection(observer: ModuleCreature, target: ModuleCreature): boolean {
  if(!observer || !target) return false;
  // Retail DoSpotDetection: GetBlind observer fails spot
  if(isCreatureBlind(observer)){
    return false;
  }
  if(!isStealthedOrInvisible(target)) return true;

  const hideRank = target.getSkillLevel?.(SkillType.STEALTH) || 0;
  if(hideRank < 1 && !target.stealthMode){
    return true;
  }

  const hideDice = Dice.roll(1, DiceType.d10);
  let awareness = observer.getSkillLevel?.(SkillType.AWARENESS) || 0;
  const detectMode = !!observer.detectMode;
  if(!detectMode){
    awareness = Math.floor(awareness / 2);
  }
  const spotDice = Dice.roll(1, DiceType.d10);

  let score = awareness + spotDice - hideRank - hideDice;

  const toTarget = target.position.clone().sub(observer.position);
  toTarget.z = 0;
  if(toTarget.lengthSq() > 0.0001){
    toTarget.normalize();
    const facing = observer.getFacingVector?.() || new THREE.Vector3(0, 1, 0);
    facing.z = 0;
    if(facing.lengthSq() > 0.0001){
      facing.normalize();
      const dot = toTarget.x * facing.x + toTarget.y * facing.y;
      if(dot < -0.707){
        score -= 5;
      }
    }
  }

  if(observer.combatData?.combatState || observer.combatRound?.roundStarted){
    score -= 10;
  }

  const targetMoving = (target.force || 0) > 0.01 || (target.speed || 0) > 0.01;
  const observerMoving = (observer.force || 0) > 0.01 || (observer.speed || 0) > 0.01;
  if(!targetMoving) score -= 5;
  if(!observerMoving) score += 5;

  const dist = observer.position.distanceTo(target.position);
  const distFactor = dist / 3;
  if(distFactor > 2){
    score -= Math.floor(distFactor - 2);
  }

  return score >= 1;
}

export function doListenDetection(observer: ModuleCreature, target: ModuleCreature): boolean {
  return doSpotDetection(observer, target);
}

/**
 * True if observer can detect a (possibly stealthed/invisible) target.
 */
export function doStealthDetection(observer: ModuleCreature, target: ModuleCreature): boolean {
  // Effect invisibility / sanctuary not pierced → cannot detect
  if(isInvisibleToObserver(observer, target)){
    return false;
  }
  if(!isStealthedOrInvisible(target)){
    return true;
  }
  // Contested hide for stealth mode (and residual invis that was pierced)
  return doSpotDetection(observer, target) || doListenDetection(observer, target);
}

export function isCreatureStealthedOrInvisible(target: ModuleCreature): boolean {
  return isStealthedOrInvisible(target);
}
