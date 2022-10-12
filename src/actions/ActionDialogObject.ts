import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { Action } from "./Action";

export class ActionDialogObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionDialogObject;
    this.clearable = false;

    //PARAMS
    // 0 - dword: speaker object id
    // 1 - string : conversation resref
    // 2 - int: 
    // 3 - int: 
    // 4 - int: ignoreStartRange
    // 5 - dword: listener? object_invalid mostly
    
  }

  update(delta: number = 0){
    //console.log('ActionDialogObject', this);

    this.target = this.getParameter(0);
    let conversation = this.getParameter(1) || '';
    let ignoreStartRange = this.getParameter(4) || 0;

    if(this.owner instanceof ModuleCreature){
      if(!GameState.inDialog){
        let distance = Utility.Distance2D(this.owner.position, this.target.position);
        if(distance > 4.5 && !ignoreStartRange){

          this.owner.openSpot = undefined;
          let actionMoveToTarget = new ActionMoveToPoint();
          actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
          actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
          actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
          actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
          actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
          actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
          actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 4.5 );
          actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
          actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
          this.owner.actionQueue.addFront(actionMoveToTarget);

          return ActionStatus.IN_PROGRESS;
        }else{
          this.owner.animState = ModuleCreatureAnimState.IDLE;
          this.owner.force = 0;
          this.owner.speed = 0;

          this.target._conversation = this.owner.conversation;
          this._conversation = this.owner.conversation;

          this.owner.heardStrings = [];
          this.target.heardStrings = [];
          if(this.target.scripts.onDialog instanceof NWScriptInstance){
            this.target.onDialog(this.owner, -1);
          }else{
            GameState.InGameDialog.StartConversation(conversation ? conversation : this.owner.conversation, this.target, this.owner);
          }
          return ActionStatus.COMPLETE;
        }
      }else{
        console.log('ActionDialogObject: Already in dialog', this.owner.getName(), this.owner.getTag());
        return ActionStatus.FAILED;
      }
    }else{
      GameState.InGameDialog.StartConversation(conversation ? conversation : this.owner.conversation, this.owner, this.target);
      return ActionStatus.COMPLETE;
    }
    
    return ActionStatus.FAILED;
  }

}