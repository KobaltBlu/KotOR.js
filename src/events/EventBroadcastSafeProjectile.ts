import { GameEvent } from "@/events/GameEvent";
import { GameEventType } from "@/enums/events/GameEventType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { GameState } from "@/GameState";
import { broadcastSafeProjectileSpell } from "@/combat/broadcast-safe-projectile";
import { TalentSpell } from "@/talents";
import * as THREE from "three";

/**
 * EventBroadcastSafeProjectile — retail SpellCastAndImpact →
 * BroadcastSafeProjectile → HandleServerToPlayerSafeProjectileSpell.
 *
 * Single-process: execute() spawns the spells.2da projmodel visual when the
 * cast path did not already attach one via SpellCastInstance.
 *
 * @file EventBroadcastSafeProjectile.ts
 */
export class EventBroadcastSafeProjectile extends GameEvent {

  spellId: number = -1;
  targetId: number = 0x7F000000;
  flightMs: number = 0;
  projectilePath: number = 6;
  origin: THREE.Vector3 = new THREE.Vector3();
  destination: THREE.Vector3 = new THREE.Vector3();
  /** When SpellCastInstance already owns the projectile, skip spawn. */
  alreadySpawned: boolean = false;

  constructor(){
    super();
    this.type = GameEventType.EventBroadcastSafeProjectile;
  }

  eventDataFromStruct(struct: GFFStruct){
    if(!(struct instanceof GFFStruct)) return;
    const num = (label: string, fallback = 0) => {
      const f = struct.getFieldByLabel(label);
      return f ? Number(f.getValue()) : fallback;
    };
    this.spellId = num('SpellId', -1);
    this.targetId = num('TargetId', 0x7F000000);
    this.flightMs = num('FlightMs', 0);
    this.projectilePath = num('PathType', 6);
    if(struct.getFieldByLabel('OriginX')){
      this.origin.set(num('OriginX'), num('OriginY'), num('OriginZ'));
    }
    if(struct.getFieldByLabel('DestX')){
      this.destination.set(num('DestX'), num('DestY'), num('DestZ'));
    }
    this.alreadySpawned = !!num('AlreadySpawned', 0);
  }

  execute(){
    const caster = this.getCaller() || this.getObject();
    if(!caster) return;
    const spell = this.spellId >= 0 ? new TalentSpell(this.spellId) : undefined;
    const target =
      this.targetId !== 0x7F000000
        ? GameState.ModuleObjectManager.GetObjectById(this.targetId)
        : undefined;
    void broadcastSafeProjectileSpell({
      caster,
      target,
      origin: this.origin,
      destination: this.destination,
      spell,
      flightMs: this.flightMs,
      alreadySpawned: this.alreadySpawned,
    });
  }

  export(){
    const struct = new GFFStruct(0xABCD);

    struct.addField(new GFFField(GFFDataType.DWORD, 'CallerId')).setValue(this.exportCallerId());
    struct.addField(new GFFField(GFFDataType.DWORD, 'Day')).setValue(this.day);
    const eventData = struct.addField(new GFFField(GFFDataType.STRUCT, 'EventData'));
    const data = new GFFStruct(0);
    data.addField(new GFFField(GFFDataType.INT, 'SpellId')).setValue(this.spellId);
    data.addField(new GFFField(GFFDataType.DWORD, 'TargetId')).setValue(this.targetId);
    data.addField(new GFFField(GFFDataType.INT, 'FlightMs')).setValue(this.flightMs);
    data.addField(new GFFField(GFFDataType.INT, 'PathType')).setValue(this.projectilePath);
    data.addField(new GFFField(GFFDataType.FLOAT, 'OriginX')).setValue(this.origin.x);
    data.addField(new GFFField(GFFDataType.FLOAT, 'OriginY')).setValue(this.origin.y);
    data.addField(new GFFField(GFFDataType.FLOAT, 'OriginZ')).setValue(this.origin.z);
    data.addField(new GFFField(GFFDataType.FLOAT, 'DestX')).setValue(this.destination.x);
    data.addField(new GFFField(GFFDataType.FLOAT, 'DestY')).setValue(this.destination.y);
    data.addField(new GFFField(GFFDataType.FLOAT, 'DestZ')).setValue(this.destination.z);
    data.addField(new GFFField(GFFDataType.BYTE, 'AlreadySpawned')).setValue(this.alreadySpawned ? 1 : 0);
    eventData.addChildStruct(data);
    struct.addField(new GFFField(GFFDataType.DWORD, 'EventId')).setValue(this.id);
    struct.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(this.exportObjectId());
    struct.addField(new GFFField(GFFDataType.DWORD, 'Time')).setValue(this.time);

    return struct;
  }

}
