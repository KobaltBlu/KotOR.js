import * as THREE from "three";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GameState } from "@engine/runtime/GameState";
import { NWScript } from "@engine/nwscript/NWScript";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScriptEvent } from "@engine/nwscript/events";
import { GFFField } from "@core/resource/GFFField";
import { GFFObject } from "@core/resource/GFFObject";
import { GFFStruct } from "@core/resource/GFFStruct";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { OdysseyFace3 } from "@engine/render/three/odyssey";
import { ConfigClient } from "@core/filesystem/ConfigClient";
import { ResourceLoader } from "@engine/loaders";
// import { GameObjectManager, PartyManager, FactionManager } from "@engine/managers";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { GameObject } from "@engine/module/GameObject";
import { EncounterCreatureEntry } from "@engine/module/EncounterCreatureEntry";
import { EncounterSpawnPointEntry } from "@engine/module/EncounterSpawnPointEntry";
import { EncounterSpawnEntry } from "@engine/module/EncounterSpawnEntry";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import type { Creature } from "@engine/module/Creature";
import { findHiddenWalkLocation, findOpenWalkLocation } from "@engine/pathfinding/open-walk-location";
import type { OdysseyModel3D } from "@engine/render/three/odyssey";

/**
 * CalculatePointsFromCR.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * (formerly encounter-cr.ts)
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/**
 * Convert challenge rating to encounter spawn-pool points.
 * Fractional (0,1): fractionalcr.2da min ladder → 1.0 / 1.5^-1…^-4.
 * Else: 1.5^CR (uses powerLookUp table for CR∈[0,50)).
 */
function calculatePointsFromCR(challengeRating: number): number {
  const cr = Number(challengeRating);
  if(!Number.isFinite(cr)){
    return 0;
  }

  if(cr > 0 && cr < 1){
    const table = GameState.TwoDAManager?.datatables?.get('fractionalcr');
    const mins: number[] = [];
    if(table){
      for(let i = 0, len = table.RowCount || 0; i < len; i++){
        const row = table.rows[i];
        const min = parseFloat(String(row?.min ?? row?.Min ?? ''));
        if(Number.isFinite(min)) mins.push(min);
      }
    }
    if(!mins.length){
      mins.push(0.4, 0.3, 0.2, 0.15, -99999);
    }
    // : first min where min <= cr wins
    if(mins[0] !== undefined && mins[0] <= cr) return 1.0;
    if(mins[1] !== undefined && mins[1] <= cr) return Math.pow(1.5, -1);
    if(mins[2] !== undefined && mins[2] <= cr) return Math.pow(1.5, -2);
    if(mins[3] !== undefined && mins[3] <= cr) return Math.pow(1.5, -3);
    return Math.pow(1.5, -4);
  }

  if(cr < 0){
    return 0;
  }

  return Math.pow(1.5, cr);
}

/**
 * Encounter spawn helpers — :
 * SpawnIfAppropriate, CalculateSpawnPool,
 * BuildSpawnList, BuildInitialSpawnList,
 * AddCreaturesToSpawnList, PadOutCreatureCount,
 * SpawnCreatureFromSpawnList,
 * TallyEnemyRadiusPoints.
 *
 * Placement uses find safe location / find non-visible location.
 *
 * (formerly encounter-spawn.ts)
 */

const TALLY_RADIUS = 30.0;

function creaturePoints(entry: EncounterCreatureEntry): number {
  return calculatePointsFromCR(entry.cr || 0);
}

/**
 * TallyEnemyRadiusPoints — sum CR-points of hostiles near lastEntered (±30).
 */
function tallyEnemyRadiusPoints(encounter: Encounter): number {
  const area = encounter.area || GameState.module?.area;
  const last = encounter.lastEntered as Creature | undefined;
  if(!area || !last?.position){
    return 0;
  }

  const levelOf = (c: Creature): number => {
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

    // : reputation hostile to the encounter object
    if(!encounter.isHostile?.(c)) continue;

    let level = levelOf(c);
    // halves when == 0 (cached is_pc from PostProcess)
    if(!c.isPC){
      level = Math.floor(level / 2);
    }
    points += calculatePointsFromCR(level);
  }

  return points;
}

/**
 * CalculateSpawnPool.
 * @param challengeRatingHint -1 = tally radius; else points from that CR
 */
function calculateSpawnPool(encounter: Encounter, challengeRatingHint: number = -1){
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
 * PadOutCreatureCount — fill to (rec − spawned) by repeatedly
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
      // exits when every single-spawn in the band has been tried
      if(band.length === singleInBand && marked === singleInBand) break;
    }
    if(marked === 0) break;
  }
}

/**
 * AddCreaturesToSpawnList
 * Truncate spawn list from `atIndex`, then refill with creatures cheaper than the seed CR budget.
 */
function addCreaturesToSpawnList(
  encounter: Encounter,
  list: WaveCreature[],
  out: EncounterSpawnEntry[],
  atIndex: number,
  seed: EncounterSpawnEntry,
  targetCount: number,
){
  const seedPts = calculatePointsFromCR(seed.spawnCR || 0);
  const areaPts = Number(encounter.areaPoints) || 0;
  // : skip when seed points == (area points)
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
      // : break when pts > remaining-0.001, at max, or single-spawn used
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
 * BuildInitialSpawnList + AddCreaturesToSpawnList
 * + PadOutCreatureCount.
 */
function buildSpawnList(encounter: Encounter){
  const maxCreatures = Math.max(1, encounter.maxCreatures | 0);
  const recCreatures = Math.max(1, encounter.recCreatures | 0);
  const already = encounter.numberSpawned | 0;
  const slotsLeft = Math.max(0, maxCreatures - already);
  if(slotsLeft <= 0) return;

  // BuildSpawnList uses recovered − active; no underflow pad when recovered is 0
  let budget = (Number(encounter.spawnPoolRecovered) || 0) - (Number(encounter.spawnPoolActive) || 0);
  if(budget < 0) budget = 0;

  const soft = budget + budget * 0.1;
  const targetCount = Math.min(slotsLeft, Math.max(0, recCreatures - already));
  const list = (encounter.creatureList || []) as WaveCreature[];
  const recovered = Number(encounter.spawnPoolRecovered) || 0;
  const areaPts = Number(encounter.areaPoints) || 0;

  // Reset per-wave singleSpawn markers 
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

    // Same-CR band: random among contiguous equal-CR peers 
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

  // : if recovered < area points, zero recovered after build
  if(recovered < areaPts){
    encounter.spawnPoolRecovered = 0;
  }

  encounter.spawnList = out;
}

/**
 * SpawnIfAppropriate
 * only builds when spawnPoolRecovered > 0.
 */
function spawnIfAppropriate(encounter: Encounter){
  if(!encounter.active || encounter.started === 1) return;
  if(!encounter.creatureList?.length) return;

  const last = encounter.lastEntered as Creature | undefined;
  if(encounter.playerOnly){
    if(!last || (!last.isPC && !last.isPartyMember?.())) return;
  }

  calculateSpawnPool(encounter, -1);
  // : if (0.0 <) BuildSpawnList
  if((Number(encounter.spawnPoolRecovered) || 0) > 0){
    buildSpawnList(encounter);
    if(encounter.spawnList.length > 0){
      encounter.started = 1;
    }
  }
}

const NONVISIBLE_SENTINEL = -1;

/**
 * SpawnCreatureFromSpawnList placement.
 * @returns undefined when NonVisible returns (−1,−1,−1) — abort spawn (retry next tick).
 */
function pickSpawnPosition(
  encounter: Encounter
): { pos: THREE.Vector3; facing: number } | undefined {
  const area = encounter.area || GameState.module?.area;
  const last = encounter.lastEntered as Creature | undefined;
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
      // picks farthest spawn point from lastEntered
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
    // : find safe location(spawnPoint, 20) — on success use it; on fail fall through
    if(findOpenWalkLocation(area, result.pos, scratch, { radius: 20 })){
      result.pos.copy(scratch);
      return result;
    }
  }

  if(area){
    // : find non-visible location(encounter.pos, …, 40)
    if(findHiddenWalkLocation(area, encounter.position, scratch, { radius: 40 })){
      result.pos.copy(scratch);
      return result;
    }
    // abort when out is (−1,−1,−1)
    if(
      scratch.x === NONVISIBLE_SENTINEL &&
      scratch.y === NONVISIBLE_SENTINEL &&
      scratch.z === NONVISIBLE_SENTINEL
    ){
      return undefined;
    }
    // Partial NonVisible write (non-sentinel) — still places there
    if(Number.isFinite(scratch.x) && scratch.x !== NONVISIBLE_SENTINEL){
      result.pos.copy(scratch);
    }
  }

  return result;
}

/**
 * SpawnCreatureFromSpawnList — spawn head of queue (one per AI tick).
 */
function spawnCreatureFromSpawnList(encounter: Encounter): Creature | undefined {
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
  // : NonVisible (−1,−1,−1) destroys creature and returns without dequeue (retry)
  if(!placement){
    return undefined;
  }
  const { pos, facing } = placement;
  const creature = new GameState.Module.Area.Creature(new GFFObject(buffer));
  creature.load();
  creature.clearAllActions?.();
  creature.position.copy(pos);
  creature.setFacing?.(facing, true);
  // = 0 at spawn (mirrors is_pc cache; NPCs already 0)
  creature.isPC = 0;

  const poolCost =
    entry.poolPoints ||
    calculatePointsFromCR(entry.spawnCR || creature.challengeRating || 0);

  // registerSpawnedCreature increments numberSpawned + pool; mirror then dequeue
  encounter.registerSpawnedCreature(creature, poolCost);
  encounter.spawnPoolRecovered = Math.max(
    0,
    (Number(encounter.spawnPoolRecovered) || 0) - poolCost
  );
  encounter.spawnList.shift();

  GameState.GameObjectManager.RegisterObject(creature);
  area.attachObject(creature);
  void creature.loadModel?.().then((model: OdysseyModel3D) => {
    if(!model) return;
    model.userData.gameObject = creature;
    model.hasCollision = true;
    model.name = creature.getTag?.() || model.name;
    GameState.group?.creatures?.add(creature.container);
    creature.getCurrentRoom?.();
    creature.onSpawn?.();
  });

  return creature;
}

/**
* Encounter class.
*
* Class representing an encounter found in module areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Encounter.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Encounter extends GameObject {
  static calculatePointsFromCR = calculatePointsFromCR;
  static tallyEnemyRadiusPoints = tallyEnemyRadiusPoints;
  static calculateSpawnPool = calculateSpawnPool;
  static buildSpawnList = buildSpawnList;
  static spawnIfAppropriate = spawnIfAppropriate;
  static pickSpawnPosition = pickSpawnPosition;
  static spawnCreatureFromSpawnList = spawnCreatureFromSpawnList;

  creatureList: EncounterCreatureEntry[];
  spawnPointList: EncounterSpawnPointEntry[];
  spawnList: EncounterSpawnEntry[];
  active: number;
  difficulty: number;
  difficultyIndex: number;
  maxCreatures: number;
  playerOnly: number;
  recCreatures: number;
  reset: number;
  resetTime: number;
  spawnOption: number;
  started: number;
  objectsInsideIdx: number;
  lastObjectEntered: any;
  lastObjectExited: any;
  triggered: boolean;
  areaPoints: any;
  paletteId: any;
  respawns: any;
  numberSpawned: any;
  heartbeatDay: any;
  heartbeatTime: any;
  lastSpawnDay: any;
  lastSpawnTime: any;
  lastEntered: any;
  lastLeft: any;
  exhausted: any;
  currentSpawns: any;
  customScriptId: any;
  areaListMaxSize: any;
  spawnPoolActive: any;
  /** CR points recovered via DestroySelf unlink. */
  spawnPoolRecovered: number = 0;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= GameObjectType.Encounter;
    this.template = gff;
    this.vertices = []; 

    this.creatureList = [];

    this.spawnPointList = [];  

    this.spawnList = [];

    this.active = 1; //0: Inactive | 1: Active
    this.difficulty = 1; //OBSOLETE FIELD; Should always be identical to the VALUE in encdifficulty.2da pointed to by the DifficultyIndex Field.
    this.difficultyIndex = 1; //Index into encdifficulty.2da
    // this.faction = 0; //Faction ID; Only spawn when entered by creatures hostile to this faction
    this.localizedName = undefined;
    this.maxCreatures = 1; //Maximum number of creatures this encounter can spawn; 1-8
    this.playerOnly = 0; //0: Any Creature | 1: Only Player ; Can Trigger
    this.recCreatures = 1; //Recommneded number of creatures; 1-8
    this.reset = 0; //0: No Respawn | 1: Respawn
    this.resetTime = 32000; //Seconds before encounter respawns
    this.spawnOption = 0; //0: Continuous Spawn | 1: Single-Shot Spawn
    this.started = 0; //0: if there are no creatures currently belonging to the encounter. | 1: if any creatures currently exist that belong to the encounter.
    this.numberSpawned = 0;
    this.spawnPoolActive = 0;
    this.spawnPoolRecovered = 0;
    this.exhausted = 0;
    this.currentSpawns = 0;
    this.respawns = -1;
    this.lastSpawnDay = 0;
    this.lastSpawnTime = 0;

    this.scripts = {
      onEntered: undefined,
      onExhausted: undefined,
      onExit: undefined,
      onHeartbeat: undefined,
      onUserDefined: undefined
    };

    this.objectsInside = [];
    this.objectsInsideIdx = 0;
    this.lastObjectEntered = null;
    this.lastObjectExited = null;

  }

  /**
   * AIUpdate — occupancy, spawn reset, spawn queue.
   */
  aiUpdate(delta = 0){
    super.aiUpdate(delta);
    if(this.willDestroy || this.destroyed) return;

    this.getCurrentRoom();
    
    //Check Module Creatures
    let creatureLen = GameState.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++){
      let creature = GameState.module.area.creatures[i];
      let pos = creature.position.clone();
      if(this.boxContainsPoint(pos)){
        if(this.objectsInside.indexOf(creature) == -1){
          this.objectsInside.push(creature);
          if(this.isHostile(creature)){
            creature.lastTriggerEntered = this;
            this.lastObjectEntered = creature;

            this.onEnter(creature);
            this.triggered = true;
            this.lastEntered = creature;
            spawnIfAppropriate(this);
          }
        }
      }else{
        if(this.objectsInside.indexOf(creature) >= 0){
          this.objectsInside.splice(this.objectsInside.indexOf(creature), 1);
          if(this.isHostile(creature)){
            creature.lastTriggerExited = this;
            this.lastObjectExited = creature;
            this.onExit(creature);
          }
        }
      }
    }

    //Check Party Members
    let partyLen = GameState.PartyManager.party.length;
    for(let i = 0; i < partyLen; i++){
      let partymember = GameState.PartyManager.party[i];
      let pos = partymember.position.clone();
      
      if(this.boxContainsPoint(pos)){
        if(this.objectsInside.indexOf(partymember) == -1){
          this.objectsInside.push(partymember);
          if(this.isHostile(partymember)){
            partymember.lastTriggerEntered = this;
            this.lastObjectEntered = partymember;

            this.onEnter(partymember);
            this.triggered = true;
            this.lastEntered = partymember;
            spawnIfAppropriate(this);
          }
        }
      }else{
        if(this.objectsInside.indexOf(partymember) >= 0){
          this.objectsInside.splice(this.objectsInside.indexOf(partymember), 1);
          if(this.isHostile(partymember)){
            partymember.lastTriggerExited = this;
            this.lastObjectExited = partymember;

            this.onExit(partymember);
          }
        }
      }
    }

    // AIUpdate: Single-shot + Reset → re-activate after ResetTime
    // Gate: current_spawns < max_spawns (Respawns) || max_spawns == -1
    if(
      this.spawnOption === 1 &&
      this.reset === 1 &&
      this.lastSpawnDay &&
      this.lastSpawnTime
    ){
      const tm = GameState.module?.timeManager;
      if(tm){
        const elapsed = tm.getMilisecondsElapsed(this.lastSpawnDay, this.lastSpawnTime);
        if(elapsed >= (this.resetTime | 0) * 1000){
          const maxSpawns = this.respawns | 0;
          const current = this.currentSpawns | 0;
          if(current < maxSpawns || maxSpawns === -1){
            this.currentSpawns = current + 1;
            this.lastSpawnDay = 0;
            this.lastSpawnTime = 0;
            this.exhausted = 0;
            this.active = 1;
            // SpawnIfAppropriate → CalculateSpawnPool adds to recovered, then clear pools
            spawnIfAppropriate(this);
            this.spawnPoolRecovered = 0;
            this.spawnPoolActive = 0;
          }
        }
      }
    }

    // AIUpdate: SpawnCreatureFromSpawnList each tick while queue non-empty
    if(this.active && this.spawnList?.length){
      spawnCreatureFromSpawnList(this);
    }

    this.mesh.visible = ConfigClient.get('Game.debug.trigger_geometry_show') ? true : false;

  }

  update(delta = 0){
    // Visual/client pass — occupancy/spawn logic lives in aiUpdate
    super.update(delta);
  }

  onEnter(object: GameObject){
    const nwscript = this.scripts[ScriptHook.EncounterOnEntered];
    if(!nwscript){ return; }
    nwscript.enteringObject = object;
    nwscript.run(this, 0);
  }

  onExit(object: GameObject){
    const nwscript = this.scripts[ScriptHook.EncounterOnExit];
    if(!nwscript){ return; }
    nwscript.exitingObject = object;
    nwscript.run(this, 0);
  }

  override triggerHeartbeat(){
    if(!this.canProcessHeartbeat()){ return; }
    const onHeartbeat = this.scripts[ScriptHook.EncounterOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ScriptHook.EncounterOnUserDefined]);
  }

  onExhausted(){
    const nwscript = this.scripts[ScriptHook.EncounterOnExhausted];
    if(!nwscript){ return; }
    nwscript.run(this, 0);
  }

  /**
   * Mark a creature as spawned from this encounter.
   */
  registerSpawnedCreature(creature: Creature, poolCost: number = 0){
    if(!creature) return;
    creature.encounterObjectId = this.id;
    creature.encounterUnlinked = false;
    this.numberSpawned = (this.numberSpawned || 0) + 1;
    this.started = 1;
    if(poolCost > 0){
      this.spawnPoolActive = (this.spawnPoolActive || 0) + poolCost;
    }
  }

  /**
   * RemoveFromActiveCreatureCount.
   * @param challengeRating creature CR
   * @param fromDestroySelf 1 = DestroySelf encounter action (recover to);
   * 0 = destroy-self effect unlink (may fire OnExhausted when count hits 0)
   */
  removeFromActiveCreatureCount(challengeRating: number, fromDestroySelf: number = 0){
    let spawned = this.numberSpawned || 0;
    if(spawned <= 0) return;

    const points = calculatePointsFromCR(challengeRating);
    spawned -= 1;
    this.numberSpawned = spawned;

    let pool = (this.spawnPoolActive || 0) - points;
    if(pool < 0) pool = 0;
    this.spawnPoolActive = pool;

    if(fromDestroySelf === 1){
      this.spawnPoolRecovered = (this.spawnPoolRecovered || 0) + points;
      return;
    }

    if(spawned === 0){
      this.onExhausted();
      // clears per-creature spawn flags, then:
      this.active = 0;
      this.started = 0;
      this.exhausted = 1;
      if(this.reset === 1){
        // stamps world timer last_spawn_day / last_spawn_time
        const tm = GameState.module?.timeManager;
        this.lastSpawnDay = tm?.pauseDay ?? 0;
        this.lastSpawnTime = tm?.pauseTime ?? 0;
        // Avoid day=0 looking "unstamped" — treats 0 as empty
        if(!this.lastSpawnDay && !this.lastSpawnTime){
          this.lastSpawnDay = 1;
        }
      }
    }
  }

  load(){
    this.seedResRefsFromTemplate();
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['ute'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        this.loadScripts();
        try{ this.buildGeometry(); }catch(e){console.error(e)}
        //this.initObjectsInside;
      }else{
        console.error('Failed to load Trigger template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadScripts();
          try{ this.buildGeometry(); }catch(e){console.error(e)}
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts();
      try{ this.buildGeometry(); }catch(e){console.error(e)}
    }
  }

  buildGeometry(){
    let trigGeom = this.getGeometry();

    let material = new THREE.MeshBasicMaterial({
      color: new THREE.Color( 0xFFFFFF ),
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh( trigGeom, material );
    this.box.setFromObject(this.mesh);
    this.box.min.z -= 100;
    this.box.max.z += 100;

    this.mesh.userData.gameObject = this;
    this.mesh.visible = false;
    GameState.group.triggers.add(this.mesh);
  }

  getGeometry(){
    let trigGeom = new THREE.BufferGeometry();
    let vertices = this.vertices.slice();
    let faces: any[] = [];

    try{
      let holes: any = [];
      let triangles = THREE.ShapeUtils.triangulateShape ( vertices, holes );
      for( let i = 0; i < triangles.length; i++ ){
        faces.push( new OdysseyFace3( triangles[i][0], triangles[i][1], triangles[i][2] ));
      }
    }catch(e){
      console.error('Trigger', 'Failed to generate faces', {
        trigger: this,
        error: e
      })
    }

    // trigGeom.computeFaceNormals;
    trigGeom.computeVertexNormals();
    trigGeom.computeBoundingSphere();

    return trigGeom;
  }

  loadScripts(){
    const scriptKeys = [
      ScriptHook.EncounterOnEntered,
      ScriptHook.EncounterOnExhausted,
      ScriptHook.EncounterOnExit,
      ScriptHook.EncounterOnHeartbeat,
      ScriptHook.EncounterOnUserDefined,
    ];

    this.hydrateScriptResRefsFromTemplate(scriptKeys);
    this.bindScriptsFromResRefs(scriptKeys, 'Encounter.loadScripts');
  }

  initProperties(){
    
    const needsRegister = !this.initialized;
    if(needsRegister){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }

      if(this.template.RootNode.hasField('Geometry')){
        this.geometry = this.template.getFieldByLabel('Geometry').getChildStructs();

        //Push verticies
        for(let i = 0; i < this.geometry.length; i++){
          let tgv = this.geometry[i];
          this.vertices[i] = new THREE.Vector3( 
            tgv.getFieldByLabel('X').getValue(),
            tgv.getFieldByLabel('Y').getValue(),
            tgv.getFieldByLabel('Z').getValue()
          );
        }
      }

      if(this.template.RootNode.hasField('SWVarTable')){
        let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
        //console.log(localBools);
        for(let i = 0; i < localBools.length; i++){
          let data = localBools[i].getFieldByLabel('Variable').getValue();
          for(let bit = 0; bit < 32; bit++){
            this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
          }
        }
      }

      if(this.template.RootNode.hasField('CreatureList')){
        let creatures = this.template.RootNode.getFieldByLabel('CreatureList').getChildStructs();
        let entry = undefined;
        for(let i = 0, len = creatures.length; i < len; i++){
          entry = EncounterCreatureEntry.FromStruct(creatures[i]);
          if(entry instanceof EncounterCreatureEntry){
            this.creatureList.push(entry);
          }
        }
      }

      if(this.template.RootNode.hasField('SpawnPointList')){
        let spawnPoints = this.template.RootNode.getFieldByLabel('SpawnPointList').getChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawnPoints.length; i < len; i++){
          entry = EncounterSpawnPointEntry.FromStruct(spawnPoints[i]);
          if(entry instanceof EncounterSpawnPointEntry){
            this.spawnPointList.push(entry);
          }
        }
      }

      if(this.template.RootNode.hasField('SpawnList')){
        let spawns = this.template.RootNode.getFieldByLabel('SpawnList').getChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawns.length; i < len; i++){
          entry = EncounterSpawnEntry.FromStruct(spawns[i]);
          if(entry instanceof EncounterSpawnEntry){
            this.spawnList.push(entry);
          }
        }
      }

      if(this.template.RootNode.hasField('Active'))
        this.active = this.template.getFieldByLabel('Active').getValue();

      if(this.template.RootNode.hasField('AreaPoints'))
        this.areaPoints = this.template.getFieldByLabel('AreaPoints').getValue();

      if(this.template.RootNode.hasField('Difficulty'))
        this.difficulty = this.template.getFieldByLabel('Difficulty').getValue();

      if(this.template.RootNode.hasField('DifficultyIndex'))
        this.difficultyIndex = this.template.getFieldByLabel('DifficultyIndex').getValue();

      if(this.template.RootNode.hasField('Faction')){
        this.factionId = this.template.getFieldByLabel('Faction').getValue();
        if((this.factionId & 0xFFFFFFFF) == -1){
          this.factionId = 0;
        }
      }
      this.faction = GameState.FactionManager.factions.get(this.factionId);

      if(this.template.RootNode.hasField('LocalizedName'))
        this.localizedName = this.template.getFieldByLabel('LocalizedName').getValue();

      if(this.template.RootNode.hasField('MaxCreatures'))
        this.maxCreatures = this.template.getFieldByLabel('MaxCreatures').getValue();

      if(this.template.RootNode.hasField('PaletteID'))
        this.paletteId = this.template.getFieldByLabel('PaletteID').getValue();

      if(this.template.RootNode.hasField('PlayerOnly'))
        this.playerOnly = this.template.getFieldByLabel('PlayerOnly').getValue();

      if(this.template.RootNode.hasField('RecCreatures'))
        this.recCreatures = this.template.getFieldByLabel('RecCreatures').getValue();

      if(this.template.RootNode.hasField('Reset'))
        this.reset = this.template.getFieldByLabel('Reset').getValue();

      if(this.template.RootNode.hasField('ResetTime'))
        this.resetTime = this.template.getFieldByLabel('ResetTime').getValue();

      if(this.template.RootNode.hasField('Respawns'))
        this.respawns = this.template.getFieldByLabel('Respawns').getValue();

      if(this.template.RootNode.hasField('SpawnOption'))
        this.spawnOption = this.template.getFieldByLabel('SpawnOption').getValue();

      if(this.template.RootNode.hasField('Tag'))
        this.tag = this.template.getFieldByLabel('Tag').getValue();
  
      if(this.template.RootNode.hasField('TemplateResRef'))
        this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

      if(this.template.RootNode.hasField('XPosition'))
        this.position.x = this.template.getFieldByLabel('XPosition').getValue();

      if(this.template.RootNode.hasField('YPosition'))
        this.position.y = this.template.getFieldByLabel('YPosition').getValue();
  
      if(this.template.RootNode.hasField('ZPosition'))
        this.position.z = this.template.getFieldByLabel('ZPosition').getValue();

      if(this.template.RootNode.hasField('Commandable'))
        this.commandable = this.template.getFieldByLabel('Commandable').getValue();

      if(this.template.RootNode.hasField('NumberSpawned'))
        this.numberSpawned = this.template.getFieldByLabel('NumberSpawned').getValue();

      if(this.template.RootNode.hasField('HeartbeatDay'))
        this.heartbeatDay = this.template.getFieldByLabel('HeartbeatDay').getValue();

      if(this.template.RootNode.hasField('HeartbeatTime'))
        this.heartbeatTime = this.template.getFieldByLabel('HeartbeatTime').getValue();

      if(this.template.RootNode.hasField('LastSpawnDay'))
        this.lastSpawnDay = this.template.getFieldByLabel('LastSpawnDay').getValue();

      if(this.template.RootNode.hasField('LastSpawnTime'))
        this.lastSpawnTime = this.template.getFieldByLabel('LastSpawnTime').getValue();

      if(this.template.RootNode.hasField('LastEntered'))
        this.lastEntered = this.template.getFieldByLabel('LastEntered').getValue();

      if(this.template.RootNode.hasField('LastLeft'))
        this.lastLeft = this.template.getFieldByLabel('LastLeft').getValue();

      if(this.template.RootNode.hasField('Started'))
        this.started = this.template.getFieldByLabel('Started').getValue();

      if(this.template.RootNode.hasField('Exhausted'))
        this.exhausted = this.template.getFieldByLabel('Exhausted').getValue();
        
      if(this.template.RootNode.hasField('CurrentSpawns'))
        this.currentSpawns = this.template.getFieldByLabel('CurrentSpawns').getValue();
    
      if(this.template.RootNode.hasField('CustomScriptId'))
        this.customScriptId = this.template.getFieldByLabel('CustomScriptId').getValue();

      if(this.template.RootNode.hasField('AreaListMaxSize'))
        this.areaListMaxSize = this.template.getFieldByLabel('AreaListMaxSize').getValue();

      if(this.template.RootNode.hasField('SpawnPoolActive'))
        this.spawnPoolActive = this.template.getFieldByLabel('SpawnPoolActive').getValue();

      if(this.template.RootNode.hasField('SpawnPoolRecovered'))
        this.spawnPoolRecovered = this.template.getFieldByLabel('SpawnPoolRecovered').getValue();

      this.loadActionList();

      if(needsRegister){
        GameState.GameObjectManager.RegisterObject(this);
      }

      this.initialized = true;
    }

  }

  destroy(): void {
    super.destroy();
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTE ';

    let actionList = gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.commandable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Active') ).setValue(this.active);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Reset') ).setValue( this.reset );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'ResetTime') ).setValue(this.resetTime);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Respawns') ).setValue(this.respawns);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'SpawnOption') ).setValue(this.spawnOption);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'MaxCreatures') ).setValue(this.maxCreatures);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'RecCreatures') ).setValue(this.recCreatures);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PlayerOnly') ).setValue( this.playerOnly );
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') ).setValue( this.faction ? this.faction.id : this.factionId );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'DifficultyIndex') ).setValue( this.difficultyIndex );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Difficulty') ).setValue( this.difficulty );
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).setValue(this.localizedName);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'NumberSpawned') ).setValue(this.numberSpawned);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'HeartbeatDay') ).setValue(this.heartbeatDay);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'HeartbeatTime') ).setValue(this.heartbeatTime);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastSpawnDay') ).setValue(this.lastSpawnDay);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastSpawnTime') ).setValue(this.lastSpawnTime);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Started') ).setValue(this.started);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Exhausted') ).setValue(this.exhausted);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CurrentSpawns') ).setValue(this.currentSpawns);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'SpawnPoolActive') ).setValue(this.spawnPoolActive);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'SpawnPoolRecovered') ).setValue(this.spawnPoolRecovered);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastEntered') ).setValue(this.lastEntered);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastLeft') ).setValue(this.lastLeft);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CustomScriptId') ).setValue(this.customScriptId);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'AreaListMaxSize') ).setValue(this.areaListMaxSize);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'AreaPoints') ).setValue(this.areaPoints);

    let creatureList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'CreatureList') );
    let creature = undefined;
    for(let i = 0; i < this.creatureList.length; i++){
      creature = this.creatureList[i].save();
      if(creature)
        creatureList.addChildStruct( creature );
    }

    let spawnPointList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'SpawnPointList') );
    let spawnPoint = undefined;
    for(let i = 0; i < this.spawnPointList.length; i++){
      spawnPoint = this.spawnPointList[i].save();
      if(spawnPoint)
        spawnPointList.addChildStruct( spawnPoint );
    }

    if(this.spawnList.length){
      let spawnList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'SpawnList') );
      let spawn = undefined;
      for(let i = 0; i < this.spawnList.length; i++){
        spawn = this.spawnList[i].save();
        if(spawn)
          spawnList.addChildStruct( spawn );
      }
    }

    let geometry = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Geometry') );
    for(let i = 0; i < this.vertices.length; i++){
      let vertStruct = new GFFStruct();
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'X') ).setValue(this.vertices[i].x);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'Y') ).setValue(this.vertices[i].y);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'Z') ).setValue(this.vertices[i].z);
      geometry.addChildStruct(vertStruct);
    }

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.EncounterOnEntered) ).setValue(this.scripts[ScriptHook.EncounterOnEntered]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.EncounterOnExit) ).setValue(this.scripts[ScriptHook.EncounterOnExit]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.EncounterOnExhausted) ).setValue(this.scripts[ScriptHook.EncounterOnExhausted]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.EncounterOnHeartbeat) ).setValue(this.scripts[ScriptHook.EncounterOnHeartbeat]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.EncounterOnUserDefined) ).setValue(this.scripts[ScriptHook.EncounterOnUserDefined]?.name || '');

    this.writeNamedVarTable(gff.RootNode);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

}
