import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isSetStateImmune, rebalanceSetState, SET_STATE_OUTER_AI_ACTIVITY_MASK } from "@/effects/set-state";

/**
 * EffectSetState — retail outer type 0x08 (OnApplySetState @ 004e1c20).
 * int[0] = GameEffectSetStateType; int[1] != 0 → cutscene (skip stun/paralyze/horror immunities).
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

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;
    if(creature.plot || creature.isDead?.()){
      return;
    }

    const state = this.getInt(0) | 0;
    const ignoreImmunity = (this.getInt(1) | 0) !== 0;
    const versus = this.getCreator() as ModuleCreature | undefined;
    const versusCreature = BitWise.InstanceOfObject(versus, ModuleObjectType.ModuleCreature)
      ? versus
      : undefined;

    if(isSetStateImmune(creature, state, ignoreImmunity, versusCreature)){
      return;
    }

    super.onApply();
    // Retail OnApplySetState: SETAISTATE −0x101 → activity &= 0xFEFF
    creature.activity = (creature.activity | 0) & SET_STATE_OUTER_AI_ACTIVITY_MASK;
    rebalanceSetState(creature, this);
  }

  onRemove(){
    super.onRemove();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      rebalanceSetState(this.object as ModuleCreature);
    }
  }
}
