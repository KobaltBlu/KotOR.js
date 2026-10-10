import * as THREE from 'three';
import { AutoPauseState } from '@engine/enums/engine/AutoPauseState';
import { GameEffectType } from '@core/enums/effects/GameEffectType';
import { ModuleTriggerType } from '@core/enums/module/ModuleTriggerType';
import { SkillType } from '@core/enums/nwscript/SkillType';
import { MineSkillResult, resolvePassiveMineDetect } from '@engine/actions/mine-skill';
import { drainHeardStringHead } from '@engine/combat/speak-string-broadcast';
import { testStringAgainstPattern } from '@core/utility/listen-pattern';
import { Dice } from '@core/utility/Dice';
import { DiceType } from '@core/enums/combat/DiceType';
import {
  DETECT_FLAG_SEE_INVISIBLE,
  DETECT_FLAG_TRUE_SEEING,
  DETECT_FLAG_ULTRA_VISION,
  getDetectFlags,
} from '@engine/effects/effect-bonuses';
import { isCreatureBlind } from '@engine/effects/EffectBlindness';
import type { EffectSanctuary } from '@engine/effects/EffectSanctuary';
import { PerceptionMask } from '@engine/enums/engine/PerceptionMask';
import { GameState } from '@engine/runtime/GameState';
import type { Creature } from '@engine/module/Creature';
import type { GameObject } from '@engine/module/GameObject';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class CreaturePerceptionService {
  constructor(
    private readonly host: Creature,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  updateListeningPatterns(){

    if(this.host.isDead())
      return;

    const str = this.host.heardStrings[0];
    if(!this.host.isListening || !str){ return;  }

    // TestListenExpression — scan registered expressions in
    // order; first match wins. No exact-string fast path.
    let patternNum: number | undefined;
    let matchedSubstrings: string[] = [];
    for(let i = 0; i < this.host.listeningPatterns.length; i++){
      const entry = this.host.listeningPatterns[i];
      const result = testStringAgainstPattern(entry.pattern, str.string);
      if(result.matched){
        patternNum = entry.number;
        matchedSubstrings = result.substrings;
        break;
      }
    }
    // Always drain the head — unmatched shouts must not stall the queue.
    // BroadcastDialog only enqueues OnDialogue on a match (no backlog).
    drainHeardStringHead(this.host.heardStrings);
    if(typeof patternNum === 'undefined'){ return; }

    this.host.onDialog(str.speaker, patternNum, undefined, matchedSubstrings);
  }

  updatePerceptionList(delta = 0){

    if(this.host.isDead())
      return true;

    if(this.host.room){
      if(!this.host.room.model?.userData?.visActive){
        return;
      }
    }

    if(!this.host.spawned || !getDefaultRuntimeContext().isReadyToProcessEvents()){
      return;
    }

    if(this.host.perceptionTimer < 3){
      this.host.perceptionTimer += 1 * delta;
      return;
    }

    this.host.perceptionTimer = 0;

    //Check modules creatures
    const creatures = this.host.area?.creatures;
    if(!creatures){
      return;
    }
    let creatureLen = creatures.length;
    for(let i = 0; i < creatureLen; i++ ){
      let creature = creatures[i];
      //creature cannot perceive itself
      if(this.host == creature){
        continue;
      }

      if(creature.isDead()){
        this.host.notifyPerceptionSeenObject(creature, false);
        continue;
      }

      let distance = this.host.position.distanceTo(creature.position);
      const stealthed = creature.isStealthedOrInvisible();
      const detected = !stealthed || this.host.doStealthDetection(creature);
      if(distance < this.host.getPerceptionRangePrimary() && this.host.hasLineOfSight(creature) && detected){
        const wasSeen = this.host.hasSeenObject(creature);
        if((this.runtime.getParty?.() ?? []).indexOf(this.host) == -1){
          if(this.host.isHostile(creature)){
            this.host.resetExcitedDuration();
          }
        }
        if(
          this.host == this.runtime.getCurrentPlayer?.() &&
          this.host.isHostile(creature)
        ){
          if(!wasSeen){
            GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.EnemySighted);
          }
          GameState.AutoPauseManager.RefreshEnemySightedLatch();
        }
        
        this.host.notifyPerceptionSeenObject(creature, true);
      }else if(distance < this.host.getPerceptionRangeSecondary() && detected){
        // Listen does not require LOS in; still require contested detect while stealthed
        this.host.notifyPerceptionSeenObject(creature, false);
        this.host.notifyPerceptionHeardObject(creature, true);
      }else{
        this.host.notifyPerceptionSeenObject(creature, false);
      }
    }

    //Check party creatures
    let partyLen = (this.runtime.getParty?.() ?? []).length;
    for(let i = 0; i < partyLen; i++ ){
      let creature = (this.runtime.getParty?.() ?? [])[i];
      //creature cannot perceive itself
      if(this.host == creature){
        continue;
      }

      if(creature.isDead()){
        this.host.notifyPerceptionSeenObject(creature, false);
        continue;
      }

      let distance = this.host.position.distanceTo(creature.position);
      const stealthed = creature.isStealthedOrInvisible();
      const detected = !stealthed || this.host.doStealthDetection(creature);
      if(distance < this.host.getPerceptionRangePrimary() && this.host.hasLineOfSight(creature) && detected){
        if((this.runtime.getParty?.() ?? []).indexOf(this.host) == -1){
          if(this.host.isHostile(creature)){
            this.host.resetExcitedDuration();
          }

          this.host.notifyPerceptionSeenObject(creature, true);
        }
      }else if(distance < this.host.getPerceptionRangeSecondary() && detected){
        this.host.notifyPerceptionSeenObject(creature, false);
        this.host.notifyPerceptionHeardObject(creature, true);
      }else{
        this.host.notifyPerceptionSeenObject(creature, false);
      }
    }

    // Passive trap detect — UpdateMineCheck:
    // Awareness + d10 (or d10+10) vs DetectDC; not ActionFlagMine.
    const detectMode = !!this.host.detectMode;
    const range = detectMode ? 20.0 : 3.0;
    for(let i = 0, triglen = this.host.area.triggers.length; i < triglen; i++){
      const trig = this.host.area.triggers[i];
      if(trig.type != ModuleTriggerType.TRAP){ continue; }
      if(trig.trapDetected){ continue; }
      if(!trig.trapDetectable && !(trig.setByPlayerParty && this.host.isPartyMember())){ continue; }

      const distance = this.host.position.distanceTo(trig.position);
      if(distance > range){ continue; }

      if(trig.setByPlayerParty && this.host.isPartyMember()){
        trig.detectTrap(this.host);
        continue;
      }

      // Hostile / non-friendly traps only (reputation < 90).
      if(typeof (this.host as any).isHostile === 'function' && !this.host.isHostile(trig as any)){
        continue;
      }

      const check = resolvePassiveMineDetect(this.host, trig, { detectMode });
      if(check.result === MineSkillResult.SUCCESS || check.result === MineSkillResult.OWNED){
        trig.detectTrap(this.host);
        if(
          this.host == this.runtime.getCurrentPlayer?.() &&
          check.result === MineSkillResult.SUCCESS
        ){
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.MineSighted);
        }
      }
    }

  }

  hasSeenObject(object: GameObject): boolean {
    if(!object || object === this.host) return true;
    const entry = this.host.perceptionList?.find(
      (o) => o.object === object || o.objectId === object.id
    );
    return !!(entry && (entry.data & PerceptionMask.SEEN));
  }

  isStealthedOrInvisible(): boolean {
    if(this.host.stealthMode) return true;
    if(this.host.hasEffect?.(GameEffectType.EffectInvisibility)) return true;
    if(this.host.hasEffect?.(GameEffectType.EffectSanctuary)) return true;
    return false;
  }

  isInvisibleToObserver(target: Creature): boolean {
    if(!target || this.host === target) return false;

    const detect = getDetectFlags(this.host);
    if(detect & DETECT_FLAG_TRUE_SEEING){
      return false;
    }
    const seeInvis = !!(detect & DETECT_FLAG_SEE_INVISIBLE);
    const pierceDark = !!(detect & (DETECT_FLAG_ULTRA_VISION | DETECT_FLAG_TRUE_SEEING));

    const effects = target.effects || [];
    for(let i = 0; i < effects.length; i++){
      const e = effects[i];
      if(!e) continue;

      if(e.type === GameEffectType.EffectInvisibility){
        const mode = e.getInt(0) || 1;
        // mode 2 (darkness): UltraVision / True Seeing pierce
        if(mode === 2){
          if(!pierceDark) return true;
        }else if(mode === 1 || mode === 4){
          if(!seeInvis) return true;
        }else if(!seeInvis){
          return true;
        }
      }

      if(e.type === GameEffectType.EffectSanctuary){
        const hostile = typeof this.host.isHostile === 'function'
          ? this.host.isHostile(target)
          : (this.host.factionId !== target.factionId);
        if(!hostile) continue;
        const dc = (e as EffectSanctuary).getWillDC?.() || e.getInt(4) || 0;
        if(dc <= 0 || !this.host.willSave(dc, 0, target)){
          return true;
        }
      }
    }

    return false;
  }

  doSpotDetection(target: Creature): boolean {
    if(!target) return false;
    // DoSpotDetection: GetBlind observer fails spot
    if(isCreatureBlind(this.host)){
      return false;
    }
    if(!target.isStealthedOrInvisible()) return true;

    const hideRank = target.getSkillLevel?.(SkillType.STEALTH) || 0;
    if(hideRank < 1 && !target.stealthMode){
      return true;
    }

    const hideDice = Dice.roll(1, DiceType.d10);
    let awareness = this.host.getSkillLevel?.(SkillType.AWARENESS) || 0;
    const detectMode = !!this.host.detectMode;
    if(!detectMode){
      awareness = Math.floor(awareness / 2);
    }
    const spotDice = Dice.roll(1, DiceType.d10);

    let score = awareness + spotDice - hideRank - hideDice;

    const toTarget = target.position.clone().sub(this.host.position);
    toTarget.z = 0;
    if(toTarget.lengthSq() > 0.0001){
      toTarget.normalize();
      const facing = this.host.getFacingVector?.() || new THREE.Vector3(0, 1, 0);
      facing.z = 0;
      if(facing.lengthSq() > 0.0001){
        facing.normalize();
        const dot = toTarget.x * facing.x + toTarget.y * facing.y;
        if(dot < -0.707){
          score -= 5;
        }
      }
    }

    if(this.host.combatData?.combatState || this.host.combatRound?.roundStarted){
      score -= 10;
    }

    const targetMoving = (target.force || 0) > 0.01 || (target.speed || 0) > 0.01;
    const observerMoving = (this.host.force || 0) > 0.01 || (this.host.speed || 0) > 0.01;
    if(!targetMoving) score -= 5;
    if(!observerMoving) score += 5;

    const dist = this.host.position.distanceTo(target.position);
    const distFactor = dist / 3;
    if(distFactor > 2){
      score -= Math.floor(distFactor - 2);
    }

    return score >= 1;
  }

  doListenDetection(target: Creature): boolean {
    return this.host.doSpotDetection(target);
  }

  doStealthDetection(target: Creature): boolean {
    // Effect invisibility / sanctuary not pierced → cannot detect
    if(this.host.isInvisibleToObserver(target)){
      return false;
    }
    if(!target.isStealthedOrInvisible()){
      return true;
    }
    // Contested hide for stealth mode (and residual invis that was pierced)
    return this.host.doSpotDetection(target) || this.host.doListenDetection(target);
  }
}
