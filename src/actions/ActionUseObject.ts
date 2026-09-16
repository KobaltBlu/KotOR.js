import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";
import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

/**
 * ActionUseObject class.
 *
 * use-object action uses GetIsInUseRange / GetUseRange before use.
 *
 * @file ActionUseObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionUseObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionUseObject;

    //PARAMS
    // 0 - dword: oTarget (placeable, door, or item object id to interact with)
  }

  /**
   * Resolve DWORD target for client use (KeepCorpse shells survive event 0xb).
   * Retarget dead creatures to their body bag when one exists.
   */
  resolveUseTarget(): ModuleObject | undefined {
    const param = this.parameters[0];
    let target: ModuleObject | undefined;
    if(param?.type === ActionParameterType.DWORD){
      target = GameState.ModuleObjectManager.GetClientObjectById(param.value as number);
    }else{
      target = this.getParameter<ModuleObject>(0);
    }

    if(!isObject(target)){
      return undefined;
    }

    // Mid-action bag spawn / KeepCorpse: loot via getLootUseTarget
    if(isCreature(target)){
      if(
        (typeof target.isDead === 'function' && target.isDead())
        || target.isRetainedCorpse
      ){
        const lootTarget = target.getLootUseTarget?.();
        if(isObject(lootTarget)){
          if(lootTarget.id !== target.id){
            this.setParameter(0, ActionParameterType.DWORD, lootTarget.id);
          }
          return lootTarget;
        }
      }
    }

    return target;
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.resolveUseTarget();

    if(!isObject(this.target)){
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    // Match ActionOpenDoor: once GetIsInUseRange (queueMove returned false), use.
    // Do not FAILED-out — tickCreatureWalk / walk tick can leave us in the +0.1 slack band where a
    // second isInUseRange flake would drop the interaction (re-click required).
    this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    this.owner.force = 0;
    this.owner.speed = 0;
    this.owner.setFacingObject(this.target);

    if(this.target != GameState.PartyManager.Player){
      this.target.use(this.owner);
    }

    return ActionStatus.COMPLETE;
  }

}
