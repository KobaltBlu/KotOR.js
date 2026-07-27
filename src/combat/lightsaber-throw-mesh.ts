import * as THREE from "three";
import { GameState } from "@/GameState";
import { MDLLoader, TextureLoader } from "@/loaders";
import { OdysseyModel3D } from "@/three/odyssey";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";

/**
 * Client-side LightsaberThrow projectile mesh — retail flies the equipped
 * saber model along the throw path while the hand model is hidden.
 *
 * @file lightsaber-throw-mesh.ts
 */

export type LightsaberThrowMeshHandle = {
  dispose: () => void;
};

function resolveWeaponModelResRef(weapon: ModuleItem): string {
  const base = weapon.baseItem;
  if(!base) return '';
  let itemclass = String(base.itemClass || '').replace(/\0[\s\S]*$/g, '').trim().toLowerCase();
  let defaultModel = String(base.defaultModel || '').replace(/\0[\s\S]*$/g, '').trim().toLowerCase();
  if(!defaultModel || defaultModel === 'i_null') return '';
  const nth = weapon.getModelVariation?.() ?? 1;
  const value = String(nth);
  defaultModel = defaultModel.substr(0, defaultModel.length - value.length) + value;
  if(!parseInt(defaultModel.substr(-3))){
    defaultModel = itemclass + '_' + (('000' + nth).substr(-3));
  }
  return defaultModel;
}

/**
 * Hide the thrower's hand saber, spawn a flying copy, lerp along `path`
 * using the same segment timing as EffectLightsaberThrow, then restore.
 */
export async function spawnLightsaberThrowMesh(opts: {
  thrower: ModuleCreature;
  weapon: ModuleItem;
  path: ModuleObject[];
  /** Same throwRate field EffectLightsaberThrow writes to the creature. */
  throwRate: number;
}): Promise<LightsaberThrowMeshHandle | undefined> {
  const { thrower, weapon, path, throwRate } = opts;
  if(!thrower || !weapon || !path?.length) return undefined;

  const resref = resolveWeaponModelResRef(weapon);
  if(!resref) return undefined;

  const handModel = weapon.model instanceof OdysseyModel3D ? weapon.model : undefined;
  const wasVisible = handModel ? handModel.visible !== false : true;
  if(handModel){
    handModel.visible = false;
  }

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
    if(handModel){
      handModel.visible = wasVisible;
    }
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

    const group = (thrower.context || GameState).group?.effects;
    group?.add(projectile);
    TextureLoader.LoadQueue?.();

    // Match EffectLightsaberThrow segment timing
    const waypoints: { pos: THREE.Vector3; arriveMs: number }[] = [];
    let elapsedMs = 0;
    waypoints.push({ pos: path[0].position.clone(), arriveMs: 0 });
    for(let seg = 1; seg < path.length; seg++){
      const from = path[seg - 1];
      const to = path[seg];
      if(!from || !to) continue;
      const dist = from.position.distanceTo(to.position);
      const segMs = throwRate > 0 ? (dist / throwRate) * 2000.0 : 0;
      elapsedMs += segMs;
      waypoints.push({ pos: to.position.clone(), arriveMs: elapsedMs });
    }

    if(waypoints.length < 2){
      dispose();
      return undefined;
    }

    projectile.position.copy(waypoints[0].pos);
    // Keep saber powered look while in flight
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
      // Find segment containing tMs
      let i = 1;
      while(i < waypoints.length && waypoints[i].arriveMs < tMs) i++;
      const a = waypoints[Math.max(0, i - 1)];
      const b = waypoints[Math.min(waypoints.length - 1, i)];
      const span = Math.max(1, b.arriveMs - a.arriveMs);
      const u = Math.min(1, Math.max(0, (tMs - a.arriveMs) / span));
      projectile.position.lerpVectors(a.pos, b.pos, u);
      // Face travel direction
      const dir = b.pos.clone().sub(a.pos);
      if(dir.lengthSq() > 1e-6){
        projectile.lookAt(projectile.position.clone().add(dir));
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
