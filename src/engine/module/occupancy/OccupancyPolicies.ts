import { ModuleTriggerType } from "@core/enums/module/ModuleTriggerType";
import type { GameObject } from "@engine/module/GameObject";
import type { AreaEffect } from "@engine/module/AreaEffect";
import type { Encounter } from "@engine/module/Encounter";
import type { Trigger } from "@engine/module/Trigger";
import type { OccupancyTransitionHooks } from "@engine/module/occupancy/PersistentZoneOccupancy";

export class TriggerPolicy implements OccupancyTransitionHooks<GameObject> {
  constructor(private readonly trigger: Trigger) {}

  onEnter(object: GameObject): void {
    // Trap occupants remain tracked even when their enter behavior is rejected.
    if(
      this.trigger.type === ModuleTriggerType.TRAP &&
      !this.trigger.canTrigger(object)
    ){
      return;
    }

    object.lastTriggerEntered = this.trigger;
    this.trigger.lastObjectEntered = object;
    this.trigger.onEnter(object);
    if(this.trigger.type === ModuleTriggerType.TRAP){
      this.trigger.triggered = true;
    }
  }

  onExit(object: GameObject): void {
    object.lastTriggerExited = this.trigger;
    this.trigger.lastObjectExited = object;
    this.trigger.onExit(object);
  }
}

export class AreaEffectPolicy implements OccupancyTransitionHooks<GameObject> {
  constructor(private readonly areaEffect: AreaEffect) {}

  onEnter(object: GameObject): void {
    this.areaEffect.lastEntered = object;
    this.areaEffect.lastEnteredId = object.id;
    this.areaEffect.onEnter(object);
  }

  onExit(object: GameObject): void {
    this.areaEffect.lastLeft = object;
    this.areaEffect.lastLeftId = object.id;
    this.areaEffect.onExit(object);
  }
}

export class EncounterPolicy implements OccupancyTransitionHooks<GameObject> {
  constructor(
    private readonly encounter: Encounter,
    private readonly onHostileEnter: () => void
  ) {}

  onEnter(object: GameObject): void {
    // Membership is unconditional; encounter behavior is hostile-only.
    if(!this.encounter.isHostile(object)) return;
    object.lastTriggerEntered = this.encounter;
    this.encounter.lastObjectEntered = object;
    this.encounter.onEnter(object);
    this.encounter.triggered = true;
    this.encounter.lastEntered = object;
    this.onHostileEnter();
  }

  onExit(object: GameObject): void {
    if(!this.encounter.isHostile(object)) return;
    object.lastTriggerExited = this.encounter;
    this.encounter.lastObjectExited = object;
    this.encounter.onExit(object);
  }
}
