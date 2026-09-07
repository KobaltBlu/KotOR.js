/**
 * / get hostile actor helpers.
 * @file last-hostile-actor.ts
 */
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";

/**
 *.
 * @param self - object receiving the hostile actor
 * @param hostileActor - attacker / damager / harmful caster (or undefined to clear)
 * @param force - when true, write without plot/faction/alive checks (CancelCombat clear)
 */
export function assignHostileActor(
  self: ModuleObject,
  hostileActor: ModuleObject | undefined,
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

  let actor: ModuleObject | undefined = hostileActor;
  if(BitWise.InstanceOfObject(hostileActor, ModuleObjectType.ModuleAreaOfEffect)){
    actor = (hostileActor as any).creator;
  }
  if(!BitWise.InstanceOfObject(actor, ModuleObjectType.ModuleCreature)){
    self.combatData.lastHostileActor = undefined;
    return;
  }
  const creature = actor as ModuleCreature;
  if(creature.isDead() || (typeof creature.getDeadTemp === 'function' && creature.getDeadTemp())){
    self.combatData.lastHostileActor = undefined;
    return;
  }
  // Same faction → do not overwrite (faction_id compare)
  if(
    BitWise.InstanceOfObject(self, ModuleObjectType.ModuleCreature) &&
    (self as ModuleCreature).factionId === creature.factionId
  ){
    return;
  }
  self.combatData.lastHostileActor = creature;
}

/**
 * ExecuteCommandget hostile actor — returns last_hostile_actor_id
 * when still a living creature (AOE resolves to creator); clears stale refs.
 */
export function getLastHostileActor(self: ModuleObject): ModuleObject | undefined {
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
  if(BitWise.InstanceOfObject(actor, ModuleObjectType.ModuleAreaOfEffect)){
    actor = (actor as any).creator;
  }
  if(!BitWise.InstanceOfObject(actor, ModuleObjectType.ModuleCreature)){
    assignHostileActor(self, undefined, true);
    return undefined;
  }
  const creature = actor as ModuleCreature;
  if(creature.isDead() || (typeof creature.getDeadTemp === 'function' && creature.getDeadTemp())){
    assignHostileActor(self, undefined, true);
    return undefined;
  }
  return creature;
}
