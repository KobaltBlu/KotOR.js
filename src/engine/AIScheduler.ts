import { AILevel } from "@/enums/module/AILevel";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { BitWise } from "@/utility/BitWise";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import {
  isForcePushLocoActive,
  isFollowLeaderLocoActive,
} from "@/engine/pathfinding/quick-walk-loco";

/** Per-frame AI budget (microseconds). */
const AI_BUDGET_US = 10000;
/** Fraction of remaining budget each non-zero level may consume. */
const AI_LEVEL_BUDGET_FRACTION = 0.6;
/** Warn when a single aiUpdate exceeds this (microseconds). */
const AI_OVERFLOW_US = 75000;

/**
 * Priority AI scheduler for Module.tick — budgeted `aiUpdate`, every-frame
 * locomotion, and delayed-event drain between object updates.
 *
 * @see Retail CServerAIMaster (Odyssey fidelity reference)
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AIScheduler.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AIScheduler {

  /** Object lists per AILevel 0..4 (append order via addObject). */
  lists: ModuleObject[][] = [[], [], [], [], []];
  /** Persistent round-robin cursor per list. */
  listIndex: number[] = [0, 0, 0, 0, 0];
  /** Frame delta passed into update (seconds). */
  frameDelta: number = 0;

  reset(){
    this.lists = [[], [], [], [], []];
    this.listIndex = [0, 0, 0, 0, 0];
    this.frameDelta = 0;
  }

  /**
   * Register at a level (default VERY_LOW).
   * Removes from the previous list if already registered.
   */
  addObject(object: ModuleObject, level: AILevel = AILevel.VERY_LOW): boolean {
    if(!object) return false;
    if(level < AILevel.VERY_LOW || level > AILevel.VERY_HIGH) return false;

    if(object.aiLevel !== AILevel.INVALID){
      this.removeObject(object);
    }

    const list = this.lists[level];
    if(list.indexOf(object) < 0){
      list.push(object);
    }
    object.aiLevel = level;
    return true;
  }

  removeObject(object: ModuleObject): boolean {
    if(!object || object.aiLevel === AILevel.INVALID) return false;
    const level = object.aiLevel;
    if(level < AILevel.VERY_LOW || level > AILevel.VERY_HIGH){
      object.aiLevel = AILevel.INVALID;
      return false;
    }
    const list = this.lists[level];
    const idx = list.indexOf(object);
    if(idx >= 0){
      list.splice(idx, 1);
      // Keep round-robin index valid after removal
      if(this.listIndex[level] > idx){
        this.listIndex[level]--;
      }
      if(this.listIndex[level] >= list.length){
        this.listIndex[level] = 0;
      }
    }
    object.aiLevel = AILevel.INVALID;
    return true;
  }

  /** No-op if already at that level. */
  setAILevel(object: ModuleObject, level: AILevel): boolean {
    if(!object) return false;
    if(object.aiLevel === level) return true;
    if(level < AILevel.VERY_LOW || level > AILevel.VERY_HIGH) return false;
    return this.addObject(object, level);
  }

  /**
   * Promote eligible area objects from VERY_LOW → LOW when players occupy the area.
   */
  increaseAILevelPriority(objects: ModuleObject[]){
    for(let i = 0; i < objects.length; i++){
      const obj = objects[i];
      if(!obj || obj.aiLevel !== AILevel.VERY_LOW) continue;
      if(this.shouldPromoteOnAreaEntry(obj)){
        this.setAILevel(obj, AILevel.LOW);
      }
    }
  }

  /** Demote level-1 creatures to VERY_LOW when area empties. */
  decreaseAILevelPriority(objects: ModuleObject[]){
    for(let i = 0; i < objects.length; i++){
      const obj = objects[i];
      if(!obj) continue;
      if(
        BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature) &&
        obj.aiLevel === AILevel.LOW
      ){
        this.setAILevel(obj, AILevel.VERY_LOW);
      }
    }
  }

  /** Creatures, AoEs, triggers, transition doors, non-static placeables. */
  shouldPromoteOnAreaEntry(obj: ModuleObject): boolean {
    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)) return true;
    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleAreaOfEffect)) return true;
    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)) return true;
    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
      const door = obj as any;
      return !!(door.getLinkedToModule?.() || door.linkedToModule);
    }
    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
      return !(obj as any).static;
    }
    return false;
  }

  /**
   * Iterates AI levels 4→0 with a 10ms budget; per list runs quick-walk, drains
   * due events, then round-robins aiUpdate until budget or wrap.
   */
  update(delta: number = 0){
    this.frameDelta = delta;
    const module = GameState.module;
    if(!module?.readyToProcessEvents) return;
    module.area?.frameLosCache?.clear();
    module.area?.frameWalkCandidateCache?.clear();

    let remainingUs = AI_BUDGET_US;
    const frameStart = performance.now();

    for(let level = AILevel.VERY_HIGH; level >= AILevel.VERY_LOW; level--){
      const list = this.lists[level];
      if(!list.length) continue;

      // Level 0 gets the remainder; levels 1–4 take up to 60% of remaining.
      let levelBudgetUs: number;
      if(level === AILevel.VERY_LOW){
        levelBudgetUs = remainingUs;
      }else{
        levelBudgetUs = remainingUs * AI_LEVEL_BUDGET_FRACTION;
      }

      const levelStart = performance.now();

      // (a) Quick-walk pass — every moving creature, every frame (not budgeted).
      this.quickWalkPass(list, delta);

      // (b) Round-robin AIUpdate with event drain + budget.
      let firstObject: ModuleObject | undefined;
      let wrapped = false;
      let budgetExhausted = false;

      while(!budgetExhausted && !wrapped){
        this.drainDueEvents();

        const elapsedUs = (performance.now() - levelStart) * 1000;
        if(elapsedUs >= levelBudgetUs){
          budgetExhausted = true;
          break;
        }

        const obj = this.nextObject(level);
        if(!obj){
          wrapped = true;
          break;
        }

        if(!firstObject){
          firstObject = obj;
        }else if(obj === firstObject){
          wrapped = true;
          break;
        }

        const aiStart = performance.now();
        try{
          const aiDelta = this.computeObjectAIDelta(obj, delta);
          obj.aiUpdate(aiDelta);
        }catch(e){
          console.error('AIScheduler.aiUpdate', obj, e);
        }
        const aiElapsedUs = (performance.now() - aiStart) * 1000;
        if(aiElapsedUs > AI_OVERFLOW_US){
          console.warn(
            `AIScheduler: AIUpdate overflow ${aiElapsedUs.toFixed(0)}us > ${AI_OVERFLOW_US}us`,
            obj?.tag ?? obj?.id
          );
        }
      }

      const levelElapsedUs = (performance.now() - levelStart) * 1000;
      remainingUs = Math.max(0, remainingUs - levelElapsedUs);
    }

    void frameStart; // reserved for future profiling
  }

  /**
   * Run TimeStop-exclusion aiUpdates while the game is paused.
   */
  updatePaused(delta: number = 0){
    this.frameDelta = delta;
    if(!GameState.module?.readyToProcessEvents) return;
    if(!GameState.timeStopActive || !GameState.timeStopExclusions?.size) return;

    for(let level = AILevel.VERY_HIGH; level >= AILevel.VERY_LOW; level--){
      const list = this.lists[level];
      for(let i = 0; i < list.length; i++){
        const obj = list[i];
        if(!obj || !GameState.timeStopExclusions.has(obj.id)) continue;
        try{
          const aiDelta = this.computeObjectAIDelta(obj, delta);
          obj.aiUpdate(aiDelta);
        }catch(e){
          console.error('AIScheduler.aiUpdatePaused', obj, e);
        }
      }
    }
  }

  /** Advance round-robin cursor and return the next object (or undefined if empty). */
  private nextObject(level: AILevel): ModuleObject | undefined {
    const list = this.lists[level];
    if(!list.length) return undefined;
    let idx = this.listIndex[level] + 1;
    if(idx >= list.length) idx = 0;
    this.listIndex[level] = idx;
    return list[idx];
  }

  /**
   * Accumulated world delta for an object that may have skipped frames.
   * Falls back to frame delta on first update.
   */
  private computeObjectAIDelta(obj: ModuleObject, frameDelta: number): number {
    const nowMs = this.getWorldTimeMs();
    let delta = frameDelta;
    if(obj._lastAIUpdateWorldMs > 0 && nowMs >= obj._lastAIUpdateWorldMs){
      delta = (nowMs - obj._lastAIUpdateWorldMs) / 1000;
    }
    obj._lastAIUpdateWorldMs = nowMs;
    // Clamp absurd spikes (e.g. after pause / load)
    if(delta > 1) delta = 1;
    if(delta < 0) delta = frameDelta;
    return delta;
  }

  private getWorldTimeMs(): number {
    const tm = GameState.module?.timeManager;
    if(!tm) return performance.now();
    // pauseTime is the in-module millisecond clock used by event scheduling
    return (tm.pauseDay ?? 0) * 86400000 + (tm.pauseTime ?? 0);
  }

  /**
   * Drain all due module events.
   * Called before each aiUpdate so AssignCommand side-effects land first.
   */
  drainDueEvents(){
    const module = GameState.module;
    if(!module?.eventQueue?.length) return;
    const tm = module.timeManager;
    if(!tm) return;

    // Process oldest-first; retail removes head. Our queue is unsorted array —
    // scan and execute all currently due.
    let i = module.eventQueue.length - 1;
    for(; i >= 0; i--){
      const event = module.eventQueue[i];
      if(!event) continue;
      if(tm.getMilisecondsElapsed(event.day, event.time) >= 0){
        try{
          event.execute();
        }catch(e){
          console.error('AIScheduler.drainDueEvents', e);
        }
        module.eventQueue.splice(i, 1);
      }
    }
  }

  /**
   * Every-frame locomotion pass for movers in the list.
   * Head action MoveToPoint / FollowLeader / ForceFollow / Drive,
   * or creature currently in a locomotion animation.
   */
  private quickWalkPass(list: ModuleObject[], delta: number){
    for(let i = 0; i < list.length; i++){
      const obj = list[i];
      if(!obj || !BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)) continue;
      const creature = obj as ModuleCreature;
      if(creature.destroyed || creature.willDestroy) continue;
      if(!this.creatureNeedsQuickWalk(creature)) continue;
      try{
        creature.quickWalkUpdate(delta);
      }catch(e){
        console.error('AIScheduler.quickWalk', creature, e);
      }
    }
  }

  private creatureNeedsQuickWalk(creature: ModuleCreature): boolean {
    // Force Push QuickWalk even while debilitated.
    if(isForcePushLocoActive(creature)){
      return true;
    }
    // FollowLeader loco mode (field438 == 3)
    if(isFollowLeaderLocoActive(creature)){
      return true;
    }
    const action = creature.actionQueue?.[0] ?? creature.action;
    const type = action?.type;
    if(
      type === ActionType.ActionMoveToPoint ||
      type === ActionType.ActionFollowLeader ||
      type === ActionType.ActionForceFollowObject ||
      type === ActionType.ActionDrive
    ){
      return true;
    }
    // Animation-only quick-walk can skip idle movers.
    if(!creature.forceVector || creature.forceVector.lengthSq() <= 0.000001){
      return false;
    }
    const anim = creature.animationState?.index;
    if(
      anim === ModuleCreatureAnimState.WALKING ||
      anim === ModuleCreatureAnimState.WALKING_BACK ||
      anim === ModuleCreatureAnimState.RUNNING
    ){
      return true;
    }
    return false;
  }

}
