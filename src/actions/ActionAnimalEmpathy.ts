import { Action } from "@/actions/Action";
import { DiceType } from "@/enums/combat/DiceType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { SkillType } from "@/enums/nwscript/SkillType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Dice } from "@/utility/Dice";
import { queueMoveIntoUseRange } from "@/actions/use-range";

/**
 * ActionAnimalEmpathy class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionAnimalEmpathy.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionAnimalEmpathy extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionAnimalEmpathy;

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

    if(queueMoveIntoUseRange(owner, target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    owner.setFacingObject(target);

    // KotOR has no dedicated Animal Empathy skill; Awareness stands in as the check.
    const roll = (owner.getSkillLevel(SkillType.AWARENESS) | 0) + Dice.roll(1, DiceType.d20);
    const dc = 10 + (target.challengeRating | 0);
    if(roll < dc){
      return ActionStatus.FAILED;
    }

    target.clearTarget();
    return ActionStatus.COMPLETE;
  }

}
