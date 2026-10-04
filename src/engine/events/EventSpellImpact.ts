import { GameState } from "@engine/runtime/GameState";
import { GameEvent } from "@engine/events/GameEvent";
import { GameEventType } from "@core/enums/events/GameEventType";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFField } from "@core/resource/GFFField";
import { GFFStruct } from "@core/resource/GFFStruct";
import { ModuleObjectConstant } from "@core/enums/module/ModuleObjectConstant";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModuleObject } from "@engine/module/ModuleObject";
import type { TalentSpell } from "@engine/talents/TalentSpell";
import * as THREE from "three";

import { isCreature } from "@engine/module/guards/isCreature";
import { isObject } from "@engine/module/guards/isObject";

/**
 * EventSpellImpact — SpellCastAndImpact AddEventDeltaTime type 0x08.
 * Runs the spell impactscript after CalculateLastSpellProjectileTime delay.
 *
 * @file EventSpellImpact.ts
 */
export class EventSpellImpact extends GameEvent {

  spellId: number = -1;
  impactScript: string = '';
  targetId: number = ModuleObjectConstant.OBJECT_INVALID;
  itemId: number = ModuleObjectConstant.OBJECT_INVALID;
  impactPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(){
    super();
    this.type = GameEventType.EventSpellImpact;
  }

  eventDataFromStruct(struct: GFFStruct){
    if(!(struct instanceof GFFStruct)) return;
    const num = (label: string, fallback = 0) => {
      const f = struct.getFieldByLabel(label);
      return f ? Number(f.getValue()) : fallback;
    };
    const str = (label: string) => {
      const f = struct.getFieldByLabel(label);
      return f ? String(f.getValue() ?? '') : '';
    };
    this.spellId = num('SpellId', -1);
    this.impactScript = str('ImpactScript');
    this.targetId = num('TargetId', ModuleObjectConstant.OBJECT_INVALID);
    this.itemId = num('ItemId', ModuleObjectConstant.OBJECT_INVALID);
    this.impactPosition.set(num('PosX'), num('PosY'), num('PosZ'));
  }

  execute(){
    const caster = this.getCaller();
    if(!caster) return;

    const scriptName = String(this.impactScript || '').trim();
    if(!scriptName || scriptName === '****') return;

    // Stamp spell-target fields before the impactscript runs
    caster.spellTargetPosition.copy(this.impactPosition);
    if(isCreature(caster)){
      const cre = caster as ModuleCreature;
      if(this.itemId !== ModuleObjectConstant.OBJECT_INVALID){
        const item = GameState.ModuleObjectManager.GetObjectById(this.itemId);
        if(item) cre.spellCastItem = item as any;
      }
    }

    let spell: TalentSpell | undefined;
    if(this.spellId >= 0){
      spell = new GameState.TalentSpell(this.spellId);
      if(this.targetId !== ModuleObjectConstant.OBJECT_INVALID){
        const target = GameState.ModuleObjectManager.GetObjectById(this.targetId);
        if(isObject(target)){
          spell.oTarget = target as ModuleObject;
        }
      }else{
        spell.oTarget = undefined;
      }
    }

    const instance = GameState.NWScript.Load(scriptName);
    if(!instance) return;
    instance.talent = spell;
    instance.run(caster, 0);
  }

  export(){
    const struct = new GFFStruct(0xABCD);
    struct.addField(new GFFField(GFFDataType.DWORD, 'CallerId')).setValue(this.exportCallerId());
    struct.addField(new GFFField(GFFDataType.DWORD, 'Day')).setValue(this.day);
    const eventData = struct.addField(new GFFField(GFFDataType.STRUCT, 'EventData'));
    const data = new GFFStruct(0);
    data.addField(new GFFField(GFFDataType.INT, 'SpellId')).setValue(this.spellId);
    data.addField(new GFFField(GFFDataType.CEXOSTRING, 'ImpactScript')).setValue(this.impactScript);
    data.addField(new GFFField(GFFDataType.DWORD, 'TargetId')).setValue(this.targetId);
    data.addField(new GFFField(GFFDataType.DWORD, 'ItemId')).setValue(this.itemId);
    data.addField(new GFFField(GFFDataType.FLOAT, 'PosX')).setValue(this.impactPosition.x);
    data.addField(new GFFField(GFFDataType.FLOAT, 'PosY')).setValue(this.impactPosition.y);
    data.addField(new GFFField(GFFDataType.FLOAT, 'PosZ')).setValue(this.impactPosition.z);
    eventData.addChildStruct(data);
    struct.addField(new GFFField(GFFDataType.DWORD, 'EventId')).setValue(this.id);
    struct.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(this.exportObjectId());
    struct.addField(new GFFField(GFFDataType.DWORD, 'Time')).setValue(this.time);
    return struct;
  }
}

/**
 * Schedule SpellCastAndImpact delayed impactscript (event type 0x08).
 */
export function scheduleSpellImpactEvent(opts: {
  caster: ModuleObject;
  spell: TalentSpell | undefined;
  target?: ModuleObject;
  itemId?: number;
  impactPosition: THREE.Vector3;
  delayMs: number;
}): void {
  if(!GameState.module?.timeManager) return;
  const script = String(opts.spell?.impactscript || '').trim();
  if(!script || script === '****') return;

  const delaySec = Math.max(0, (opts.delayMs | 0) / 1000);
  const future = GameState.module.timeManager.getFutureTimeFromSeconds(delaySec);
  const evt = new GameState.GameEventFactory.EventSpellImpact() as EventSpellImpact;
  evt.setCaller(opts.caster);
  evt.setObject(opts.caster);
  evt.setDay(future.pauseDay);
  evt.setTime(future.pauseTime);
  evt.spellId = opts.spell?.id ?? -1;
  evt.impactScript = script;
  evt.targetId = opts.target?.id ?? ModuleObjectConstant.OBJECT_INVALID;
  evt.itemId = opts.itemId ?? ModuleObjectConstant.OBJECT_INVALID;
  evt.impactPosition.copy(opts.impactPosition);
  GameState.module.addEvent(evt);
}
