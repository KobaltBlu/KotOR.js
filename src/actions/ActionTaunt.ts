import { Action } from "@/actions/Action";
import { DiceType } from "@/enums/combat/DiceType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Dice } from "@/utility/Dice";
import { Utility } from "@/utility/Utility";

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
    // 0 - dword: target object id
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    const target = this.target as ModuleCreature;

    const distance = Utility.Distance2D(owner.position, target.position);
    if(distance > 4.0){
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 4.0);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    owner.setFacingObject(target);

    const tauntRoll = (owner.getSkillLevel(SkillType.PERSUADE) | 0) + Dice.roll(1, DiceType.d20);
    const dc = 10 + (target.getSkillLevel(SkillType.PERSUADE) | 0);
    if(tauntRoll < dc){
      return ActionStatus.FAILED;
    }

    const penalty = new GameState.GameEffectFactory.EffectAttackDecrease();
    penalty.setCreator(owner);
    penalty.setInt(0, 2);
    penalty.setDurationType(GameEffectDurationType.TEMPORARY);
    penalty.setDuration(30);
    target.addEffect(penalty);

    return ActionStatus.COMPLETE;
  }

}
