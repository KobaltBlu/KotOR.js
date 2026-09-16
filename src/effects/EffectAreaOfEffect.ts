import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleAreaOfEffect } from "@/module/ModuleAreaOfEffect";
import type EngineLocation from "@/engine/EngineLocation";

import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectAreaOfEffect — onApply /
 * location path via ApplyEffect.
 *
 * int[0] = vfx_persistent row; string[0..2] = OnEnter / Heartbeat / OnExit overrides;
 * objectList[0] = spawned ModuleAreaOfEffect.
 *
 * @file EffectAreaOfEffect.ts
 */
export class EffectAreaOfEffect extends GameEffect {
  /** When set, onApply places AOE at this location instead of following the host object. */
  applyLocation?: EngineLocation;

  constructor(){
    super();
    this.type = GameEffectType.EffectAreaOfEffect;
  }

  onApply(){
    if(this.applied)
      return;

    const area = GameState.module?.area;
    if(!area) return;

    const aoeId = (this.getInt(0) || 0) & 0xff;
    const host = this.object;
    const isCreatureHost = isCreature(host);

    if(!this.applyLocation && !isCreatureHost){
      return;
    }

    super.onApply();

    // Avoid static import cycle with GameEffectFactory ↔ ModuleAreaOfEffect
    const AoECtor = (area as any).constructor.ModuleAreaOfEffect;
    if(!AoECtor) return;
    const aoe: ModuleAreaOfEffect = new AoECtor();
    aoe.loadFromPersistentRow(aoeId, {
      onEnter: this.getString(0) || '',
      heartbeat: this.getString(1) || '',
      onExit: this.getString(2) || '',
    });
    aoe.creator = this.getCreator() || (isCreatureHost ? host as ModuleCreature : undefined as any);
    aoe.creatorId = aoe.creator?.id ?? -1;
    aoe.spellId = this.getSpellId();
    aoe.duration = this.duration;
    aoe.durationType = this.getDurationType();

    if(this.applyLocation){
      aoe.position.copy(this.applyLocation.position);
      aoe.linkedToObject = undefined as any;
      aoe.linkedToObjectId = -1;
    }else{
      const creature = host as ModuleCreature;
      aoe.position.copy(creature.position);
      aoe.linkedToObject = creature;
      aoe.linkedToObjectId = creature.id;
    }

    GameState.ModuleObjectManager.RegisterObject(aoe);
    area.attachObject(aoe);
    aoe.loadScripts();

    this.setObject(0, aoe);
  }

  onRemove(){
    super.onRemove();
    const aoe = this.getObject(0) as ModuleAreaOfEffect;
    if(aoe && typeof aoe.destroy === 'function'){
      aoe.destroy();
    }
  }
}
