import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import type { AreaEffect } from "@engine/module/AreaEffect";
import type EngineLocation from "@engine/runtime/EngineLocation";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectAreaOfEffect — onApply /
 * location path via ApplyEffect.
 *
 * int[0] = vfx_persistent row; string[0..2] = OnEnter / Heartbeat / OnExit overrides;
 * objectList[0] = spawned AreaEffect.
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

    // Avoid static import cycle with GameEffectFactory ↔ AreaEffect
    const AoECtor = (area as any).constructor.AreaEffect;
    if(!AoECtor) return;
    const aoe: AreaEffect = new AoECtor();
    aoe.loadFromPersistentRow(aoeId, {
      onEnter: this.getString(0) || '',
      heartbeat: this.getString(1) || '',
      onExit: this.getString(2) || '',
    });
    aoe.creator = this.getCreator() || (isCreatureHost ? host as Creature : undefined as any);
    aoe.creatorId = aoe.creator?.id ?? -1;
    aoe.spellId = this.getSpellId();
    aoe.duration = this.duration;
    aoe.durationType = this.getDurationType();

    if(this.applyLocation){
      aoe.position.copy(this.applyLocation.position);
      aoe.linkedToObject = undefined as any;
      aoe.linkedToObjectId = -1;
    }else{
      const creature = host as Creature;
      aoe.position.copy(creature.position);
      aoe.linkedToObject = creature;
      aoe.linkedToObjectId = creature.id;
    }

    GameState.GameObjectManager.RegisterObject(aoe);
    area.attachObject(aoe);
    aoe.loadScripts();

    this.setObject(0, aoe);
  }

  onRemove(){
    super.onRemove();
    const aoe = this.getObject(0) as AreaEffect;
    if(aoe && typeof aoe.destroy === 'function'){
      aoe.destroy();
    }
  }
}
