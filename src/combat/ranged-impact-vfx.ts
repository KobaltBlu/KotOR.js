import * as THREE from "three";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { AttackResult } from "@/enums/combat/AttackResult";
import { GameState } from "@/GameState";
import { MDLLoader, TextureLoader } from "@/loaders";
import type { ModuleCreature, ModuleObject } from "@/module";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
import type { CombatAttackData } from "@/combat/CombatAttackData";

/**
 * ranged impact helpers —
 * ResolveProjectileMissImpact (VFX 4032 / 0xFC0 at miss pos),
 * spawnWorldImpactVfx for fire-and-forget world models.
 *
 * Full on-hit / parry visuals live in CombatRound.resolveOnHitVisuals.
 * Traveling CombatProjectile bolts spawn at muzzle time (see combat-projectile.ts).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ranged-impact-vfx.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** VFX_COM_BLASTER_IMPACT — damagehitvisual Blaster rangedeffect. */
export const VFX_COM_BLASTER_IMPACT = 4024;
/** VFX_COM_BLASTER_IMPACT_GROUND — ResolveProjectileMissImpact int 0xFC0. */
export const VFX_COM_BLASTER_IMPACT_GROUND = 0xfc0; // 4032

function getRangedImpactVfxId(weapon: ModuleObject | undefined): number {
  const table = GameState.TwoDAManager?.datatables?.get('damagehitvisual');
  // Blaster row is 12; prefer weapon damage-flags mapping later
  const row = table?.getByID?.(12) || table?.rows?.[12];
  const raw = row?.rangedeffect ?? row?.RangedEffect;
  if(raw !== null && raw !== undefined && raw !== '****'){
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if(Number.isFinite(n) && n > 0) return n;
  }
  return VFX_COM_BLASTER_IMPACT;
}

/**
 * Fire-and-forget impact model at a world position (miss splat / ground hit).
 */
export function spawnWorldImpactVfx(
  vfxId: number,
  position: THREE.Vector3,
  context: any = GameState
): void {
  const table = GameState.TwoDAManager?.datatables?.get('visualeffects');
  const row = table?.getByID?.(vfxId);
  const resRef = row?.imp_impact_node;
  if(!resRef || resRef === '****') return;

  MDLLoader.loader.load(String(resRef)).then((mdl: OdysseyModel) => {
    OdysseyModel3D.FromMDL(mdl, { context }).then((model: OdysseyModel3D) => {
      model.position.copy(position);
      GameState.scene.add(model);
      TextureLoader.LoadQueue();
      try{
        model.playAnimation('impact');
      }catch(_e){ /* some impacts have no named anim */ }

      // Dispose after short Fire-and-Forget window
      setTimeout(() => {
        try{ model.dispose(); }catch(_e){ /* ignore */ }
        if(model.parent) model.parent.remove(model);
      }, 2500);
    }).catch(() => {});
  }).catch(() => {});
}

/**
 * Apply hit impact VFX on the react target (creature model impact node).
 */
export function applyHitImpactVfx(target: ModuleObject, weapon?: ModuleObject): void {
  if(!target || !GameState.GameEffectFactory?.EffectVisualEffect) return;
  const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
  vfx.setDurationType(GameEffectDurationType.INSTANT);
  vfx.setInt(0, getRangedImpactVfxId(weapon));
  vfx.initialize();
  target.addEffect(vfx, GameEffectDurationType.INSTANT, 0);
}

/**
 * Called when deferred ranged damage/miss resolves — impact VFX timing.
 */
export function signalRangedImpactVfx(
  attack: CombatAttackData,
  owner: ModuleCreature
): void {
  if(!attack?.rangedAttack) return;

  const hit =
    attack.attackResult === AttackResult.HIT_SUCCESSFUL ||
    attack.attackResult === AttackResult.CRITICAL_HIT ||
    attack.attackResult === AttackResult.AUTOMATIC_HIT ||
    attack.attackResult === AttackResult.DEFLECTED ||
    attack.attackResult === AttackResult.PARRIED;

  if(hit && attack.reactObject){
    applyHitImpactVfx(attack.reactObject, attack.attackWeapon as any);
    return;
  }

  if(attack.attackResult === AttackResult.MISS){
    const pos = new THREE.Vector3(
      attack.rangedTargetX,
      attack.rangedTargetY,
      attack.rangedTargetZ
    );
    spawnWorldImpactVfx(VFX_COM_BLASTER_IMPACT_GROUND, pos, owner?.context);
  }
}
