import { ActionStatus } from "../enums/actions/ActionStatus";
import { ModuleObject } from "../module";
import { Action } from "./Action";

export class ActionQueue extends Array {
  NEXT_GROUP_ID: number = 0;
  NEXT_ACTION_ID: number = 0;
  groupId: number;
  lastGroupId: number;
  owner: any;

  constructor(...items: any[]){
    super(...items);
    this.groupId = 1;
    this.lastGroupId = 0;
    this.owner = undefined;
  }

  setOwner( owner: ModuleObject ){
    this.owner = owner;
  }

  add( actionNode: Action ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.push( actionNode );
    }
  }

  addFront( actionNode: Action ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.unshift( actionNode );
    }
  }

  //@ts-expect-error
  push( actionNode: Action ){
    actionNode.owner = this.owner;
    actionNode.queue = this;
    if(actionNode.actionId == -1){
      actionNode.actionId = this.NEXT_ACTION_ID++;
    }
    if(actionNode.groupId == -1){
      actionNode.groupId = this.NEXT_GROUP_ID++;
    }
    this.add( actionNode );
  }

  //@ts-expect-error
  unshift( actionNode: Action ){
    actionNode.owner = this.owner;
    actionNode.queue = undefined;
    this.addFront( actionNode );
  }

  process( delta: number = 0 ){
    let action = this[0];
    if(action instanceof Action){
      action.owner = this.owner;
      let status = action.update( delta );
      if(status != ActionStatus.IN_PROGRESS){
        this.shift();
      }
    }
  }

  clear(){
    this.splice(0, this.length);
  }

  clearAction(action: Action){
    if(action){
      const index = this.indexOf(action);
      if(index >= 0){
        this.splice(index, 1);
        this.clearActionsByGroupId(action.groupId);
      }
    }
  }

  clearActionsByGroupId(groupId: number = -1){
    if(groupId > 0) return;
    let index = this.length;
    while(index--){
      const action = this[index];
      if(action && action.groupId == groupId){
        this.splice(index, 1);
      }
    }
  }

}