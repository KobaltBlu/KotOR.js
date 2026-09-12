import { Action } from "@/actions/Action";
import { DiceType } from "@/enums/combat/DiceType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { Dice } from "@/utility/Dice";
import { queueMoveIntoUseRange } from "@/actions/use-range";

import { isCreature } from "@/module/guards/isCreature";

/**
 * ActionPickPocket class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionPickPocket.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPickPocket extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPickPocket;

    //PARAMS
    // 0 - dword: target object id
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    if(!isCreature(this.target)){
      return ActionStatus.FAILED;
    }
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    const target = this.target as ModuleCreature;

    if(queueMoveIntoUseRange(owner, target, this.groupId, { extraRange: 0.0 })){
      return ActionStatus.IN_PROGRESS;
    }

    owner.setFacingObject(target);

    const stealRoll = (owner.getSkillLevel(SkillType.STEALTH) | 0) + Dice.roll(1, DiceType.d20);
    const noticeDC = 10 + (target.getSkillLevel(SkillType.AWARENESS) | 0);
    if(stealRoll < noticeDC){
      return ActionStatus.FAILED;
    }

    const gold = (target.gold | 0) || (target.getGold() | 0);
    if(gold > 0){
      const stolen = Math.max(1, Math.min(gold, Math.floor(gold * 0.1) || 1));
      if(target.gold > 0){
        target.gold = Math.max(0, target.gold - stolen);
      }else{
        target.removeGold(stolen);
      }
      owner.addGold(stolen);
    }

    return ActionStatus.COMPLETE;
  }

}
