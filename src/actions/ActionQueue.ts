import { Action } from "./Action";

export class ActionQueue extends Array {

  constructor(...items: any[]){
    super(...items);
    this.groupId = 1;
    this.lastGroupId = 0;
    this.owner = undefined;
  }

  setOwner( owner = undefined ){
    this.owner = owner;
  }

  add( actionNode = undefined ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.push( actionNode );
    }
  }

  addFront( actionNode = undefined ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.unshift( actionNode );
    }
  }

  push( actionNode = undefined ){
    actionNode.owner = this.owner;
    this.add( actionNode );
  }

  unshift( actionNode = undefined ){
    actionNode.owner = this.owner;
    this.addFront( actionNode );
  }

  process( delta ){
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