import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectSetStateType } from "@core/enums/effects/GameEffectSetStateType";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import { isSetStateImmune, rebalanceSetState, SET_STATE_OUTER_AI_ACTIVITY_MASK } from "@engine/effects/set-state";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectSetState — outer type 0x08 (onApply / onRemove).
 * int[0] = GameEffectSetStateType; int[1] != 0 → cutscene
 * (skip stun / paralyze / horror immunities).
 *
 * @file EffectSetState.ts
 */
export class EffectSetState extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSetState;
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;
    if(creature.plot || creature.isDead?.()){
      return;
    }

    const state = this.getInt(0) | 0;
    const ignoreImmunity = (this.getInt(1) | 0) !== 0;
    const versus = this.getCreator() as ModuleCreature | undefined;
    const versusCreature = isCreature(versus)
      ? versus
      : undefined;

    if(isSetStateImmune(creature, state, ignoreImmunity, versusCreature)){
      return;
    }

    super.onApply();
    creature.activity = (creature.activity | 0) & SET_STATE_OUTER_AI_ACTIVITY_MASK;
    rebalanceSetState(creature, this);
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      rebalanceSetState(this.object as ModuleCreature);
    }
  }
}
