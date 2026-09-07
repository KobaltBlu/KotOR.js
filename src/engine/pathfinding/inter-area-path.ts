import * as THREE from "three";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleTriggerType } from "@/enums/module/ModuleTriggerType";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleTrigger } from "@/module/ModuleTrigger";
import { BitWise } from "@/utility/BitWise";
import { GameState } from "@/GameState";
import { getNearestActionPoint } from "@/combat/nearest-action-point";
import { getPathPersonalSpace } from "@/combat/attack-range";

/**
 * Inter-area pathfinding (PlotInterAreaPath / build inter-area path
 * InterAreaDFS).
 *
 * Builds a waypoint list of transition doors/triggers. Same-module hops use
 * LinkedToFlags 1|2 doors + TRANSITION triggers; cross-module hops use
 * LinkedToModule. CountAreaTransitionTriggers visit marks
 * keep one portal per destination.
 *
 * @file inter-area-path.ts
 */

export type InterAreaWaypoint = {
  /** Door or transition trigger to approach. */
  object: ModuleObject;
  /** Goal position (nearest action point / trigger center). */
  goal: THREE.Vector3;
  /** Personal-space-adjusted range for MoveTo. */
  range: number;
  /** Dest area id after this hop (0 if cross-module). */
  destAreaId?: number;
  /** Dest module resref after this hop (cross-module). */
  destModule?: string;
};

/** Graph node key: area id, or `m:resref` for unloaded dest modules. */
type AreaKey = string;

type TransitionEdge = {
  object: ModuleObject;
  fromKey: AreaKey;
  toKey: AreaKey;
  destAreaId?: number;
  destModule?: string;
};

const MAX_DFS_DEPTH = 9;

function areaKey(areaId: number): AreaKey {
  return `a:${areaId}`;
}

function moduleKey(resref: string): AreaKey {
  return `m:${(resref || '').toLowerCase()}`;
}

function isDoorLinked(door: ModuleDoor): boolean {
  const flags = door.linkedToFlags | 0;
  return flags === 1 || flags === 2;
}

function getLoadedAreas(): ModuleArea[] {
  const module = GameState.module;
  if(module?.areas?.length) return module.areas;
  if(module?.area) return [module.area];
  return [];
}

/** Clear on all loaded areas. */
export function clearInterAreaVisitMarks(){
  const areas = getLoadedAreas();
  for(let i = 0; i < areas.length; i++){
    if(areas[i]) areas[i].interAreaVisitMark = 0;
  }
}

/**
 * Resolve transition dest area object (for visit marks) + graph key.
 * Same-module doors/triggers → linked object's area; LinkedToModule → module key.
 */
export function resolveTransitionDest(
  transition: ModuleObject
): { destAreaId?: number; destModule?: string; toKey?: AreaKey; destArea?: ModuleArea } | undefined {
  if(!transition) return undefined;

  const linkedModule = (transition.getLinkedToModule?.() || '').trim();
  if(linkedModule){
    return {
      destModule: linkedModule.toLowerCase(),
      toKey: moduleKey(linkedModule),
    };
  }

  if(BitWise.InstanceOfObject(transition, ModuleObjectType.ModuleDoor)){
    const door = transition as ModuleDoor;
    if(!isDoorLinked(door)) return undefined;
    const tag = (door.getLinkedTo?.() || '').trim();
    if(!tag) return undefined;
    const linked = GameState.ModuleObjectManager?.GetObjectByTag?.(tag, 0);
    if(!linked?.area) return undefined;
    return {
      destAreaId: linked.area.id,
      destArea: linked.area,
      toKey: areaKey(linked.area.id),
    };
  }

  // GetTargetArea — TRANSITION trigger LinkedTo → waypoint → area
  if(BitWise.InstanceOfObject(transition, ModuleObjectType.ModuleTrigger)){
    const trigger = transition as ModuleTrigger;
    if((trigger.type | 0) !== ModuleTriggerType.TRANSITION) return undefined;
    const tag = (trigger.linkedTo || trigger.getLinkedTo?.() || '').trim();
    if(!tag) return undefined;
    const linked =
      GameState.ModuleObjectManager?.GetObjectByTag?.(tag, 0, NWModuleObjectType.WAYPOINT) ||
      GameState.ModuleObjectManager?.GetObjectByTag?.(tag, 0);
    if(!linked?.area) return undefined;
    return {
      destAreaId: linked.area.id,
      destArea: linked.area,
      toKey: areaKey(linked.area.id),
    };
  }

  return undefined;
}

/**
 * CountAreaTransitionTriggers.
 * Linked doors (flags 1|2) + TRANSITION triggers with resolvable dest.
 * LinkedToModule portals included for cross-module chase (KotOR.js).
 * When `out` is provided, fills it and sets dest area interAreaVisitMark (one portal per dest).
 */
export function countAreaTransitionTriggers(
  area: ModuleArea | undefined,
  out?: ModuleObject[],
  excludedIds?: ReadonlyArray<number>
): number {
  if(!area) return 0;
  const excluded = excludedIds?.length ? new Set(excludedIds) : undefined;
  // Module-key visit set for cross-module (no ModuleArea to mark)
  const seenModuleKeys = new Set<string>();
  let count = 0;

  const consider = (obj: ModuleObject) => {
    if(!obj || excluded?.has(obj.id)) return;
    const dest = resolveTransitionDest(obj);
    if(!dest?.toKey) return;

    if(dest.destArea){
      if(dest.destArea.interAreaVisitMark) return;
    }else if(dest.destModule){
      if(seenModuleKeys.has(dest.toKey)) return;
    }else{
      return;
    }

    if(out){
      out.push(obj);
      if(dest.destArea){
        dest.destArea.interAreaVisitMark = 1;
      }else if(dest.destModule){
        seenModuleKeys.add(dest.toKey);
      }
    }
    count++;
  };

  const doors = area.doors || [];
  for(let i = 0; i < doors.length; i++){
    const d = doors[i];
    if(!d) continue;
    // : GetIsLinked only; we also allow LinkedToModule
    if(d.getLinkedToModule?.() || isDoorLinked(d)){
      consider(d);
    }
  }

  const triggers = area.triggers || [];
  for(let i = 0; i < triggers.length; i++){
    const t = triggers[i] as ModuleTrigger;
    if(!t) continue;
    if((t.type | 0) !== ModuleTriggerType.TRANSITION) continue;
    // Cross-module or same-module LinkedTo waypoint
    if(t.linkedToModule || (t.linkedTo || t.getLinkedTo?.())){
      consider(t);
    }
  }

  return count;
}

/**
 * Collect module-transition + same-module linked doors/triggers in an area.
 * @param excludedIds Skip these transition object ids.
 * Uses visit marks: one portal per destination (CountAreaTransitionTriggers).
 */
export function listAreaTransitions(
  area: ModuleArea | undefined,
  excludedIds?: ReadonlyArray<number>
): ModuleObject[] {
  if(!area) return [];
  // Per-source CountArea: fresh dest marks for this listing
  clearInterAreaVisitMarks();
  const out: ModuleObject[] = [];
  countAreaTransitionTriggers(area, out, excludedIds);
  return out;
}

function listEdgesFromArea(
  area: ModuleArea | undefined,
  excludedIds?: ReadonlyArray<number>
): TransitionEdge[] {
  if(!area) return [];
  const fromKey = areaKey(area.id);
  const transitions = listAreaTransitions(area, excludedIds);
  const edges: TransitionEdge[] = [];
  for(let i = 0; i < transitions.length; i++){
    const obj = transitions[i];
    const dest = resolveTransitionDest(obj);
    if(!dest?.toKey) continue;
    edges.push({
      object: obj,
      fromKey,
      toKey: dest.toKey,
      destAreaId: dest.destAreaId,
      destModule: dest.destModule,
    });
  }
  return edges;
}

/**
 * Collect edges from all loaded module areas (same-module multi-area DFS).
 */
function listAllLoadedEdges(excludedIds?: ReadonlyArray<number>): TransitionEdge[] {
  const areas = getLoadedAreas();
  const edges: TransitionEdge[] = [];
  for(let i = 0; i < areas.length; i++){
    edges.push(...listEdgesFromArea(areas[i], excludedIds));
  }
  return edges;
}

/**
 * InterAreaDFS — depth-limited search for dest key.
 * Returns transition objects along the path (excluding start).
 */
export function interAreaDFS(
  startKey: AreaKey,
  destKey: AreaKey,
  maxDepth: number = MAX_DFS_DEPTH,
  excludedIds?: ReadonlyArray<number>
): TransitionEdge[] | undefined {
  if(startKey === destKey) return [];

  const edges = listAllLoadedEdges(excludedIds);
  const byFrom = new Map<AreaKey, TransitionEdge[]>();
  for(let i = 0; i < edges.length; i++){
    const e = edges[i];
    let list = byFrom.get(e.fromKey);
    if(!list){
      list = [];
      byFrom.set(e.fromKey, list);
    }
    list.push(e);
  }

  type Frame = { key: AreaKey; depth: number; path: TransitionEdge[] };
  const stack: Frame[] = [{ key: startKey, depth: 0, path: [] }];

  while(stack.length){
    const frame = stack.pop()!;
    if(frame.key === destKey){
      return frame.path;
    }
    if(frame.depth >= maxDepth) continue;

    const outs = byFrom.get(frame.key) || [];
    const usedKeys = new Set<AreaKey>([startKey]);
    for(let p = 0; p < frame.path.length; p++){
      usedKeys.add(frame.path[p].toKey);
    }

    for(let i = outs.length - 1; i >= 0; i--){
      const e = outs[i];
      if(frame.path.some((p) => p.object === e.object)) continue;
      // Avoid cycles unless this edge reaches the destination
      if(usedKeys.has(e.toKey) && e.toKey !== destKey) continue;
      stack.push({
        key: e.toKey,
        depth: frame.depth + 1,
        path: frame.path.concat(e),
      });
    }
  }
  return undefined;
}

/**
 * build inter-area path — try depths 1..9.
 */
export function buildInterAreaPath(
  startAreaId: number,
  destAreaId?: number,
  preferredModule?: string,
  excludedIds?: ReadonlyArray<number>
): TransitionEdge[] | undefined {
  const startKey = areaKey(startAreaId);
  let destKey: AreaKey | undefined;

  if(preferredModule){
    destKey = moduleKey(preferredModule);
  }else if(typeof destAreaId === 'number' && destAreaId !== startAreaId){
    destKey = areaKey(destAreaId);
  }

  if(!destKey){
    // No explicit dest — nearest any transition as single hop
    return undefined;
  }

  // clears start-area visit mark before each depth attempt
  clearInterAreaVisitMarks();

  // Increasing depth like (iVar4 = 1..9)
  for(let depth = 1; depth <= MAX_DFS_DEPTH; depth++){
    const path = interAreaDFS(startKey, destKey, depth, excludedIds);
    if(path) return path;
  }
  return undefined;
}

/**
 * Prefer transitions targeting a module resref; else any transition.
 */
export function findBestTransition(
  creature: ModuleCreature,
  preferredModule?: string,
  excludedIds?: ReadonlyArray<number>
): ModuleObject | undefined {
  const area = creature.area;
  const candidates = listAreaTransitions(area, excludedIds ?? creature.interAreaExcludedIds);
  if(!candidates.length) return undefined;

  const prefer = (preferredModule || '').toLowerCase();
  let best: ModuleObject | undefined;
  let bestDist = Infinity;
  for(let i = 0; i < candidates.length; i++){
    const obj = candidates[i];
    const link = (obj.getLinkedToModule?.() || '').toLowerCase();
    if(prefer && link && link !== prefer) continue;
    const dist = creature.position.distanceToSquared(obj.position);
    if(dist < bestDist){
      bestDist = dist;
      best = obj;
    }
  }
  if(best) return best;
  bestDist = Infinity;
  for(let i = 0; i < candidates.length; i++){
    const obj = candidates[i];
    const dist = creature.position.distanceToSquared(obj.position);
    if(dist < bestDist){
      bestDist = dist;
      best = obj;
    }
  }
  return best;
}

/**
 * SetIntraAreaGoal — place start goal at door action point
 * or trigger closest point.
 */
export function setIntraAreaGoal(
  creature: ModuleCreature,
  transition: ModuleObject
): InterAreaWaypoint | undefined {
  if(!transition) return undefined;
  const perspace = getPathPersonalSpace(creature);
  let goal = transition.position.clone();
  let range = perspace + 0.5;

  if(BitWise.InstanceOfObject(transition, ModuleObjectType.ModuleDoor)){
    goal = getNearestActionPoint(transition as ModuleDoor, creature.position, creature);
    range = perspace + 0.5;
  }else if(BitWise.InstanceOfObject(transition, ModuleObjectType.ModuleTrigger)){
    const t = transition as ModuleTrigger;
    if(t.box){
      t.box.getCenter(goal);
    }
    range = Math.max(0.5, perspace);
  }

  const dest = resolveTransitionDest(transition);
  return {
    object: transition,
    goal,
    range,
    destAreaId: dest?.destAreaId,
    destModule: dest?.destModule,
  };
}

/**
 * Seed creature.interAreaWaypoints via build inter-area path / DFS.
 * Falls back to nearest transition when no dest specified or DFS fails.
 * Honors creature.interAreaExcludedIds.
 */
export function beginInterAreaPath(
  creature: ModuleCreature,
  preferredModule?: string,
  destAreaId?: number
): boolean {
  const startAreaId = creature.area?.id ?? GameState.module?.area?.id;
  if(typeof startAreaId !== 'number'){
    creature.interAreaWaypoints = [];
    return false;
  }

  // Remember dest for PlotInterAreaPath-style recompute after exclusion
  if(preferredModule){
    creature.interAreaPreferModule = preferredModule.toLowerCase();
  }
  if(typeof destAreaId === 'number'){
    creature.interAreaDestAreaId = destAreaId;
  }

  // Resolve preferred module from dest area name when only area id given
  let prefer = preferredModule || creature.interAreaPreferModule || undefined;
  if(prefer === '') prefer = undefined;
  const destId = typeof destAreaId === 'number'
    ? destAreaId
    : (creature.interAreaDestAreaId >= 0 ? creature.interAreaDestAreaId : undefined);

  if(!prefer && typeof destId === 'number' && destId !== startAreaId){
    const areas = GameState.module?.areas || [];
    const destArea = areas.find((a) => a.id === destId);
    // Same-module area hop — DFS by area id; leave prefer unset
    if(!destArea){
      prefer = undefined;
    }
  }

  const excluded = creature.interAreaExcludedIds;
  clearInterAreaVisitMarks();
  const edges = buildInterAreaPath(startAreaId, destId, prefer, excluded);
  if(edges?.length){
    const wps: InterAreaWaypoint[] = [];
    for(let i = 0; i < edges.length; i++){
      const wp = setIntraAreaGoal(creature, edges[i].object);
      if(wp){
        wp.destAreaId = edges[i].destAreaId;
        wp.destModule = edges[i].destModule;
        wps.push(wp);
      }
    }
    if(wps.length){
      creature.interAreaWaypoints = wps;
      return true;
    }
  }

  // Fallback: nearest transition (depth-1 any), still honoring exclusion
  const transition = findBestTransition(creature, prefer, excluded);
  if(!transition){
    creature.interAreaWaypoints = [];
    return false;
  }
  const wp = setIntraAreaGoal(creature, transition);
  if(!wp){
    creature.interAreaWaypoints = [];
    return false;
  }
  creature.interAreaWaypoints = [wp];
  return true;
}

/**
 * PlotInterAreaPath failed-portal retry:
 * append first hop transition id to the exclusion list, reset path search, recompute.
 * Returns true if a new path was found.
 */
export function excludeFailedInterAreaPortal(
  creature: ModuleCreature,
  portalId: number
): boolean {
  if(!creature || !(portalId >= 0)) return false;
  if(!creature.interAreaExcludedIds.includes(portalId)){
    creature.interAreaExcludedIds.push(portalId);
  }
  creature.interAreaWaypoints = [];
  const prefer = creature.interAreaPreferModule || undefined;
  const destId = creature.interAreaDestAreaId >= 0
    ? creature.interAreaDestAreaId
    : undefined;
  return beginInterAreaPath(creature, prefer, destId);
}

/**
 * Clear inter-area search state (ResetInterAreaSearchData).
 */
export function resetInterAreaSearch(creature: ModuleCreature){
  if(!creature) return;
  creature.interAreaWaypoints = [];
  creature.interAreaExcludedIds = [];
  creature.interAreaDestAreaId = -1;
  creature.interAreaPreferModule = '';
  clearInterAreaVisitMarks();
}

/**
 * Advance / consume the front inter-area waypoint (CheckInterArea shift).
 * Returns the waypoint to move toward, or undefined if list exhausted.
 */
export function advanceInterAreaWaypoint(
  creature: ModuleCreature
): InterAreaWaypoint | undefined {
  const list = creature.interAreaWaypoints;
  if(!list?.length) return undefined;
  if(list.length < 2){
    // : count < 2 → ResetInterAreaSearchData; keep single goal for approach
    return list[0];
  }
  list.shift();
  const next = list[0];
  if(!next) return undefined;
  const refreshed = setIntraAreaGoal(creature, next.object);
  if(refreshed){
    refreshed.destAreaId = next.destAreaId;
    refreshed.destModule = next.destModule;
    list[0] = refreshed;
    return refreshed;
  }
  return next;
}

/**
 * Queue same-module JumpTo for other party members (follow through linked door).
 */
function queuePartyFollowJump(leader: ModuleCreature, linkedId: number, groupId: number){
  const party = GameState.PartyManager?.party;
  if(!party?.length) return;
  for(let i = 0; i < party.length; i++){
    const member = party[i];
    if(!member || member === leader) continue;
    if(member.area !== leader.area) continue;
    member.clearAllActions?.(true);
    const jump = new GameState.ActionFactory.ActionJumpToObject(undefined, groupId);
    jump.setParameter(0, ActionParameterType.DWORD, linkedId);
    jump.setParameter(1, ActionParameterType.INT, 1);
    member.actionQueue.addFront(jump);
  }
}

/**
 * When in use-range of the current inter-area portal: open / transit / jump.
 * Returns true if an action was queued or transition started.
 *
 * Cross-module: OpenDoor then LoadModule (party leader / controlled).
 * Same-module linked door: OpenDoor then JumpToObject(linked).
 * Transition trigger: LoadModule / JumpTo waypoint.
 */
export function tryUseInterAreaTransition(
  creature: ModuleCreature,
  wp: InterAreaWaypoint,
  groupId: number = -1
): boolean {
  const obj = wp?.object;
  if(!creature || !obj) return false;

  if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
    const door = obj as ModuleDoor;

    if(!door.isOpen()){
      const open = new GameState.ActionFactory.ActionOpenDoor(undefined, groupId);
      open.setParameter(0, ActionParameterType.DWORD, door.id);
      // Recheck after open to LoadModule / Jump
      const recheck = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, groupId);
      creature.actionQueue.addFront(recheck);
      creature.actionQueue.addFront(open);
      return true;
    }

    const linkedModule = (door.getLinkedToModule?.() || '').trim();
    if(linkedModule){
      creature.interAreaWaypoints = [];
      resetInterAreaSearch(creature);
      const entry = (door.getLinkedTo?.() || '').toLowerCase();
      const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(creature === pc || creature.controlled){
        GameState.LoadModuleWithAreaTransitionFade(linkedModule.toLowerCase(), entry);
      }else{
        creature.lastDoorEntered = door;
        // Nudge into transit so door onEnter can fire for party members
        door.onEnter?.(creature);
      }
      return true;
    }

    if(isDoorLinked(door)){
      const tag = (door.getLinkedTo?.() || '').trim();
      creature.interAreaWaypoints = [];
      if(tag){
        const linked = GameState.ModuleObjectManager?.GetObjectByTag?.(tag, 0);
        if(linked){
          const jump = new GameState.ActionFactory.ActionJumpToObject(undefined, groupId);
          jump.setParameter(0, ActionParameterType.DWORD, linked.id);
          jump.setParameter(1, ActionParameterType.INT, 1);
          creature.actionQueue.addFront(jump);
          // Party follow through same-module linked door
          const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
          if(creature === pc || creature.controlled){
            queuePartyFollowJump(creature, linked.id, groupId);
          }
        }
      }
      resetInterAreaSearch(creature);
      return true;
    }

    // Open but not a known transition — clear stuck waypoints
    creature.interAreaWaypoints = [];
    return true;
  }

  if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
    const trigger = obj as ModuleTrigger;
    const linkedModule = (trigger.linkedToModule || '').trim();
    if(linkedModule){
      creature.interAreaWaypoints = [];
      resetInterAreaSearch(creature);
      const entry = (trigger.linkedTo || '').toLowerCase();
      const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(creature === pc || creature.controlled){
        GameState.LoadModuleWithAreaTransitionFade(linkedModule.toLowerCase(), entry);
      }else{
        trigger.onEnter?.(creature);
      }
      return true;
    }

    // Same-module transition trigger → JumpTo LinkedTo waypoint
    const tag = (trigger.linkedTo || '').trim();
    if(tag){
      const linked =
        GameState.ModuleObjectManager?.GetObjectByTag?.(tag, 0, NWModuleObjectType.WAYPOINT) ||
        GameState.ModuleObjectManager?.GetObjectByTag?.(tag, 0);
      if(linked){
        creature.interAreaWaypoints = [];
        const jump = new GameState.ActionFactory.ActionJumpToObject(undefined, groupId);
        jump.setParameter(0, ActionParameterType.DWORD, linked.id);
        jump.setParameter(1, ActionParameterType.INT, 1);
        creature.actionQueue.addFront(jump);
        const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
        if(creature === pc || creature.controlled){
          queuePartyFollowJump(creature, linked.id, groupId);
        }
        resetInterAreaSearch(creature);
        return true;
      }
    }
  }

  return false;
}
