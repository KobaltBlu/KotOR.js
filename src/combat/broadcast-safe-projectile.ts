import { GameState } from "@/GameState";
import { MDLLoader } from "@/loaders";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
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
  flightMs: number;
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
  const projmodel = String(opts.spell?.projmodel || '').trim();
  if(!projmodel || projmodel === '****') return undefined;

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

    // Fire-and-forget travel: lerp to destination over flightMs then dispose.
    const flight = Math.max(1, opts.flightMs | 0);
    const start = performance.now();
    const from = opts.origin.clone();
    const to = opts.destination.clone();
    const mid = from.clone().lerp(to, 0.5);
    mid.z += 2;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);

    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / flight);
      model.position.copy(curve.getPoint(t));
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
