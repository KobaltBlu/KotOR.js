import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { SSFObjectType } from "../interface/resource/SSFType";
import { ModuleCreature, ModuleDoor, ModulePlaceable } from "../module";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";
import { ActionMoveToPoint } from "./ActionMoveToPoint";

export class ActionUnlockObject extends Action {
  timer: number;
  shouted: any;

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionUnlockObject;
    this.timer = 1.5;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta: number = 0): ActionStatus {
    if(!(this.owner instanceof ModuleCreature))
      return ActionStatus.FAILED;

    this.target = this.getParameter(0);

    if(!(this.target instanceof ModuleDoor) && !(this.target instanceof ModulePlaceable))
      return ActionStatus.FAILED;

    if(!this.shouted){
      this.shouted = true;
      this.owner.PlaySoundSet(SSFObjectType.UNLOCK);
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 1.5){
        
      this.owner.openSpot = undefined;
      let actionMoveToTarget = new ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 1.5 );
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.animState = ModuleCreatureAnimState.IDLE;
      this.owner.force = 0;
      this.owner.speed = 0;
                        
      if(this.owner instanceof ModuleCreature)
        this.owner.setFacingObject( this.target );

      if(this.timer == undefined){
        this.timer = 1.5;
        this.target.audioEmitter.PlaySound('gui_lockpick');
      }

      if(!this.owner.isSimpleCreature()){
        if(this.target instanceof ModuleDoor){
          this.owner.overlayAnimation = 'unlockdr';
        }else{
          this.owner.overlayAnimation = 'unlockcntr';
        }
      }

      this.timer -= delta;

      if(this.timer <= 0){
        this.target.attemptUnlock(this.owner);
        return ActionStatus.COMPLETE;
      }

      return ActionStatus.IN_PROGRESS;
      
    }

    return ActionStatus.FAILED;
  }

}
