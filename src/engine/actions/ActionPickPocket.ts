import { Action } from "@engine/actions/Action";
import { DiceType } from "@core/enums/combat/DiceType";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { SkillType } from "@core/enums/nwscript/SkillType";
import { GameState } from "@engine/runtime/GameState";
import type { ModuleObject } from "@engine/module/ModuleObject";
import { Dice } from "@core/utility/Dice";
import { queueMoveIntoUseRange } from "@engine/actions/use-range";

import { isCreature } from "@engine/module/guards/isCreature";

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

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId, { extraRange: 0.0 })){
      return ActionStatus.IN_PROGRESS;
    }

    this.owner.setFacingObject(this.target);

    const stealRoll = (this.owner.getSkillLevel(SkillType.STEALTH) | 0) + Dice.roll(1, DiceType.d20);
    const noticeDC = 10 + (this.target.getSkillLevel(SkillType.AWARENESS) | 0);
    if(stealRoll < noticeDC){
      return ActionStatus.FAILED;
    }

    const gold = (this.target.gold | 0) || (this.target.getGold() | 0);
    if(gold > 0){
      const stolen = Math.max(1, Math.min(gold, Math.floor(gold * 0.1) || 1));
      if(this.target.gold > 0){
        this.target.gold = Math.max(0, this.target.gold - stolen);
      }else{
        this.target.removeGold(stolen);
      }
      this.owner.addGold(stolen);
    }

    return ActionStatus.COMPLETE;
  }

}
