import { ActionStatus } from "../enums/actions/ActionStatus";
import { ModuleObject } from "../module";
import { Action } from "./Action";

/**
 * ActionQueue class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionQueue.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

  /**
   * set the owner object of the queue
   *
   * @param owner - the owner ModuleObject
   * @returns void
   *
   */
  setOwner( owner: ModuleObject ){
    this.owner = owner;
  }

  /**
   * add action to the back of the queue
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  add( actionNode: Action ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.push( actionNode );
    }
  }

  /**
   * Add the supplied action to the front of the queue
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  addFront( actionNode: Action ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.unshift( actionNode );
    }
  }


  /**
   * push the actionNode into the queue
   *
   * @param actionNode - the action node to push
   * @returns void
   *
   */
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

  /**
   * shifts the actionNode to the beginning of the queue
   *
   * @param actionNode - the action node to push
   * @returns void
   *
   */
  //@ts-expect-error
  unshift( actionNode: Action ){
    actionNode.owner = this.owner;
    actionNode.queue = undefined;
    this.addFront( actionNode );
  }

  /**
   * updates the current action in the queue
   *
   * @param delta - deltaTime
   * @returns void
   *
   */
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

  /**
   * clears all actions from the queue
   *
   * @returns void
   *
   */
  clear(){
    this.splice(0, this.length);
  }

  /**
   * removes the action from the queue
   *
   * @param actionNode - node to remove
   * @returns void
   *
   */
  clearAction(action: Action){
    if(action){
      const index = this.indexOf(action);
      if(index >= 0){
        this.splice(index, 1);
        this.clearActionsByGroupId(action.groupId);
      }
    }
  }

  /**
   * removes actions with the supplied groupId from the queue
   *
   * @param groupId - groupId to remove
   * @returns void
   *
   */
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