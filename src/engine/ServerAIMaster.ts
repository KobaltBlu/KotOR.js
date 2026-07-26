import { AILevel } from "@/enums/module/AILevel";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { BitWise } from "@/utility/BitWise";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";

/** Retail CServerAIMaster::UpdateState total per-frame budget (microseconds). */
const AI_BUDGET_US = 10000;
/** Fraction of remaining budget each non-zero level may consume. */
const AI_LEVEL_BUDGET_FRACTION = 0.6;
/** Warn when a single aiUpdate exceeds this (microseconds) — retail 75000. */
const AI_OVERFLOW_US = 75000;

/**
 * ServerAIMaster — port of retail CServerAIMaster (UpdateState @ 004b0b70).
 *
 * Five AI-priority lists with time-budgeted round-robin AIUpdate scheduling,
 * an every-frame quick-walk pass for moving creatures, and event-queue draining
 * between object updates.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ServerAIMaster.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ServerAIMaster {

  /** Object id lists per AILevel 0..4 (append order via AddUnique). */
  static lists: ModuleObject[][] = [[], [], [], [], []];
  /** Persistent round-robin cursor per list. */
  static listIndex: number[] = [0, 0, 0, 0, 0];
  /** Frame delta passed into updateState (seconds). */
  static frameDelta: number = 0;

  static Reset(){
    this.lists = [[], [], [], [], []];
    this.listIndex = [0, 0, 0, 0, 0];
    this.frameDelta = 0;
  }

  /**
   * Retail CServerAIMaster::AddObject — register at a level (default VERY_LOW).
   * Removes from the previous list if already registered.
   */
  static addObject(object: ModuleObject, level: AILevel = AILevel.VERY_LOW): boolean {
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

  /**
   * Retail CServerAIMaster::RemoveObject.
   */
  static removeObject(object: ModuleObject): boolean {
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

  /**
   * Retail CServerAIMaster::SetAILevel — no-op if already at that level.
   */
  static setAILevel(object: ModuleObject, level: AILevel): boolean {
    if(!object) return false;
    if(object.aiLevel === level) return true;
    if(level < AILevel.VERY_LOW || level > AILevel.VERY_HIGH) return false;
    return this.addObject(object, level);
  }

  /**
   * Retail IncreaseAILevelPriority — promote eligible area objects from VERY_LOW → LOW
   * when players occupy the area.
   */
  static increaseAILevelPriority(objects: ModuleObject[]){
    for(let i = 0; i < objects.length; i++){
      const obj = objects[i];
      if(!obj || obj.aiLevel !== AILevel.VERY_LOW) continue;
      if(this.shouldPromoteOnAreaEntry(obj)){
        this.setAILevel(obj, AILevel.LOW);
      }
    }
  }

  /**
   * Retail DecreaseAILevelPriority — demote level-1 creatures to VERY_LOW when area empties.
   */
  static decreaseAILevelPriority(objects: ModuleObject[]){
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
  static shouldPromoteOnAreaEntry(obj: ModuleObject): boolean {
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
   * Retail CServerAIMaster::UpdateState @ 004b0b70.
   * Iterates AI levels 4→0 with a 10ms budget; per list runs quick-walk, drains
   * due events, then round-robins aiUpdate until budget or wrap.
   */
  static updateState(delta: number = 0){
    this.frameDelta = delta;
    const module = GameState.module;
    if(!module?.readyToProcessEvents) return;

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
          console.error('ServerAIMaster.aiUpdate', obj, e);
        }
        const aiElapsedUs = (performance.now() - aiStart) * 1000;
        if(aiElapsedUs > AI_OVERFLOW_US){
          console.warn(
            `ServerAIMaster: AIUpdate overflow ${aiElapsedUs.toFixed(0)}us > ${AI_OVERFLOW_US}us`,
            obj?.tag ?? obj?.id
          );
        }
      }

      const levelElapsedUs = (performance.now() - levelStart) * 1000;
      remainingUs = Math.max(0, remainingUs - levelElapsedUs);
    }

    void frameStart; // reserved for future profiling mirrors of retail timers
  }

  /**
   * Run TimeStop-exclusion aiUpdates while the game is paused (retail exclusion list).
   */
  static updateStatePaused(delta: number = 0){
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
          console.error('ServerAIMaster.aiUpdatePaused', obj, e);
        }
      }
    }
  }

  /** Advance round-robin cursor and return the next object (or undefined if empty). */
  private static nextObject(level: AILevel): ModuleObject | undefined {
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
  private static computeObjectAIDelta(obj: ModuleObject, frameDelta: number): number {
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

  private static getWorldTimeMs(): number {
    const tm = GameState.module?.timeManager;
    if(!tm) return performance.now();
    // pauseTime is the in-module millisecond clock used by event scheduling
    return (tm.pauseDay ?? 0) * 86400000 + (tm.pauseTime ?? 0);
  }

  /**
   * Drain all due module events (retail event_queue head compare ≤ now).
   * Called before each aiUpdate so AssignCommand side-effects land first.
   */
  static drainDueEvents(){
    const module = GameState.module;
    if(!module?.eventQueue?.length) return;
    const tm = module.timeManager;
    if(!tm) return;

    // Process oldest-first; retail removes head. Our queue is unsorted array —
    // scan and execute all currently due, same as Module.tick did.
    let i = module.eventQueue.length - 1;
    for(; i >= 0; i--){
      const event = module.eventQueue[i];
      if(!event) continue;
      if(tm.getMilisecondsElapsed(event.day, event.time) >= 0){
        try{
          event.execute();
        }catch(e){
          console.error('ServerAIMaster.drainDueEvents', e);
        }
        module.eventQueue.splice(i, 1);
      }
    }
  }

  /**
   * Retail WalkUpdateLocation_QuickWalk pass — every frame for movers in the list.
   * Head action MoveToPoint (1) / FollowLeader (0x3D) / ForceFollow / Drive,
   * or creature currently in a locomotion animation.
   */
  private static quickWalkPass(list: ModuleObject[], delta: number){
    for(let i = 0; i < list.length; i++){
      const obj = list[i];
      if(!obj || !BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)) continue;
      const creature = obj as ModuleCreature;
      if(creature.destroyed || creature.willDestroy) continue;
      if(!this.creatureNeedsQuickWalk(creature)) continue;
      try{
        creature.quickWalkUpdate(delta);
      }catch(e){
        console.error('ServerAIMaster.quickWalk', creature, e);
      }
    }
  }

  private static creatureNeedsQuickWalk(creature: ModuleCreature): boolean {
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
    // Retail field427_0xa8c ∈ {4,5,6} — locomotion / drive states. Map to anim states.
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
