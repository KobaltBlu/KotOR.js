import { Action } from "@/actions/Action";
import { DiceType } from "@/enums/combat/DiceType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { SkillType } from "@/enums/nwscript/SkillType";
import type { ModuleObject } from "@/module/ModuleObject";
import { Dice } from "@/utility/Dice";
import { queueMoveIntoUseRange } from "@/actions/use-range";
import { isCreature } from "@/module/guards/isCreature";

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

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    this.owner.setFacingObject(this.target);

    // KotOR has no dedicated Animal Empathy skill; Awareness stands in as the check.
    const roll = (this.owner.getSkillLevel(SkillType.AWARENESS) | 0) + Dice.roll(1, DiceType.d20);
    const dc = 10 + (this.target.challengeRating | 0);
    if(roll < dc){
      return ActionStatus.FAILED;
    }

    this.target.clearTarget();
    return ActionStatus.COMPLETE;
  }

}
