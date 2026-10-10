/**
 * / get hostile actor helpers.
 * @file last-hostile-actor.ts
 */
import type { GameObject } from "@engine/module/GameObject";
import type { Creature } from "@engine/module/Creature";

import { isAreaOfEffect } from "@engine/module/guards/isAreaOfEffect";
import { isCreature } from "@engine/module/guards/isCreature";

/**
 *.
 * @param self - object receiving the hostile actor
 * @param hostileActor - attacker / damager / harmful caster (or undefined to clear)
 * @param force - when true, write without plot/faction/alive checks (CancelCombat clear)
 */
export function assignHostileActor(
  self: GameObject,
  hostileActor: GameObject | undefined,
  force: boolean = false
): void {
  if(force){
    self.combatData.lastHostileActor = hostileActor;
    return;
  }
  if(self.plot){
    self.combatData.lastHostileActor = undefined;
    return;
  }
  if(!hostileActor || hostileActor === self){
    self.combatData.lastHostileActor = undefined;
    return;
  }

  let actor: GameObject | undefined = hostileActor;
  if(isAreaOfEffect(hostileActor)){
    actor = (hostileActor as any).creator;
  }
  if(!isCreature(actor)){
    self.combatData.lastHostileActor = undefined;
    return;
  }
  const creature = actor as Creature;
  if(creature.isDead() || (typeof creature.getDeadTemp === 'function' && creature.getDeadTemp())){
    self.combatData.lastHostileActor = undefined;
    return;
  }
  // Same faction → do not overwrite (faction_id compare)
  if(
    isCreature(self) &&
    (self as Creature).factionId === creature.factionId
  ){
    return;
  }
  self.combatData.lastHostileActor = creature;
}

/**
 * ExecuteCommandget hostile actor — returns last_hostile_actor_id
 * when still a living creature (AOE resolves to creator); clears stale refs.
 */
export function getLastHostileActor(self: GameObject): GameObject | undefined {
  if(self.plot){
    if(self.combatData.lastHostileActor){
      assignHostileActor(self, undefined, true);
    }
    return undefined;
  }

  let actor = self.combatData.lastHostileActor;
  if(!actor){
    return undefined;
  }
  if(isAreaOfEffect(actor)){
    actor = (actor as any).creator;
  }
  if(!isCreature(actor)){
    assignHostileActor(self, undefined, true);
    return undefined;
  }
  const creature = actor as Creature;
  if(creature.isDead() || (typeof creature.getDeadTemp === 'function' && creature.getDeadTemp())){
    assignHostileActor(self, undefined, true);
    return undefined;
  }
  return creature;
}
