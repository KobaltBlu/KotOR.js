import { GameEvent } from "@/events/GameEvent";
import { GameEventType } from "@/enums/events/GameEventType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { GameState } from "@/GameState";
import { TalentSpell } from "@/talents";
import * as THREE from "three";
import { MDLLoader } from "@/loaders";
import { OdysseyModel3D } from "@/three/odyssey";
import { playSpellProjectileTravelAnimation } from "@/combat/combat-projectile";
import { resolveSpellProjectileModelResRef } from "@/combat/spell-projectile-model";
import { sampleSpellProjectilePosition } from "@/combat/spell-projectile-motion";
import { resolveSpellProjectilePathType } from "@/combat/spell-projectile-time";
import { ProjectilePath } from "@/enums/combat/ProjectilePath";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";

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
  /** Optional item id for grenade projmodel fallback. */
  itemId: number = 0;
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
    this.itemId = num('ItemId', 0);
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
    const item =
      this.itemId
        ? GameState.ModuleObjectManager.GetObjectById(this.itemId)
        : undefined;
    void this.broadcastSafeProjectileSpell({
      caster,
      target,
      origin: this.origin,
      destination: this.destination,
      spell,
      item: item as any,
      flightMs: this.flightMs,
      projectilePath: this.projectilePath,
      alreadySpawned: this.alreadySpawned,
    });
  }

  private async broadcastSafeProjectileSpell(opts: {
    caster: ModuleObject;
    target?: ModuleObject;
    origin: THREE.Vector3;
    destination: THREE.Vector3;
    spell: TalentSpell | undefined;
    item?: ModuleItem;
    flightMs: number;
    projectilePath?: number;
    alreadySpawned?: boolean;
  }): Promise<OdysseyModel3D | undefined> {
    if(opts.alreadySpawned) return undefined;
    const projmodel = resolveSpellProjectileModelResRef(opts.spell, opts.item);
    if(!projmodel) return undefined;

    try{
      const mdl = await MDLLoader.loader.load(projmodel.toLowerCase());
      if(!mdl) return undefined;
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: opts.caster.context || GameState,
      });
      if(!model) return undefined;

      (opts.caster.context || GameState).group?.effects?.add(model);
      model.position.copy(opts.origin);
      playSpellProjectileTravelAnimation(model);

      const flight = Math.max(1, opts.flightMs | 0);
      const start = performance.now();
      const from = opts.origin.clone();
      const to = opts.destination.clone();
      const pathType =
        (opts.projectilePath | 0) ||
        resolveSpellProjectilePathType(opts.spell?.projtype) ||
        ProjectilePath.GRENADE;
      const spiralSign = Math.random() < 0.5 ? -1 : 1;
      const lookAhead = new THREE.Vector3();

      const tick = () => {
        const progress = Math.min(1, (performance.now() - start) / flight);
        sampleSpellProjectilePosition(pathType, from, to, progress, model.position, {
          totalMs: flight,
          spiralSign,
        });
        sampleSpellProjectilePosition(
          pathType,
          from,
          to,
          Math.min(1, progress + 0.05),
          lookAhead,
          { totalMs: flight, spiralSign }
        );
        if(lookAhead.distanceToSquared(model.position) > 0.0001){
          model.lookAt(lookAhead);
        }
        if(progress < 1){
          requestAnimationFrame(tick);
        }else{
          try{ model.dispose(); }catch(_e){ /* ignore */ }
        }
      };
      requestAnimationFrame(tick);
      return model;
    }catch(_e){
      return undefined;
    }
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
    data.addField(new GFFField(GFFDataType.DWORD, 'ItemId')).setValue(this.itemId);
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
