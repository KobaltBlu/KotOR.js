import type { Creature } from "@engine/module/Creature";

export class AreaSubAreaPositionFanout {
  static update(creature: Creature): void {
    const triggers = creature.area?.triggers;
    if(triggers){
      for(let i = 0; i < triggers.length; i++){
        triggers[i].updateObjectInside(creature);
      }
    }

    // Trigger transitions are observable before area-effect transitions.
    const areaEffects = creature.area?.areaOfEffects;
    const areaEffectCount = areaEffects?.length || 0;
    for(let i = 0; i < areaEffectCount; i++){
      areaEffects[i].updateObjectInside(creature);
    }
  }
}
