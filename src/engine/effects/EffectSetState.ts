import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectSetStateType } from "@core/enums/effects/GameEffectSetStateType";
import type { Creature } from "@engine/module/Creature";
import {
  applySetAIStateChild,
  isSetStateImmune,
  rebalanceSetState,
  SET_STATE_OUTER_AI_STATE_MASK,
} from "@engine/effects/set-state";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectSetState — outer type 0x08 (onApply / onRemove).
 * int[0] = GameEffectSetStateType; int[1] != 0 → cutscene
 * (skip stun / paralyze / horror immunities).
 *
 * @file EffectSetState.ts
 */
export class EffectSetState extends GameEffect {
  private aiStateChild?: GameEffect;

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
    const creature = this.object as Creature;
    if(creature.plot || creature.isDead?.()){
      return;
    }

    const state = this.getInt(0) | 0;
    const ignoreImmunity = (this.getInt(1) | 0) !== 0;
    const versus = this.getCreator() as Creature | undefined;
    const versusCreature = isCreature(versus)
      ? versus
      : undefined;

    if(isSetStateImmune(creature, state, ignoreImmunity, versusCreature)){
      return;
    }

    super.onApply();
    this.aiStateChild = applySetAIStateChild(creature, this, SET_STATE_OUTER_AI_STATE_MASK);
    rebalanceSetState(creature, this);
  }

  onRemove(){
    super.onRemove();
    if(this.aiStateChild){
      this.object?.removeEffect?.(this.aiStateChild);
      this.aiStateChild = undefined;
    }
    if(isCreature(this.object)){
      rebalanceSetState(this.object as Creature);
    }
  }
}
