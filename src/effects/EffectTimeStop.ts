import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { EngineState } from "@/enums/engine";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectTimeStop — effect apply / OnRemove.
 *
 * K1 has no NWScript EffectTimeStop (unused by stock scripts), but handlers
 * exist: pause bit + exclusion list so the host keeps updating while others freeze.
 *
 * @file EffectTimeStop.ts
 */
export class EffectTimeStop extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTimeStop;
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;

    // Pause already in TimeStop: extend existing Timestop on this object only
    if(GameState.timeStopActive){
      const existing = (creature.effects || []).find(
        e => e?.applied && e.type === GameEffectType.EffectTimeStop && e !== this
      );
      if(existing && this.duration > 0){
        existing.setDuration((existing.duration || 0) + this.duration);
        if(this.expireDay || this.expireTime){
          existing.setExpireDay(this.expireDay);
          existing.setExpireTime(this.expireTime);
        }
      }
      return;
    }

    super.onApply();
    if(!GameState.timeStopExclusions){
      GameState.timeStopExclusions = new Set<number>();
    }
    GameState.timeStopExclusions.add(creature.id);
    GameState.timeStopActive = true;
    GameState.timeStopPausedByEffect = true;
    GameState.State = EngineState.PAUSED;
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      GameState.timeStopExclusions?.delete((this.object as ModuleCreature).id);
    }
    // TogglePauseState(1) + RemoveFromExclusionList
    if(GameState.timeStopPausedByEffect){
      GameState.State = EngineState.RUNNING;
      GameState.timeStopPausedByEffect = false;
    }
    GameState.timeStopActive = false;
    GameState.timeStopExclusions?.clear();
  }
}

/** True if this creature should keep acting under TimeStop (exclusion list). */
export function isTimeStopExcluded(creature: ModuleCreature): boolean {
  if(!GameState.timeStopActive) return false;
  return !!GameState.timeStopExclusions?.has(creature.id)
    || !!creature.hasEffect?.(GameEffectType.EffectTimeStop);
}
