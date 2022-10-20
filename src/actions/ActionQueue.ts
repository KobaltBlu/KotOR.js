import { ActionStatus } from "../enums/actions/ActionStatus";
import { ModuleObject } from "../module";
import { Action } from "./Action";

export class ActionQueue extends Array {
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
    this.add( actionNode );
  }

  //@ts-expect-error
  unshift( actionNode: Action ){
    actionNode.owner = this.owner;
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

}