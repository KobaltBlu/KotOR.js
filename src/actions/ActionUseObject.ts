import { ModuleObjectType } from "@/enums";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";

/**
 * ActionUseObject class.
 *
 * Retail use-object action uses GetIsInUseRange / GetUseRange before use.
 *
 * @file ActionUseObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionUseObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionUseObject;
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

    if(!BitWise.InstanceOfObject(target, ModuleObjectType.ModuleObject)){
      return undefined;
    }

    // Mid-action bag spawn / KeepCorpse: loot via getLootUseTarget
    if(BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)){
      const creature = target as ModuleCreature;
      if(
        (typeof creature.isDead === 'function' && creature.isDead())
        || creature.isRetainedCorpse
      ){
        const lootTarget = creature.getLootUseTarget?.();
        if(BitWise.InstanceOfObject(lootTarget, ModuleObjectType.ModuleObject)){
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

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleObject)){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    if(queueMoveIntoUseRange(owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    // Match ActionOpenDoor: once GetIsInUseRange (queueMove returned false), use.
    // Do not FAILED-out — WalkUpdate can leave us in the +0.1 slack band where a
    // second isInUseRange flake would drop the interaction (re-click required).
    owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    owner.force = 0;
    owner.speed = 0;
    owner.setFacingObject(this.target);

    if(this.target != GameState.PartyManager.Player){
      this.target.use(owner);
    }

    return ActionStatus.COMPLETE;
  }

}
