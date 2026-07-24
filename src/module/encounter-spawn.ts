import * as THREE from "three";
import { calculatePointsFromCR } from "@/module/encounter-cr";
import { EncounterCreatureEntry } from "@/module/EncounterCreatureEntry";
import { EncounterSpawnEntry } from "@/module/EncounterSpawnEntry";
import type { ModuleEncounter } from "@/module/ModuleEncounter";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { ResourceLoader } from "@/loaders";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { GameState } from "@/GameState";
import {
  computeNonVisibleLocation,
  computeSafeLocation,
} from "@/engine/pathfinding/compute-safe-location";
import type { OdysseyModel3D } from "@/three/odyssey";

/**
 * Encounter spawn helpers — retail CSWSEncounter:
 * SpawnIfAppropriate @ 00593be0, CalculateSpawnPool @ 005931d0,
 * BuildSpawnList @ 005935d0, BuildInitialSpawnList @ 00590f80,
 * AddCreaturesToSpawnList @ 00592280, PadOutCreatureCount @ 00590b10,
 * SpawnCreatureFromSpawnList @ 00591ca0 / 00591e70,
 * TallyEnemyRadiusPoints @ 00591af0.
 *
 * Placement uses ComputeSafeLocation @ 004be860 / ComputeNonVisibleLocation @ 004bee30.
 *
 * @file encounter-spawn.ts
 */

const TALLY_RADIUS = 30.0;

function creaturePoints(entry: EncounterCreatureEntry): number {
  return calculatePointsFromCR(entry.cr || 0);
}

/**
 * Retail TallyEnemyRadiusPoints — sum CR-points of hostiles near lastEntered (±30).
 */
export function tallyEnemyRadiusPoints(encounter: ModuleEncounter): number {
  const area = encounter.area || GameState.module?.area;
  const last = encounter.lastEntered as ModuleCreature | undefined;
  if(!area || !last?.position){
    return 0;
  }

  const levelOf = (c: ModuleCreature): number => {
    if(typeof c.getTotalClassLevel === 'function'){
      return c.getTotalClassLevel() | 0;
    }
    if(Array.isArray(c.classes)){
      return c.classes.reduce((s, cl) => s + (cl.level || 0), 0);
    }
    return 0;
  };

  let points = 0;
  const origin = last.position;
  const creatures = area.creatures || [];
  for(let i = 0; i < creatures.length; i++){
    const c = creatures[i];
    if(!c || c.isDead?.()) continue;
    const dx = c.position.x - origin.x;
    const dy = c.position.y - origin.y;
    if(Math.abs(dx) > TALLY_RADIUS || Math.abs(dy) > TALLY_RADIUS) continue;
    if(dx * dx + dy * dy > TALLY_RADIUS * TALLY_RADIUS) continue;

    // Retail: reputation hostile to the encounter object
    if(!encounter.isHostile?.(c)) continue;

    let level = levelOf(c);
    // Retail halves when field377_0x9d4 == 0 (cached is_pc from PostProcess)
    if(!c.isPC){
      level = Math.floor(level / 2);
    }
    points += calculatePointsFromCR(level);
  }

  return points;
}

/**
 * Retail CalculateSpawnPool @ 005931d0.
 * @param challengeRatingHint -1 = tally radius; else points from that CR
 */
export function calculateSpawnPool(encounter: ModuleEncounter, challengeRatingHint: number = -1){
  if(challengeRatingHint === -1){
    encounter.areaPoints = tallyEnemyRadiusPoints(encounter);
  }else{
    encounter.areaPoints = calculatePointsFromCR(challengeRatingHint);
  }

  const areaPoints = Number(encounter.areaPoints) || 0;
  if(areaPoints === 0) return;

  // i = round(log2(area_points * 0.25) / log2(1.5)) + difficulty
  const logTerm = Math.log2(areaPoints * 0.25) / Math.log2(1.5);
  const adjusted = Math.trunc(logTerm + 0.5) + (encounter.difficulty | 0);
  const add = calculatePointsFromCR(adjusted - 1);
  encounter.spawnPoolRecovered = (Number(encounter.spawnPoolRecovered) || 0) + add;
}

type WaveCreature = EncounterCreatureEntry & { usedThisWave?: boolean; pickMark?: boolean };

function pushSpawnEntry(out: EncounterSpawnEntry[], c: EncounterCreatureEntry, pts: number){
  const entry = new EncounterSpawnEntry();
  entry.spawnResref = c.resref;
  entry.spawnCR = c.cr;
  entry.poolPoints = pts;
  out.push(entry);
}

/**
 * Retail PadOutCreatureCount @ 00590b10 — fill to (rec − spawned) by repeatedly
 * selecting the highest CR-points band among eligible creatures, then random within band.
 */
function padOutCreatureCount(
  list: WaveCreature[],
  out: EncounterSpawnEntry[],
  need: number,
  slotsLeft: number
){
  while(out.length < need && out.length < slotsLeft){
    let maxPts = -1;
    for(let i = list.length - 1; i >= 0; i--){
      const c = list[i];
      if(!c.resref) continue;
      if(c.singleSpawn && c.usedThisWave) continue;
      const pts = creaturePoints(c);
      if(pts > maxPts) maxPts = pts;
    }
    if(maxPts < 0) break;

    const band: number[] = [];
    let singleInBand = 0;
    for(let i = 0; i < list.length; i++){
      const c = list[i];
      if(creaturePoints(c) !== maxPts) continue;
      c.pickMark = false;
      band.push(i);
      if(c.singleSpawn) singleInBand++;
    }
    if(!band.length) break;

    let marked = 0;
    let safety = band.length * 8;
    while(out.length < need && out.length < slotsLeft && safety-- > 0){
      const pick = band[(Math.random() * band.length) | 0];
      const c = list[pick];
      if(!c.singleSpawn || !c.usedThisWave){
        pushSpawnEntry(out, c, maxPts);
        c.usedThisWave = true;
      }
      if(!c.pickMark){
        c.pickMark = true;
        marked++;
      }
      // Retail exits when every single-spawn in the band has been tried
      if(band.length === singleInBand && marked === singleInBand) break;
    }
    if(marked === 0) break;
  }
}

/**
 * Retail AddCreaturesToSpawnList @ 00592280 —
 * Truncate spawn list from `atIndex`, then refill with creatures cheaper than the seed CR budget.
 */
function addCreaturesToSpawnList(
  encounter: ModuleEncounter,
  list: WaveCreature[],
  out: EncounterSpawnEntry[],
  atIndex: number,
  seed: EncounterSpawnEntry,
  targetCount: number,
){
  const seedPts = calculatePointsFromCR(seed.spawnCR || 0);
  const areaPts = Number(encounter.areaPoints) || 0;
  // Retail: skip when seed points == field38_0x2d0 (area points)
  if(seedPts === areaPts) return;

  if(out.length === 1){
    out.length = 0;
  }else if(atIndex >= 0 && atIndex < out.length){
    out.splice(atIndex);
  }

  let remaining = seedPts;
  const threshold = remaining - 0.001;
  const maxCreatures = Math.max(1, encounter.maxCreatures | 0);

  for(let i = 0; i < list.length; i++){
    if(out.length >= targetCount) return;

    const c = list[i];
    if(!c.resref) continue;
    const pts = creaturePoints(c);
    if(!(pts < remaining)) continue;

    while(pts < remaining){
      // Retail: break when pts > remaining-0.001, at max, or single-spawn used
      if(pts > threshold) break;
      if(out.length >= maxCreatures) break;
      if(c.singleSpawn && c.usedThisWave) break;

      pushSpawnEntry(out, c, pts);
      c.usedThisWave = true;
      remaining -= pts;
      if(!(pts < remaining)) break;
    }
  }
}

/**
 * BuildInitialSpawnList @ 00590f80 + AddCreaturesToSpawnList @ 00592280
 * + PadOutCreatureCount @ 00590b10.
 */
export function buildSpawnList(encounter: ModuleEncounter){
  const maxCreatures = Math.max(1, encounter.maxCreatures | 0);
  const recCreatures = Math.max(1, encounter.recCreatures | 0);
  const already = encounter.numberSpawned | 0;
  const slotsLeft = Math.max(0, maxCreatures - already);
  if(slotsLeft <= 0) return;

  // Retail BuildSpawnList uses recovered − active; no underflow pad when recovered is 0
  let budget = (Number(encounter.spawnPoolRecovered) || 0) - (Number(encounter.spawnPoolActive) || 0);
  if(budget < 0) budget = 0;

  const soft = budget + budget * 0.1;
  const targetCount = Math.min(slotsLeft, Math.max(0, recCreatures - already));
  const list = (encounter.creatureList || []) as WaveCreature[];
  const recovered = Number(encounter.spawnPoolRecovered) || 0;
  const areaPts = Number(encounter.areaPoints) || 0;

  // Reset per-wave singleSpawn markers (retail field3_0x18)
  for(const c of list){
    c.usedThisWave = false;
    c.pickMark = false;
  }

  const out: EncounterSpawnEntry[] = [];

  // BuildInitialSpawnList: walk creature table in order
  for(let i = 0; i < list.length; i++){
    if(out.length >= slotsLeft) break;
    if(budget <= 0) break;

    const c = list[i];
    if(!c.resref) continue;
    const pts = creaturePoints(c);

    // Force unused SingleSpawn once (ignores soft budget gate)
    if(c.singleSpawn && !c.usedThisWave){
      pushSpawnEntry(out, c, pts);
      c.usedThisWave = true;
      budget -= pts;
      continue;
    }

    if(!(c.cr) || pts > soft) continue;

    // Same-CR band: random among contiguous equal-CR peers (retail)
    const next = list[i + 1];
    if(next && Number(next.cr) === Number(c.cr)){
      const bandStart = i;
      let bandEnd = i;
      let singleInBand = c.singleSpawn ? 1 : 0;
      while(bandEnd + 1 < list.length && Number(list[bandEnd + 1].cr) === Number(c.cr)){
        bandEnd++;
        list[bandEnd].pickMark = false;
        if(list[bandEnd].singleSpawn) singleInBand++;
      }
      c.pickMark = false;
      const bandLen = bandEnd - bandStart + 1;
      let marked = 0;
      let safety = bandLen * 8;
      while(out.length < slotsLeft && safety-- > 0){
        const pick = bandStart + ((Math.random() * bandLen) | 0);
        const pickC = list[pick];
        const pickPts = creaturePoints(pickC);
        if((!pickC.singleSpawn || !pickC.usedThisWave) && pickPts <= soft){
          pushSpawnEntry(out, pickC, pickPts);
          pickC.usedThisWave = true;
          budget -= pickPts;
        }
        if(!pickC.pickMark){
          pickC.pickMark = true;
          marked++;
        }
        if((bandLen === singleInBand && marked === bandLen) || budget + (budget * 0.1) < pickPts){
          break;
        }
      }
      i = bandEnd;
      continue;
    }

    // Unique CR: keep adding while points fit soft budget
    if(pts <= soft && (!c.singleSpawn || !c.usedThisWave)){
      do {
        if(out.length >= slotsLeft) break;
        if(c.singleSpawn && c.usedThisWave) break;
        pushSpawnEntry(out, c, pts);
        c.usedThisWave = true;
        budget -= pts;
      } while(pts <= budget + budget * 0.1 && out.length < slotsLeft && !c.singleSpawn);
    }
  }

  // AddCreaturesToSpawnList pass — when under recommended and pool recovered > area points
  if(out.length < targetCount && areaPts < recovered){
    let idx = out.length - 1;
    while(idx >= 0 && out.length < targetCount){
      const seed = out[idx];
      if(!seed) break;
      addCreaturesToSpawnList(encounter, list, out, idx, seed, targetCount);
      idx--;
    }
  }

  // PadOutCreatureCount — highest CR-points remaining (not cheapest)
  if(out.length < targetCount){
    padOutCreatureCount(list, out, targetCount, slotsLeft);
  }

  // Retail: if recovered < area points, zero recovered after build
  if(recovered < areaPts){
    encounter.spawnPoolRecovered = 0;
  }

  encounter.spawnList = out;
}

/**
 * Retail SpawnIfAppropriate @ 00593be0 —
 * only builds when spawnPoolRecovered (field40_0x2d8) > 0.
 */
export function spawnIfAppropriate(encounter: ModuleEncounter){
  if(!encounter.active || encounter.started === 1) return;
  if(!encounter.creatureList?.length) return;

  const last = encounter.lastEntered as ModuleCreature | undefined;
  if(encounter.playerOnly){
    if(!last || (!last.isPC && !last.isPartyMember?.())) return;
  }

  calculateSpawnPool(encounter, -1);
  // Retail: if (0.0 < field40_0x2d8) BuildSpawnList
  if((Number(encounter.spawnPoolRecovered) || 0) > 0){
    buildSpawnList(encounter);
    if(encounter.spawnList.length > 0){
      encounter.started = 1;
    }
  }
}

const NONVISIBLE_SENTINEL = -1;

/**
 * Retail SpawnCreatureFromSpawnList placement @ 00591e70.
 * @returns undefined when NonVisible returns (−1,−1,−1) — abort spawn (retry next tick).
 */
export function pickSpawnPosition(
  encounter: ModuleEncounter
): { pos: THREE.Vector3; facing: number } | undefined {
  const area = encounter.area || GameState.module?.area;
  const last = encounter.lastEntered as ModuleCreature | undefined;
  const result = {
    pos: encounter.position.clone(),
    facing: 0,
  };

  const points = encounter.spawnPointList || [];
  let usedSpawnPoint = false;
  if(points.length > 0){
    let bestIdx = 0;
    let bestDistSq = -1;
    const ox = last?.position?.x ?? encounter.position.x;
    const oy = last?.position?.y ?? encounter.position.y;
    const oz = last?.position?.z ?? encounter.position.z;
    for(let i = 0; i < points.length; i++){
      const p = points[i].position;
      const dx = p.x - ox;
      const dy = p.y - oy;
      const dz = p.z - oz;
      const d2 = dx * dx + dy * dy + dz * dz;
      // Retail picks farthest spawn point from lastEntered
      if(d2 > bestDistSq){
        bestDistSq = d2;
        bestIdx = i;
      }
    }
    const sp = points[bestIdx];
    result.pos.copy(sp.position);
    const orient = sp.orientation || 0;
    result.facing = (Math.PI / 2) - orient;
    usedSpawnPoint = true;
  }

  const scratch = new THREE.Vector3();
  if(area && usedSpawnPoint){
    // Retail: ComputeSafeLocation(spawnPoint, 20) — on success use it; on fail fall through
    if(computeSafeLocation(area, result.pos, scratch, { radius: 20 })){
      result.pos.copy(scratch);
      return result;
    }
  }

  if(area){
    // Retail: ComputeNonVisibleLocation(encounter.pos, …, 40)
    if(computeNonVisibleLocation(area, encounter.position, scratch, { radius: 40 })){
      result.pos.copy(scratch);
      return result;
    }
    // Retail abort when out is (−1,−1,−1)
    if(
      scratch.x === NONVISIBLE_SENTINEL &&
      scratch.y === NONVISIBLE_SENTINEL &&
      scratch.z === NONVISIBLE_SENTINEL
    ){
      return undefined;
    }
    // Partial NonVisible write (non-sentinel) — retail still places there
    if(Number.isFinite(scratch.x) && scratch.x !== NONVISIBLE_SENTINEL){
      result.pos.copy(scratch);
    }
  }

  return result;
}

/**
 * Retail SpawnCreatureFromSpawnList — spawn head of queue (one per AI tick).
 */
export function spawnCreatureFromSpawnList(encounter: ModuleEncounter): ModuleCreature | undefined {
  if(!encounter.spawnList?.length) return undefined;
  const area = encounter.area || GameState.module?.area;
  if(!area) return undefined;

  const entry = encounter.spawnList[0];
  const resref = (entry.spawnResref || '').toLowerCase().replace(/\.utc$/i, '');
  if(!resref){
    encounter.spawnList.shift();
    return undefined;
  }

  const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], resref);
  if(!buffer){
    console.warn('Encounter spawn: failed to load', resref);
    encounter.spawnList.shift();
    return undefined;
  }

  const placement = pickSpawnPosition(encounter);
  // Retail: NonVisible (−1,−1,−1) destroys creature and returns without dequeue (retry)
  if(!placement){
    return undefined;
  }
  const { pos, facing } = placement;
  const creature = new GameState.Module.ModuleArea.ModuleCreature(new GFFObject(buffer));
  creature.load();
  creature.clearAllActions?.();
  creature.position.copy(pos);
  creature.setFacing?.(facing, true);
  // Retail field377_0x9d4 = 0 at spawn (mirrors is_pc cache; NPCs already 0)
  creature.isPC = 0;

  const poolCost =
    entry.poolPoints ||
    calculatePointsFromCR(entry.spawnCR || creature.challengeRating || 0);

  // registerSpawnedCreature increments numberSpawned + pool; mirror retail then dequeue
  encounter.registerSpawnedCreature(creature, poolCost);
  encounter.spawnPoolRecovered = Math.max(
    0,
    (Number(encounter.spawnPoolRecovered) || 0) - poolCost
  );
  encounter.spawnList.shift();

  GameState.ModuleObjectManager.AddObjectById(creature);
  area.attachObject(creature);
  void creature.loadModel?.().then((model: OdysseyModel3D) => {
    if(!model) return;
    model.userData.moduleObject = creature;
    model.hasCollision = true;
    model.name = creature.getTag?.() || model.name;
    GameState.group?.creatures?.add(creature.container);
    creature.getCurrentRoom?.();
    creature.onSpawn?.();
  });

  return creature;
}
