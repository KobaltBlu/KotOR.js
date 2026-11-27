import * as THREE from 'three';
import { ScriptHook } from '@core/enums';
import { getSpeakStringNotifyPlan, listenerHearsSpeaker } from '@engine/combat/speak-string-broadcast';
import { PerceptionMask } from '@engine/enums/engine/PerceptionMask';
import { TalkVolume } from '@engine/enums/engine';
import type { Creature } from '@engine/module/Creature';
import type { GameObject } from '@engine/module/GameObject';
import { isCreature } from '@engine/module/guards/isCreature';
import type { NWScriptInstance } from '@engine/nwscript/NWScriptInstance';
import { hasVisualLos } from '@engine/pathfinding/visual-los';
import { isStaticWalkClearDetailed } from '@engine/pathfinding/static-walk-blockers';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class GameObjectPerceptionService {
  private readonly tmpPositionA = new THREE.Vector3();
  private readonly tmpPositionB = new THREE.Vector3();

  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  getPerceptionRangePrimary(){
    if(!this.host.perceptionRange){ return 1; }
    return this.host.perceptionRange.primaryRange;
  }

  getPerceptionRangeSecondary(){
    if(!this.host.perceptionRange){ return 1; }
    return this.host.perceptionRange.secondaryRange;
  }

  /**
   * Initialize the perception list.
   * SaveCreature writes every non-null
   * verbatim (including stale / OBJECT_INVALID ids). Resolve object refs when
   * possible, but never prune unresolved nodes — they must round-trip on save.
   */
  initPerceptionList(){
    let length = this.host.perceptionList.length;
    while(length--){
      let perceptionObject = this.host.perceptionList[length];
      if(perceptionObject){
        if(typeof perceptionObject.object == 'undefined' && perceptionObject.objectId){
          const resolved = this.runtime.getById(perceptionObject.objectId);
          if(resolved){
            perceptionObject.object = resolved;
          }
          // else leave object undefined; keep objectId/data for save round-trip
        }
      }
    }
  }

  notifyPerceptionHeardObject(object: GameObject, heard = false){
    if(!object) return;

    let triggerOnNotice = false;
    let exists = this.host.perceptionList.filter( (o) => o.object == object );
    if(exists.length){
      let existingObject = exists[0];
      const wasHeard = !!(existingObject.data & PerceptionMask.HEARD);
      triggerOnNotice = (wasHeard != heard);
      if(heard){
        existingObject.data |= PerceptionMask.HEARD;
      }else{
        existingObject.data &= ~PerceptionMask.HEARD;
      }
    }else{
      if(heard){
        let newObject = {
          object: object,
          objectId: object.id,
          data: PerceptionMask.HEARD
        };
        this.host.perceptionList.push(newObject);
        triggerOnNotice = true;
        if(object.isPlayer && this.host.isHostile(object)){
          this.host.area?.subtractStealthXP();
        }
      }else{
        if(object.isPlayer && this.host.isHostile(object)){
          this.host.area?.addStealthXP();
        }
      }
    }

    let onNotice: NWScriptInstance;
    if(isCreature(this.host)){
      onNotice = this.host.scripts[ScriptHook.CreatureOnNotice];
    }

    if(triggerOnNotice && onNotice){
      // sets discrete event flags (0x904 Heard / 0x90c Inaudible) — not cumulative list bits
      onNotice.lastPerceived = {
        object: object,
        objectId: object.id,
        data: heard ? PerceptionMask.HEARD : PerceptionMask.INAUDIBLE
      };
      onNotice.run(this.host);
      return true;
    }
  }

  notifyPerceptionSeenObject(object: GameObject, seen = false){
    if(!object) return;

    let triggerOnNotice = false;
    let exists = this.host.perceptionList.filter( (o) => o.object == object );
    if(exists.length){
      let existingObject = exists[0];
      const wasSeen = !!(existingObject.data & PerceptionMask.SEEN);
      triggerOnNotice = (wasSeen != seen);
      if(seen){
        existingObject.data |= PerceptionMask.SEEN;
      }else{
        existingObject.data &= ~PerceptionMask.SEEN;
      }
    }else{
      if(seen){
        let newObject = {
          object: object,
          objectId: object.id,
          data: PerceptionMask.SEEN
        };
        this.host.perceptionList.push(newObject);
        triggerOnNotice = true;
        if(object.isPlayer && this.host.isHostile(object)){
          this.host.area?.subtractStealthXP();
        }
      }else{
        if(object.isPlayer && this.host.isHostile(object)){
          this.host.area?.addStealthXP();
        }
      }
    }

    let onNotice: NWScriptInstance;
    if(isCreature(this.host)){
      onNotice = this.host.scripts[ScriptHook.CreatureOnNotice];
    }

    if(triggerOnNotice && onNotice){
      // sets discrete event flags (0x908 Seen / 0x910 Vanished)
      onNotice.lastPerceived = {
        object: object,
        objectId: object.id,
        data: seen ? PerceptionMask.SEEN : PerceptionMask.INVISIBLE
      };
      onNotice.run(this.host);
      return true;
    }
  }

  speakString(str: string, volume: TalkVolume){
    // BroadcastDialog — area objects in range with
    // listening set. Party members live in PartyManager.party (not always in
    // area.creatures), so they must be notified for every volume that notifies.
    const plan = getSpeakStringNotifyPlan(volume);
    const talkVolume = volume;
    const rangeSquared = plan.range * plan.range;
    // Keep original case — captures slice from the original-case
    // input; matching lowercases internally when case-insensitive.
    const spoken = str;
    const notified = new Set<number>();

    const pushHeard = (creature: any, requireHeardPerception: boolean) => {
      if(!creature || creature === (this.host as any) || creature.isDead?.()) return;
      const id = creature.id;
      if(id != null){
        if(notified.has(id)) return;
        notified.add(id);
      }
      const d2 = this.host.position.distanceToSquared(creature.position);
      if(d2 > rangeSquared) return;
      // : creature→creature needs HEARD visibility bit. Party path skips
      // (forces mutual party perception).
      if(requireHeardPerception && !listenerHearsSpeaker(creature, this.host)) return;
      creature.heardStrings.push({
        speaker: this.host,
        string: spoken,
        volume: talkVolume
      });
    };

    if(plan.notifyParty){
      const party = this.runtime.getParty?.() ?? [];
      for(let i = 0, len = party.length; i < len; i++){
        pushHeard(party[i], false);
      }
    }

    if(plan.notifyCreatures){
      const creatures = this.host.area?.creatures;
      if(creatures){
        for(let i = 0, len = creatures.length; i < len; i++){
          pushHeard(creatures[i], true);
        }
      }
    }
  }

  setListening(bListenting = false){
    this.host.isListening = bListenting ? true : false;
  }

  /**
   * Set the listening pattern (SetListenExpression).
   * Re-parses in place when the pattern number already exists.
   */
  setListeningPattern(sString = '', iNum = 0){
    const number = iNum | 0;
    const pattern = typeof sString === 'string' ? sString : '';
    for(let i = 0; i < this.host.listeningPatterns.length; i++){
      if(this.host.listeningPatterns[i].number === number){
        this.host.listeningPatterns[i].pattern = pattern;
        return;
      }
    }
    this.host.listeningPatterns.push({ pattern, number });
  }

  /** Clear matched substrings (ClearMatchedExpressionStrings). */
  clearMatchedSubstrings(){
    this.host.matchedSubstrings = [];
  }

  /** Store listen-match captures for GetMatchedSubstring (EventHandler case 7). */
  setMatchedSubstrings(substrings: string[]){
    this.host.matchedSubstrings = substrings ? substrings.slice() : [];
  }

  getIsListening(){
    return this.host.isListening ? true : false;
  }

  /**
   * Check if the object has line of sight to another object.
   * visual LOS / hasVisualLos (combat / GetIsInUseRange) uses eye
   * height ~1.5 and does not clamp to perception range — pass
   * ignorePerceptionRange for those. GetIsInUseRange rays to the GetUseRange
   * point (doors/placeables), not object origin.
   */
  hasLineOfSight(
    oTarget: GameObject,
    max_distance = 30,
    opts?: {
      ignorePerceptionRange?: boolean;
      eyeHeight?: number;
      /** visual LOS / hasVisualLos excludes source + target object ids from hits. */
      ignoreObject?: GameObject;
      /** End point override (GetIsInUseRange → nearest action point). */
      toPosition?: THREE.Vector3;
      /**
       * Skip room walkmesh face tests. Use-range visual LOS / hasVisualLos is
       * static walk blockers (detailed), not a full walkable-face raycast — room meshes
       * false-block short door/placeable interactions.
       */
      skipRoomWalkmesh?: boolean;
    }
  ){
    if(!this.host.spawned || !this.runtime.isReadyToProcessEvents())
      return false;

    if(!oTarget){
      return false;
    }

    const eyeHeight = typeof opts?.eyeHeight === 'number' ? opts.eyeHeight : 1;
    const ignoreObject = opts?.ignoreObject ?? oTarget;
    this.tmpPositionA.copy(this.host.position);
    if(opts?.toPosition){
      this.tmpPositionB.copy(opts.toPosition);
    }else{
      this.tmpPositionB.copy(oTarget.position);
    }
    // Distance check uses eye-adjusted endpoints for range only
    const distance = Math.hypot(
      this.tmpPositionB.x - this.tmpPositionA.x,
      this.tmpPositionB.y - this.tmpPositionA.y,
      (this.tmpPositionB.z + eyeHeight) - (this.tmpPositionA.z + eyeHeight)
    );
    if(distance < 0.05){
      return true;
    }

    if(!opts?.ignorePerceptionRange && this.host.perceptionRange){
      const primaryRange = this.getPerceptionRangePrimary();
      if(distance > primaryRange){
        return false;
      }
      max_distance = primaryRange;
    }else{
      if(distance > max_distance){
        return false;
      }
    }

    if(!this.host.area){
      return false;
    }

    if(opts?.skipRoomWalkmesh){
      // Use-range: Detailed-only (personal_space 0.001), no AABB LOS
      const ignoreIds = [this.host.id, ignoreObject?.id].filter((id) => id != null) as number[];
      if(isCreature(this.host)){
        const ignoreDoor = ((this.host as unknown) as Creature).pathFindIgnoreObjectId | 0;
        if(ignoreDoor) ignoreIds.push(ignoreDoor);
      }
      const a = this.tmpPositionA.clone();
      const b = this.tmpPositionB.clone();
      a.z += eyeHeight;
      b.z += eyeHeight;
      return isStaticWalkClearDetailed(this.host.area, a, b, {
        personalSpace: 0.001,
        ignoreObjectIds: ignoreIds,
        skipMesh: true,
      }).clear;
    }

    return hasVisualLos(this.host.area, this.tmpPositionA, this.tmpPositionB, {
      eyeHeight,
      ignoreSource: this.host,
      ignoreObject,
    });
  }
}
