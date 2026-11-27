import * as THREE from 'three';
import { ModuleTriggerType, ScriptHook, SkillType } from '@core/enums';
import type { Area } from '@engine/module/Area';
import type { Creature } from '@engine/module/Creature';
import type { GameObject } from '@engine/module/GameObject';
import { isCreature } from '@engine/module/guards/isCreature';
import { NWScript } from '@engine/nwscript/NWScript';
import type { NWScriptInstance } from '@engine/nwscript/NWScriptInstance';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';
import { applyTrapGroundGeometry, trapKitResRefFromRow } from './trapGroundGeometry';

export class GameObjectTrapService {
  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  addTrap(
    nTrapId: number = -1,
    owner: GameObject,
    bindTriggeredScript: (script: NWScriptInstance) => ScriptHook | undefined,
  ){
    const trap = this.runtime.getTrapRow?.(nTrapId);
    if(!trap) return;
    if(trap.trapscript?.length && trap.trapscript != '****'){
      const nwscript = NWScript.Load(trap.trapscript);
      if(nwscript){
        const trapKey = bindTriggeredScript(nwscript);
        if(trapKey){
          this.host.scripts[trapKey] = nwscript;
          nwscript.bindOwner(this.host, trapKey);
        }
      }
    }

    this.host.trapType = nTrapId;
    this.host.trapCreator = owner;
    this.host.trapFlag = true;
    this.host.ownerDemolitions = owner.getSkillLevel(SkillType.DEMOLITIONS);
    const d20 = 20;
    this.host.trapDetectDC = trap.detectdcmod + d20 + this.host.ownerDemolitions;
    this.host.trapDetectable = true;
    this.host.trapDisarmDC = trap.disarmdcmod + d20 + this.host.ownerDemolitions;
    this.host.trapDisarmable = true;

    const trigger = this.runtime.createTrigger();
    if(!trigger) return;
    trigger.initialized = true;
    trigger.name = this.runtime.getStringById?.(trap.name);
    trigger.factionId = owner.factionId;
    trigger.type = ModuleTriggerType.TRAP;
    trigger.trapType = nTrapId;
    trigger.setByPlayerParty = owner.isPartyMember();
    trigger.trapDetectDC = this.host.trapDetectDC;
    trigger.trapDisarmDC = this.host.trapDisarmDC;
    trigger.trapDetectable = true;
    trigger.trapDisarmable = true;
    trigger.ownerDemolitions = -1;
    trigger.trapCreator = owner;
    trigger.position.copy(this.host.position);
    trigger.linkedToObject = this.host;
    this.host.linkedToObject = trigger;
    trigger.trapResRef = trapKitResRefFromRow(trap);
    applyTrapGroundGeometry(trigger);
    trigger.load();
    this.host.area?.attachObject(trigger);
  }

  static plantGroundTrap(
    area: Area,
    nTrapId: number,
    position: THREE.Vector3 | { x: number; y: number; z: number },
    owner: GameObject,
    runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ){
    if(!area) return undefined;
    const trap = runtime.getTrapRow?.(nTrapId);
    if(!trap) return undefined;
    const ownerDemolitions = owner.getSkillLevel(SkillType.DEMOLITIONS);
    const trigger = runtime.createTrigger();
    if(!trigger) return undefined;
    trigger.initialized = true;
    trigger.name = runtime.getStringById?.(trap.name);
    trigger.factionId = owner.factionId;
    trigger.type = ModuleTriggerType.TRAP;
    trigger.trapType = nTrapId;
    trigger.setByPlayerParty = owner.isPartyMember();
    trigger.trapDetectDC = trap.detectdcmod + 20 + ownerDemolitions;
    trigger.trapDisarmDC = trap.disarmdcmod + 20 + ownerDemolitions;
    trigger.trapDetectable = true;
    trigger.trapDisarmable = true;
    trigger.ownerDemolitions = ownerDemolitions;
    trigger.trapCreator = owner;
    trigger.position.set(position.x, position.y, position.z);
    if(trap.trapscript?.length && trap.trapscript != '****'){
      const nwscript = NWScript.Load(trap.trapscript);
      trigger.scripts[ScriptHook.TriggerOnTrapTriggered] = nwscript;
      if(nwscript) nwscript.bindOwner(trigger, ScriptHook.TriggerOnTrapTriggered);
    }
    trigger.trapResRef = trapKitResRefFromRow(trap);
    applyTrapGroundGeometry(trigger);
    trigger.load();
    area.attachObject(trigger);
    return trigger;
  }

  setTrapDetectedBy(detector: GameObject): boolean {
    if(!detector || detector.id == null) return false;
    if(this.host.trapDetectedByIds.indexOf(detector.id) < 0){
      this.host.trapDetectedByIds.push(detector.id);
    }
    this.host.trapDetected = true;
    if(isCreature(detector)) (detector as Creature).lastTrapDetected = this.host;
    return true;
  }

  isTrapDetectedBy(creature: GameObject): boolean {
    return !!creature && creature.id != null &&
      this.host.trapDetectedByIds.indexOf(creature.id) >= 0;
  }
}
