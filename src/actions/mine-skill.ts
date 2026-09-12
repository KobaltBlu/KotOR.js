import { DiceType } from "@/enums/combat/DiceType";
import { SignalEventType } from "@/enums";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { Dice } from "@/utility/Dice";

import { isTrigger } from "@/module/guards/isTrigger";

export enum MineSkillResult {
  SUCCESS = 0,
  FAIL = 1,
  FAIL_TRIGGER = 2,
  OWNED = 3,
}

/**
 * Resolve demolitions check against trap DC.
 * Flag : DisarmDC - 5 (flag-mine action)
 * Examine: DisarmDC - 7 (examine-mine action)
 */
export function resolveMineSkillCheck(
  owner: ModuleCreature,
  target: ModuleObject,
  options: { examine?: boolean; flag?: boolean } = {}
): { result: MineSkillResult; roll: number; skill: number; dc: number } {
  const skill = owner.getSkillLevel(SkillType.DEMOLITIONS) | 0;
  const roll = Dice.roll(1, DiceType.d20);

  let dc = 1;
  if(typeof (target as any).trapDisarmDC === 'number' && (target as any).trapDisarmDC > 0){
    dc = (target as any).trapDisarmDC | 0;
  }else if(typeof (target as any).disarmDC === 'number' && (target as any).disarmDC > 0){
    dc = (target as any).disarmDC | 0;
  }

  if(options.flag){
    dc = Math.max(1, dc - 5);
  }else if(options.examine){
    dc = Math.max(1, dc - 7);
  }

  // Own / party-planted traps auto-succeed in disarm/examine/flag paths.
  const creatorId = (target as any).createdBy?.id ?? (target as any).creatorId;
  if(creatorId && creatorId === owner.id){
    return { result: MineSkillResult.OWNED, roll, skill, dc };
  }
  if((target as any).setByPlayerParty && owner.isPartyMember?.()){
    return { result: MineSkillResult.OWNED, roll, skill, dc };
  }

  const total = skill + roll;
  if(dc > 35 || total < dc){
    if(total < dc - 5){
      return { result: MineSkillResult.FAIL_TRIGGER, roll, skill, dc };
    }
    return { result: MineSkillResult.FAIL, roll, skill, dc };
  }

  return { result: MineSkillResult.SUCCESS, roll, skill, dc };
}

/**
 * Passive trap detection (UpdateMineCheck): Awareness + d10 vs DetectDC.
 */
export function resolvePassiveMineDetect(
  owner: ModuleCreature,
  target: ModuleObject,
  options: { detectMode?: boolean } = {}
): { result: MineSkillResult; roll: number; skill: number; dc: number } {
  const skill = owner.getSkillLevel(SkillType.AWARENESS) | 0;
  // Detect mode: d10+10; otherwise d10 (UpdateMineCheck).
  let roll = Dice.roll(1, DiceType.d10);
  if(options.detectMode){
    roll += 10;
  }

  let dc = 1;
  if(typeof (target as any).trapDetectDC === 'number' && (target as any).trapDetectDC > 0){
    dc = (target as any).trapDetectDC | 0;
  }

  if((target as any).setByPlayerParty && owner.isPartyMember?.()){
    return { result: MineSkillResult.OWNED, roll, skill, dc };
  }
  if(typeof (target as any).trapDetected === 'boolean' && (target as any).trapDetected){
    return { result: MineSkillResult.SUCCESS, roll, skill, dc };
  }
  if((target as any).trapFlag){
    return { result: MineSkillResult.SUCCESS, roll, skill, dc };
  }

  if(skill + roll >= dc){
    return { result: MineSkillResult.SUCCESS, roll, skill, dc };
  }
  return { result: MineSkillResult.FAIL, roll, skill, dc };
}

/**
 * Plant check (set-mine action): traps.2da SetDC vs Demolitions + d20.
 * Fail-by-10+ still plants but triggers the trap.
 */
export function resolveMineSetCheck(
  owner: ModuleCreature,
  trapSubType: number = 0
): { result: MineSkillResult; roll: number; skill: number; dc: number } {
  const trap = GameState.SWRuleSet.traps[trapSubType];
  let setDC = 1;
  if(trap){
    if(trap.setdc > 0){
      setDC = trap.setdc;
    }
  }

  let skill = owner.getSkillLevel(SkillType.DEMOLITIONS) | 0;
  // adds +2 when base ranks (unmodified) exceed 4.
  if((owner.getSkillLevel(SkillType.DEMOLITIONS) | 0) > 4){
    skill += 2;
  }

  const roll = Dice.roll(1, DiceType.d20);
  const total = skill + roll;
  if(total >= setDC){
    return { result: MineSkillResult.SUCCESS, roll, skill, dc: setDC };
  }
  if(total < setDC - 10){
    return { result: MineSkillResult.FAIL_TRIGGER, roll, skill, dc: setDC };
  }
  return { result: MineSkillResult.FAIL, roll, skill, dc: setDC };
}

export function signalTrapDisarm(target: ModuleObject, disarmer: ModuleObject){
  if(target){
    target.lastDisarmedBy = disarmer;
  }
  const event = new GameState.GameEventFactory.EventSignalEvent();
  event.setCaller(disarmer);
  event.setObject(target);
  event.setDay(GameState.module.timeManager.pauseDay);
  event.setTime(GameState.module.timeManager.pauseTime);
  event.eventType = SignalEventType.OnDisarm;
  GameState.module.addEvent(event);
}

export function signalTrapTriggered(target: ModuleObject, triggerer: ModuleObject){
  if(isTrigger(target)){
    (target as any).trapTriggered = true;
  }
  const event = new GameState.GameEventFactory.EventSignalEvent();
  event.setCaller(triggerer);
  event.setObject(target);
  event.setDay(GameState.module.timeManager.pauseDay);
  event.setTime(GameState.module.timeManager.pauseTime);
  event.eventType = SignalEventType.OnTrapTriggered;
  GameState.module.addEvent(event);
}

/** Schedule trap destruction (SetFadeOutTime ~2). */
export function fadeDestroyTrap(target: ModuleObject){
  target.setDelayUntilDestroy(2);
  target.setWillDestroy(true);
}

export function runTriggerOnDisarmScript(target: ModuleObject){
  if(!isTrigger(target)){
    return;
  }
  const instance = target.getScriptInstance?.(ModuleObjectScript.TriggerOnDisarm);
  if(instance){
    instance.run(target);
  }
}

export function markTrapDetected(target: ModuleObject, detector?: ModuleObject){
  if(isTrigger(target)){
    (target as any).detectTrap?.(detector);
    return;
  }
  if(detector){
    target.setTrapDetectedBy(detector);
  }else{
    target.trapDetected = true;
  }
}
