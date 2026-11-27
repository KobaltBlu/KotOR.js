import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { MDLLoader, TextureLoader } from "@engine/loaders";
import type { Creature } from "@engine/module/Creature";
import type { Item } from "@engine/module/Item";
import type { GameObject } from "@engine/module/GameObject";
import { OdysseyModel } from "@engine/odyssey";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import type { CombatAttackData } from "@engine/combat/CombatAttackData";
import { AudioPriorityGroup } from "@core/enums/audio/AudioPriorityGroup";

/**
 * Client-side traveling blaster bolt —
 * projectile via HandleServerToPlayerSafeProjectileProjectile.
 *
 * Model / ShotSound / MuzzleFlash from ammunitiontypes.2da.
 * Flight anim: travel01 (projectile SetAnimation case 1).
 *
 * @file combat-projectile.ts
 */

export type AmmunitionTypeRow = {
  model?: string;
  model0?: string;
  model1?: string;
  shotsound0?: string;
  shotsound1?: string;
  impactsound0?: string;
  impactsound1?: string;
  muzzleflash?: string;
  shieldhit?: string | number;
};

/** ResolveRangedHit fallback when impact node missing. */
export const PROJECTILE_IMPACT_Z_OFFSET = 1.25;

const _tmpOrigin = new THREE.Vector3();
const _tmpTarget = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();

function pickResRef(...candidates: (string | undefined | null)[]): string {
  for(let i = 0; i < candidates.length; i++){
    const v = candidates[i];
    if(v && v !== '****' && String(v).trim()){
      return String(v).trim().toLowerCase();
    }
  }
  return '';
}

/** 2DA column names vary in case (Model0 vs model0). */
function pickRowResRef(row: Record<string, any> | undefined, ...keys: string[]): string {
  if(!row) return '';
  const lowerMap: Record<string, any> = {};
  for(const k of Object.keys(row)){
    lowerMap[k.toLowerCase()] = row[k];
  }
  return pickResRef(...keys.map((k) => lowerMap[k.toLowerCase()]));
}

function tryModelNodeWorldPos(
  model: OdysseyModel3D | undefined,
  names: string[],
  out: THREE.Vector3
): boolean {
  if(!model?.nodes) return false;
  for(let i = 0; i < names.length; i++){
    const node = model.nodes.get(names[i]) || (model as any)[names[i]];
    if(node && typeof node.getWorldPosition === 'function'){
      node.getWorldPosition(out);
      return true;
    }
  }
  return false;
}

/**
 * ammunitiontypes.2da row for a ranged weapon (baseitems.ammunitiontype).
 */
export function getAmmunitionTypeRow(weapon: Item | undefined): AmmunitionTypeRow | undefined {
  if(!weapon?.baseItem) return undefined;
  const ammoId = weapon.baseItem.ammunitionType;
  if(ammoId == null || ammoId < 0) return undefined;
  const table = GameState.TwoDAManager?.datatables?.get('ammunitiontypes');
  if(!table) return undefined;
  return (
    table.getByID?.(ammoId) ||
    table.rows?.[ammoId] ||
    table.rows?.[String(ammoId)] ||
    undefined
  );
}

/**
 * hit aim: model node "impact", else position.z + 1.25.
 */
export function getProjectileImpactPosition(
  target: GameObject | undefined,
  out: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  if(!target){
    out.set(0, 0, 0);
    return out;
  }

  const model = (target as Creature).model as OdysseyModel3D | undefined;
  if(tryModelNodeWorldPos(model, ['impact'], out)){
    return out;
  }

  out.copy(target.position);
  out.z += PROJECTILE_IMPACT_Z_OFFSET;
  return out;
}

function getMuzzleHookPosition(
  creature: Creature,
  offHand: boolean,
  out: THREE.Vector3
): THREE.Vector3 {
  const hand = offHand ? creature.model?.lhand : creature.model?.rhand;
  const weapon = offHand ? creature.equipment?.LEFTHAND : creature.equipment?.RIGHTHAND;
  const weaponModel = weapon?.model as OdysseyModel3D | undefined;

  // : rbullet/lbullet on creature, else bullethook on equipped weapon
  if(offHand){
    if(tryModelNodeWorldPos(creature.model, ['lbullet', 'bullethook', 'bullethook0', 'gunhook0'], out)){
      return out;
    }
  }else if(tryModelNodeWorldPos(creature.model, ['rbullet', 'bullethook', 'bullethook0', 'gunhook0'], out)){
    return out;
  }

  if(tryModelNodeWorldPos(weaponModel, ['bullethook', 'bullethook0', 'gunhook0', 'rbullet', 'lbullet'], out)){
    return out;
  }

  if(hand && typeof hand.getWorldPosition === 'function'){
    hand.getWorldPosition(out);
    return out;
  }

  out.copy(creature.position);
  out.z += 1.2;
  return out;
}

function playShotSound(resRef: string, position: THREE.Vector3, creature: Creature){
  if(!resRef) return;
  const emitter = creature.audioEmitter;
  if(!emitter) return;
  emitter.setPosition(position.x, position.y, position.z);
  emitter.setPriorityGroupId?.(AudioPriorityGroup.COMBAT);
  emitter.playSoundFireAndForget(resRef);
}

/** projectile SetAnimation case 1 → travel01. */
export function playSpellProjectileTravelAnimation(model: OdysseyModel3D){
  if(model.playAnimation('travel01', true)){
    // Apply t=0 controllers immediately (travel01 length is often 0) so birthRate is live
    // before the first emitter tick.
    model.animationManager?.update?.(0);
    return;
  }
  if(model.playAnimation(1, true)){
    model.animationManager?.update?.(0);
    return;
  }
  try{ model.playAnimation('default', true); }catch(_e){ /* ignore */ }
}

/** projectile SetAnimation case 2 → impact01 (non-looping). */
function playImpactAnimation(model: OdysseyModel3D){
  if(model.playAnimation('impact01', false)){
    model.animationManager?.update?.(0);
    return;
  }
  if(model.playAnimation(2, false)){
    model.animationManager?.update?.(0);
    return;
  }
}

/** CreateMuzzleFlash plays "impact". */
function playMuzzleFlashAnimation(model: OdysseyModel3D){
  if(model.playAnimation('impact', true)){
    model.animationManager?.update?.(0);
    return;
  }
  try{ model.playAnimation('default', true); }catch(_e){ /* ignore */ }
}

/** @deprecated Use {@link playSpellProjectileTravelAnimation}. */
function playTravelAnimation(model: OdysseyModel3D){
  playSpellProjectileTravelAnimation(model);
}

/**
 * Traveling bolt instance — updated by Area like SpellCastInstance.
 */
export class CombatProjectile {
  owner: Creature;
  model: OdysseyModel3D | undefined;
  origin: THREE.Vector3 = new THREE.Vector3();
  target: THREE.Vector3 = new THREE.Vector3();
  durationMs: number = 1;
  elapsedMs: number = 0;
  completed: boolean = false;
  disposed: boolean = false;
  /** True while async MDL load is in flight — defer dispose until attach/fail. */
  modelPending: boolean = false;
  /** After late attach, keep emitters alive briefly so trail/timer can seed particles. */
  private holdRemainingMs: number = 0;
  /** Impact SFX resrefs from ammunitiontypes (played once on arrival). */
  impactSound0: string = '';
  impactSound1: string = '';
  private impactPlayed: boolean = false;

  constructor(owner: Creature){
    this.owner = owner;
  }

  flightT(): number {
    return Math.min(1, this.elapsedMs / Math.max(1, this.durationMs));
  }

  syncModelTransform(t?: number){
    if(!this.model) return;
    const u = t ?? this.flightT();
    this.model.position.lerpVectors(this.origin, this.target, u);
    _tmpDir.copy(this.target).sub(this.origin);
    if(_tmpDir.lengthSq() > 0.0001){
      this.model.lookAt(this.target);
    }
  }

  attachModel(model: OdysseyModel3D){
    this.modelPending = false;
    this.model = model;
    const t = this.flightT();
    this.syncModelTransform(t);
    // Matrix must be current before any emitter tick (Inherit/trail world samples).
    this.model.updateMatrixWorld(true);
    GameState.group.effects.add(model);
    if(t >= 1){
      this.beginImpactHold(120);
    }else{
      playTravelAnimation(model);
      // Seed emitters once with live birthRate controllers + current bolt matrix
      // (async attach can land mid-frame after area projectile update already ran).
      this.model.update?.(0);
    }
  }

  private beginImpactHold(ms: number){
    if(this.impactPlayed){
      this.holdRemainingMs = Math.max(this.holdRemainingMs, ms);
      return;
    }
    this.impactPlayed = true;
    if(this.model){
      playImpactAnimation(this.model);
    }
    const impactSound = Math.random() < 0.5
      ? (this.impactSound0 || this.impactSound1)
      : (this.impactSound1 || this.impactSound0);
    if(impactSound){
      playShotSound(impactSound, this.target, this.owner);
    }
    this.holdRemainingMs = Math.max(ms, 200);
  }

  update(delta: number = 0){
    if(this.disposed) return;

    if(this.holdRemainingMs > 0){
      if(this.model){
        this.syncModelTransform(1);
        this.model.updateMatrixWorld(true);
        this.model.update?.(delta);
      }
      this.holdRemainingMs -= delta * 1000;
      if(this.holdRemainingMs <= 0){
        this.completed = true;
        this.dispose();
      }
      return;
    }

    if(this.completed) return;

    this.elapsedMs += delta * 1000;
    const t = this.flightT();

    if(this.model){
      this.syncModelTransform(t);
      this.model.updateMatrixWorld(true);
      this.model.update?.(delta);
    }

    if(t >= 1){
      // Wait for pending async load so short flights are not silently skipped.
      if(this.modelPending && !this.model){
        return;
      }
      // SetAnimation(2) → impact01; hold so impact + trail can finish.
      if(this.model){
        this.beginImpactHold(120);
        return;
      }
      this.completed = true;
      this.dispose();
    }
  }

  dispose(){
    if(this.disposed) return;
    this.disposed = true;
    this.completed = true;
    this.modelPending = false;
    this.holdRemainingMs = 0;
    if(this.model){
      try{
        if(this.model.parent) this.model.parent.remove(this.model);
        this.model.dispose();
      }catch(_e){ /* ignore */ }
      this.model = undefined;
    }
  }
}

/**
 * Spawn bolt + play ShotSound at muzzle time
 * (SafeProjectile projectile message handler).
 */
export function spawnCombatProjectile(
  owner: Creature,
  attack: CombatAttackData
): CombatProjectile | undefined {
  if(!owner || !attack?.rangedAttack) return undefined;

  const weapon = (attack.attackWeapon ||
    (attack.weaponAttackType === 2 ? owner.equipment?.LEFTHAND : owner.equipment?.RIGHTHAND)
  ) as Item | undefined;

  const ammo = getAmmunitionTypeRow(weapon);
  if(!ammo) return undefined;

  const modelResRef = pickRowResRef(ammo as any, 'model0', 'model', 'model1');
  const shotSound = Math.random() < 0.5
    ? pickRowResRef(ammo as any, 'shotsound0', 'shotsound1')
    : pickRowResRef(ammo as any, 'shotsound1', 'shotsound0');

  const offHand = attack.weaponAttackType === 2;
  getMuzzleHookPosition(owner, offHand, _tmpOrigin);

  _tmpTarget.set(
    attack.rangedTargetX || 0,
    attack.rangedTargetY || 0,
    attack.rangedTargetZ || 0
  );
  // If target coords unset, aim at react impact height (z+1.25)
  if(_tmpTarget.lengthSq() < 0.0001 && attack.reactObject){
    getProjectileImpactPosition(attack.reactObject, _tmpTarget);
  }

  playShotSound(shotSound, _tmpOrigin, owner);

  const projectile = new CombatProjectile(owner);
  projectile.origin.copy(_tmpOrigin);
  projectile.target.copy(_tmpTarget);
  projectile.durationMs = Math.max(1, attack.reaxnDelay || 1);
  projectile.impactSound0 = pickRowResRef(ammo as any, 'impactsound0');
  projectile.impactSound1 = pickRowResRef(ammo as any, 'impactsound1');

  const area = owner.area;
  if(area?.attachCombatProjectile){
    area.attachCombatProjectile(projectile);
  }

  if(modelResRef){
    projectile.modelPending = true;
    MDLLoader.loader.load(modelResRef).then((mdl: OdysseyModel) => {
      if(projectile.disposed){
        projectile.modelPending = false;
        return;
      }
      OdysseyModel3D.FromMDL(mdl, { context: owner.context || GameState }).then(async (model: OdysseyModel3D) => {
        if(projectile.disposed){
          projectile.modelPending = false;
          try{ model.dispose(); }catch(_e){ /* ignore */ }
          return;
        }
        // Emitters enqueue Fx_laser_* during FromMDL — wait so additive samples aren't black/empty.
        try{ await TextureLoader.LoadQueue(); }catch(_e){ /* ignore */ }
        if(projectile.disposed){
          projectile.modelPending = false;
          try{ model.dispose(); }catch(_e){ /* ignore */ }
          return;
        }
        projectile.attachModel(model);
      }).catch(() => {
        projectile.modelPending = false;
      });
    }).catch(() => {
      projectile.modelPending = false;
    });
  }

  // Optional muzzle flash VFX (fire-and-forget) — plays "impact"
  const muzzle = pickRowResRef(ammo as any, 'muzzleflash');
  if(muzzle){
    const flashOrigin = _tmpOrigin.clone();
    MDLLoader.loader.load(muzzle).then((mdl: OdysseyModel) => {
      OdysseyModel3D.FromMDL(mdl, { context: owner.context || GameState }).then(async (flash: OdysseyModel3D) => {
        try{ await TextureLoader.LoadQueue(); }catch(_e){ /* ignore */ }
        flash.position.copy(flashOrigin);
        GameState.group.effects.add(flash);
        playMuzzleFlashAnimation(flash);
        setTimeout(() => {
          try{
            if(flash.parent) flash.parent.remove(flash);
            flash.dispose();
          }catch(_e){ /* ignore */ }
        }, 400);
      }).catch(() => {});
    }).catch(() => {});
  }

  return projectile;
}

/**
 * Legacy helper used by Item.castAmmunitionAtTarget.
 */
export function castAmmunitionProjectile(
  caster: GameObject,
  target: GameObject,
  weapon: Item
): void {
  if(!caster || !weapon) return;
  const creature = caster as Creature;
  if(!creature.combatRound && !creature.model) return;

  const impact = getProjectileImpactPosition(target);
  const fake = {
    rangedAttack: true,
    attackWeapon: weapon,
    weaponAttackType: 1,
    reaxnDelay: 0,
    rangedTargetX: impact.x,
    rangedTargetY: impact.y,
    rangedTargetZ: impact.z,
    reactObject: target,
  } as CombatAttackData;

  if(target && caster.position){
    const dist = caster.position.distanceTo(target.position);
    fake.reaxnDelay = Math.max(1, Math.floor(dist * (1000 / 42)));
  }else{
    fake.reaxnDelay = 200;
  }

  spawnCombatProjectile(creature, fake);
}
