import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { clearLineOfSight } from "@/engine/pathfinding/clear-line-of-sight";
import { BitWise } from "@/utility/BitWise";
import * as THREE from "three";

/**
 * Retail weapondischarge.2da helpers —
 * GetWeaponDischargeShots/Hits/Time ,
 * ResolveRangedHit/Miss travel delay .
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file weapon-discharge.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** Retail reaxn_delay ≈ distance * (1000/42) ms. */
export const PROJECTILE_TRAVEL_MS_PER_UNIT = 1000 / 42;

export type WeaponDischargeInfo = {
  rowLabel: string;
  shots: number;
  hits: number;
  switchMask: string;
  /** Per-shot muzzle times in ms (shot1..shotN). */
  shotTimes: number[];
};

/**
 * Retail ResolveRangedAttack packs every discharge into sub_attacks;
 * shots without an AttackList roll are visual-only (ResolveRangedMiss).
 */
export type PendingDischargeVisual = {
  /** ms until muzzle spawn (counts down). */
  muzzleRemainingMs: number;
  /** Projectile flight duration after muzzle. */
  travelMs: number;
  weaponAttackType: number;
  attackWeapon?: ModuleItem;
  rangedTargetX: number;
  rangedTargetY: number;
  rangedTargetZ: number;
  reactObject?: ModuleObject;
};

function parseIntCell(raw: unknown, fallback: number = 0): number {
  if(raw === null || raw === undefined || raw === '****') return fallback;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Map combat animation name (e.g. b5a1) → weapondischarge row label.
 * Retail GetWeaponDischargeRow:
 * - if weapondischarge.Droid ≠ 0 → droiddischarge[appearance.race][label] + "_" + label
 * - else if appearance_type == 3 → "3_" + label
 */
export function getWeaponDischargeRowLabel(
  creature: ModuleCreature,
  animName: string
): string | undefined {
  if(!animName) return undefined;

  const animRow = OdysseyModelAnimationGetRow(animName);
  if(!animRow) return undefined;

  const baseLabel = String(animRow.__rowlabel ?? animRow.__index ?? '');
  if(!baseLabel) return undefined;

  const table = GameState.TwoDAManager?.datatables?.get('weapondischarge');
  if(!table) return baseLabel;

  const baseRow = findDischargeRow(table, baseLabel);
  const droidFlag = baseRow ? parseIntCell(baseRow.droid ?? baseRow.Droid, 0) : 0;

  if(droidFlag !== 0){
    const race = String(creature?.getAppearance?.()?.race ?? '').replace(/\0[\s\S]*$/g, '').trim();
    if(race && race !== '****'){
      const prefix = getDroidDischargePrefix(race, baseLabel);
      if(prefix){
        return `${prefix}_${baseLabel}`;
      }
    }
  }else if(creature?.appearance === 3){
    const prefixed = `3_${baseLabel}`;
    if(findDischargeRow(table, prefixed)){
      return prefixed;
    }
  }

  return baseLabel;
}

/** droiddischarge.2da: row = appearance.race, column = anim row label → numeric prefix. */
function getDroidDischargePrefix(race: string, animLabel: string): string | undefined {
  const table = GameState.TwoDAManager?.datatables?.get('droiddischarge');
  if(!table) return undefined;

  let row = table.getByID?.(race);
  if(!row){
    for(let i = 0, len = table.RowCount || 0; i < len; i++){
      const r = table.rows[i];
      if(r && String(r.__rowlabel).toLowerCase() === race.toLowerCase()){
        row = r;
        break;
      }
    }
  }
  if(!row) return undefined;

  const raw = row[animLabel] ?? row[String(animLabel)];
  if(raw === null || raw === undefined || raw === '****') return undefined;
  const prefix = String(raw).trim();
  return prefix || undefined;
}

function OdysseyModelAnimationGetRow(name: string): any {
  const animations2DA = GameState.TwoDAManager?.datatables?.get('animations');
  if(!animations2DA) return undefined;
  for(let i = 0, len = animations2DA.RowCount; i < len; i++){
    const row = animations2DA.rows[i];
    if(row?.name?.toLowerCase?.() === name.toLowerCase()){
      return row;
    }
  }
  return undefined;
}

function findDischargeRow(table: any, label: string): any {
  if(!table) return undefined;
  const byId = table.getByID?.(label) || table.getByID?.(Number(label));
  if(byId) return byId;
  for(let i = 0, len = table.RowCount || 0; i < len; i++){
    const row = table.rows[i];
    if(row && String(row.__rowlabel) === String(label)){
      return row;
    }
  }
  return undefined;
}

export function getWeaponDischargeInfo(
  creature: ModuleCreature,
  animName: string
): WeaponDischargeInfo | undefined {
  const rowLabel = getWeaponDischargeRowLabel(creature, animName);
  if(!rowLabel) return undefined;

  const table = GameState.TwoDAManager?.datatables?.get('weapondischarge');
  const row = findDischargeRow(table, rowLabel);
  if(!row) return undefined;

  const shots = Math.max(0, parseIntCell(row.shots ?? row.Shots, 0));
  const hits = Math.max(0, parseIntCell(row.hits ?? row.Hits, 0));
  const switchMask = String(row.switchmask ?? row.SwitchMask ?? '');
  const shotTimes: number[] = [];
  for(let i = 1; i <= Math.max(shots, 12); i++){
    const key = `shot${i}`;
    const raw = row[key] ?? row[`Shot${i}`];
    if(raw === null || raw === undefined || raw === '****'){
      if(i > shots) break;
      shotTimes.push(0);
      continue;
    }
    shotTimes.push(parseIntCell(raw, 0));
  }

  if(shots <= 0){
    return undefined;
  }

  return { rowLabel, shots, hits, switchMask, shotTimes };
}

/**
 * Retail ResolveRangedAttack shot→attack assignment:
 * for each remaining discharge slot, rand() % remainingShots < remainingAttacks.
 */
export function pickAttackShotIndices(shots: number, attackCount: number): number[] {
  const indices: number[] = [];
  let remainingShots = Math.max(0, shots);
  let remainingAttacks = Math.max(0, attackCount);
  for(let i = 0; i < shots; i++){
    if(remainingShots <= 0) break;
    if(remainingAttacks > 0 && (Math.floor(Math.random() * remainingShots) < remainingAttacks)){
      remainingAttacks--;
      indices.push(i);
    }
    remainingShots--;
  }
  return indices;
}

/** Retail ResolveRangedHit / Miss: reaxn_delay = |Δpos| * 23.809525 */
export function getProjectileTravelDelayMs(
  from: THREE.Vector3,
  to: THREE.Vector3
): number {
  const dist = from.distanceTo(to);
  return Math.max(0, Math.floor(dist * PROJECTILE_TRAVEL_MS_PER_UNIT));
}

/**
 * ResolveProjectileMissLocation
 * lateral miss beside target (perspace * 2/3), optional wide scatter when
 * attack_result == 10, then eye→far ray with ClearLineOfSight.
 */
export function getProjectileMissLocation(
  attacker: ModuleObject,
  target: ModuleObject,
  attackResult?: number
): THREE.Vector3 {
  if(!target){
    return attacker.position.clone();
  }

  // Retail defaults when target is not a creature
  let lateralScale = 0.40002003;
  let scatterMul = 1.0;

  if(BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)){
    lateralScale = getPathPersonalSpace(target) * 0.6667;
    // attack_result == '\n' (10) → sum of three rand()%3
    if((attackResult | 0) === 10){
      scatterMul =
        (Math.floor(Math.random() * 3)) +
        (Math.floor(Math.random() * 3)) +
        (Math.floor(Math.random() * 3));
    }
  }

  // Direction target → attacker, then cross(up) for a side miss
  const toAttacker = new THREE.Vector3().subVectors(attacker.position, target.position);
  const distSq = toAttacker.lengthSq();
  if(distSq > 1e-8){
    toAttacker.normalize();
  }else{
    toAttacker.set(1, 0, 0);
  }
  const perp = new THREE.Vector3().crossVectors(toAttacker, new THREE.Vector3(0, 0, 1));
  // Retail: flip when (rand & 1) != 0
  if((Math.floor(Math.random() * 2) & 1) !== 0){
    perp.negate();
  }
  perp.multiplyScalar(scatterMul);

  const missBeside = new THREE.Vector3(
    target.position.x + perp.x * lateralScale,
    target.position.y + perp.y * lateralScale,
    target.position.z + perp.z * lateralScale
  );

  // Z variance from distance² * 0.015
  const zRange = distSq * 0.015;
  const eye = new THREE.Vector3(
    attacker.position.x,
    attacker.position.y,
    attacker.position.z + 1.5
  );
  const dir = new THREE.Vector3(
    missBeside.x - eye.x,
    missBeside.y - eye.y,
    ((1.5 - zRange * (2 / 3)) + Math.random() * zRange * 0.75 + missBeside.z) - eye.z
  );
  if(dir.lengthSq() > 1e-8){
    dir.normalize();
  }else{
    dir.set(px, py, 0);
  }
  const far = eye.clone().addScaledVector(dir, 1000);

  const hitPoint = new THREE.Vector3();
  const area = attacker.area;
  if(area && typeof clearLineOfSight === 'function'){
    const clear = clearLineOfSight(area, eye, far, {
      ignoreSource: attacker,
      ignoreObject: target,
      eyeHeight: 0,
      hitPoint,
    });
    if(clear){
      return far;
    }
    if(hitPoint.lengthSq() > 0){
      return hitPoint;
    }
  }

  // No LOS helper / no hit — use the beside-target miss point
  return missBeside;
}

/** SwitchMask digit for discharge hand (0/1) at shot index. */
export function getWeaponDischargeHand(switchMask: string, shotIndex: number): number {
  if(!switchMask || switchMask === '****') return 0;
  const ch = switchMask.charAt(shotIndex);
  const n = parseInt(ch, 10);
  return Number.isFinite(n) ? n : 0;
}
