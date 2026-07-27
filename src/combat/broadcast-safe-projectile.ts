import { GameState } from "@/GameState";
import { MDLLoader } from "@/loaders";
import { OdysseyModel3D } from "@/three/odyssey";
import { playSpellProjectileTravelAnimation } from "@/combat/combat-projectile";
import { resolveSpellProjectileModelResRef } from "@/combat/spell-projectile-model";
import { sampleSpellProjectilePosition } from "@/combat/spell-projectile-motion";
import { resolveSpellProjectilePathType } from "@/combat/spell-projectile-time";
import { ProjectilePath } from "@/enums/combat/ProjectilePath";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import type { TalentSpell } from "@/talents";
import * as THREE from "three";

/**
 * Shared spell-projectile visual spawn — mirrors retail client
 * HandleServerToPlayerSafeProjectileSpell @ 00650b90 creating CSWCProjectile
 * from spells.2da projmodel. SpellCastInstance owns flight+impact timing;
 * this helper only spawns when no instance already attached a model.
 *
 * @file broadcast-safe-projectile.ts
 */

export type SafeProjectileSpellOpts = {
  caster: ModuleObject;
  target?: ModuleObject;
  origin: THREE.Vector3;
  destination: THREE.Vector3;
  spell: TalentSpell | undefined;
  /** Grenade / item cast — fallback model when spell.projmodel is empty. */
  item?: ModuleItem;
  flightMs: number;
  /** Retail SetProjectileType path id. */
  projectilePath?: number;
  /** When true, SpellCastInstance already owns the visual — no-op. */
  alreadySpawned?: boolean;
};

/**
 * Single-process stand-in for BroadcastSafeProjectile (spell path, type 6/7).
 * Returns the spawned model, or undefined when skipped / failed.
 */
export async function broadcastSafeProjectileSpell(
  opts: SafeProjectileSpellOpts
): Promise<OdysseyModel3D | undefined> {
  if(opts.alreadySpawned) return undefined;
  const projmodel = resolveSpellProjectileModelResRef(opts.spell, opts.item);
  if(!projmodel) return undefined;

  try{
    const mdl = await MDLLoader.loader.load(projmodel.toLowerCase());
    if(!mdl) return undefined;
    const model = await OdysseyModel3D.FromMDL(mdl, {
      context: opts.caster.context || GameState,
    });
    if(!model) return undefined;

    const group = (opts.caster.context || GameState).group?.effects;
    group?.add(model);
    model.position.copy(opts.origin);
    playSpellProjectileTravelAnimation(model);

    const flight = Math.max(1, opts.flightMs | 0);
    const start = performance.now();
    const from = opts.origin.clone();
    const to = opts.destination.clone();
    const pathType =
      (opts.projectilePath | 0) ||
      resolveSpellProjectilePathType(opts.spell?.projtype) ||
      ProjectilePath.GRENADE;
    const spiralSign = Math.random() < 0.5 ? -1 : 1;
    const lookAhead = new THREE.Vector3();

    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / flight);
      sampleSpellProjectilePosition(pathType, from, to, t, model.position, {
        totalMs: flight,
        spiralSign,
      });
      sampleSpellProjectilePosition(
        pathType, from, to, Math.min(1, t + 0.05), lookAhead,
        { totalMs: flight, spiralSign }
      );
      if(lookAhead.distanceToSquared(model.position) > 0.0001){
        model.lookAt(lookAhead);
      }
      if(t < 1){
        requestAnimationFrame(tick);
      }else{
        try{ model.dispose(); }catch(_e){ /* ignore */ }
      }
    };
    requestAnimationFrame(tick);
    return model;
  }catch(_e){
    return undefined;
  }
}
