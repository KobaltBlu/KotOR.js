import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import * as THREE from "three";

/**
 * Retail weapondischarge.2da helpers —
 * GetWeaponDischargeShots/Hits/Time @ 005b5230 / 005b52e0 / 005b5390,
 * ResolveRangedHit/Miss travel delay @ 005b6db0 / 005b6e90.
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
 * Retail GetWeaponDischargeRow @ 005b4fb0:
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
 * Simplified ResolveProjectileMissLocation @ 005b4aa0 —
 * lateral offset by ~2/3 target perspace, random side.
 */
export function getProjectileMissLocation(
  attacker: ModuleObject,
  target: ModuleObject
): THREE.Vector3 {
  const origin = target.position.clone();
  const dx = attacker.position.x - target.position.x;
  const dy = attacker.position.y - target.position.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular in XY
  let px = -dy / len;
  let py = dx / len;
  if(Math.random() < 0.5){
    px = -px;
    py = -py;
  }
  const scale = getPathPersonalSpace(target as any) * 0.6667;
  origin.x += px * scale;
  origin.y += py * scale;
  origin.z += 0.5 + Math.random() * 0.5;
  return origin;
}

/** SwitchMask digit for discharge hand (0/1) at shot index. */
export function getWeaponDischargeHand(switchMask: string, shotIndex: number): number {
  if(!switchMask || switchMask === '****') return 0;
  const ch = switchMask.charAt(shotIndex);
  const n = parseInt(ch, 10);
  return Number.isFinite(n) ? n : 0;
}
