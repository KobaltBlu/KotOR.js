import { Action } from "@/actions/Action";
import { DiceType } from "@/enums/combat/DiceType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import { Dice } from "@/utility/Dice";
import { Utility } from "@/utility/Utility";

import { isCreature } from "@/module/guards/isCreature";

/**
 * ActionTaunt class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionTaunt.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionTaunt extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionTaunt;

    //PARAMS
    // 0 - dword: oTarget (target creature object id)
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    if(!isCreature(this.target)){
      return ActionStatus.FAILED;
    }
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 4.0){
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, this.owner.area?.id ?? this.target.area?.id ?? 0);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 4.0);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    this.owner.setFacingObject(this.target);

    const tauntRoll = (this.owner.getSkillLevel(SkillType.PERSUADE) | 0) + Dice.roll(1, DiceType.d20);
    const dc = 10 + (this.target.getSkillLevel(SkillType.PERSUADE) | 0);
    if(tauntRoll < dc){
      return ActionStatus.FAILED;
    }

    const penalty = new GameState.GameEffectFactory.EffectAttackDecrease();
    penalty.setCreator(this.owner);
    penalty.setInt(0, 2);
    penalty.setDurationType(GameEffectDurationType.TEMPORARY);
    penalty.setDuration(30);
    this.target.addEffect(penalty);

    return ActionStatus.COMPLETE;
  }

}
