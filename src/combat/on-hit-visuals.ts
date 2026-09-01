import * as THREE from "three";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { AttackResult } from "@/enums/combat/AttackResult";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import type { CombatAttackData } from "@/combat/CombatAttackData";
import {
  spawnWorldImpactVfx,
  VFX_COM_BLASTER_IMPACT_GROUND,
} from "@/combat/ranged-impact-vfx";

/**
 * Retail ResolveOnHitVisuals
 * per damage-channel damagehitvisual VFX, plus parry/deflect VFX 0xFB7
 * when attack_result is in {8,9,10}. Ranged miss ground splat remains
 * ResolveProjectileMissImpact.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file on-hit-visuals.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** VFX_COM_PARRY — ResolveOnHitVisuals int 0xFB7 for attack_result 8..10. */
export const VFX_COM_PARRY_DEFLECT = 0xfb7; // 4023

/** Retail damagehitvisual loop skips BLUDGEONING/PIERCING/SLASHING (0..2). */
const DAMAGE_HIT_VISUAL_TYPE_COUNT = 14;

function readDamageHitVisualId(
  damageTypeIndex: number,
  ranged: boolean
): number {
  const table = GameState.TwoDAManager?.datatables?.get('damagehitvisual');
  const row = table?.getByID?.(damageTypeIndex) || table?.rows?.[damageTypeIndex];
  if(!row) return 0;

  const raw = ranged
    ? (row.rangedeffect ?? row.RangedEffect)
    : (row.visualeffect ?? row.VisualEffect);
  if(raw === null || raw === undefined || raw === '****') return 0;

  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function applyInstantVisualEffect(
  target: ModuleObject,
  vfxId: number,
  creator?: ModuleObject
): void {
  if(!target || !vfxId || !GameState.GameEffectFactory?.EffectVisualEffect) return;
  const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
  if(creator) vfx.setCreator(creator);
  vfx.setDurationType(GameEffectDurationType.INSTANT);
  vfx.setInt(0, vfxId);
  vfx.initialize();
  target.addEffect(vfx, GameEffectDurationType.INSTANT, 0);
}

/**
 * Retail ResolveOnHitVisuals + ranged miss impact.
 * Call from CombatRound.signalAttackResult for every attack.
 */
export function resolveOnHitVisuals(
  attack: CombatAttackData,
  owner: ModuleCreature
): void {
  if(!attack) return;

  const target = attack.reactObject;
  const ranged = !!attack.rangedAttack;

  // Per damage channel (skip physical 0..2) — VisualEffect / RangedEffect
  if(target){
    for(let i = 0; i < DAMAGE_HIT_VISUAL_TYPE_COUNT; i++){
      if(i === 0 || i === 1 || i === 2) continue;
      const amount = attack.damageList[i]?.damageValue ?? -1;
      if(amount <= 0) continue;

      const vfxId = readDamageHitVisualId(i, ranged);
      if(vfxId > 0){
        applyInstantVisualEffect(target, vfxId, owner);
      }
    }
  }

  // attack_result 8..10 → VFX 0xFB7 (PARRIED / DEFLECTED / retail result 10)
  const result = attack.attackResult as number;
  if(target && result >= AttackResult.PARRIED && result <= 10){
    applyInstantVisualEffect(target, VFX_COM_PARRY_DEFLECT, target);
  }

  // Ranged miss ground splat (ResolveProjectileMissImpact)
  if(ranged && attack.attackResult === AttackResult.MISS){
    const pos = new THREE.Vector3(
      attack.rangedTargetX,
      attack.rangedTargetY,
      attack.rangedTargetZ
    );
    spawnWorldImpactVfx(VFX_COM_BLASTER_IMPACT_GROUND, pos, owner?.context);
  }
}
