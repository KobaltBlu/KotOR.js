import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObject } from "../module";
import { Action } from "./Action";

export class ActionQueue extends Array {

  static AUTO_INCREMENT_GROUP_ID = 0xFFFF;
  static MAX_GROUP_ID = 0xFFFE;

  nextGroupId: number;
  lastGroupId: number;
  owner: ModuleObject;

  /**
   * ActionQueue
   * initializes a new ActionQueue object
   *
   * @param ...items - an array of actions to initialize the queue with
   * @returns void
   *
   */
  constructor(...items: Action[]){
    super(...items as any[]);
    this.nextGroupId = 1;
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
   * add the supplied action to the end of the queue
   * It's position will be actionQueue.length-1 after the push operation
   * Alias for push
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  add( actionNode: Action ){
    this.push( actionNode );
  }

  /**
   * Add the supplied action to the front of the queue
   * It's position will be actionQueue[0] after the unshift operation
   * Alias for unshift
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  addFront( actionNode: Action ){
    this.unshift(actionNode);
  }

  /**
   * handles the groupId parameter.
   * It can either be set to auto increment or use the value passed as it's groupId
   *
   * @param actionNode - the action node to push
   * @returns void
   *
   */
  #processGroupId(actionNode: Action){
    let newGroupId = actionNode.groupId;
    if(newGroupId < 0 || newGroupId > 0xFFFF){
      console.warn('Invalid GroupID', newGroupId);
      newGroupId = 0xFFFF;
    }
    if(newGroupId == ActionQueue.AUTO_INCREMENT_GROUP_ID){
      newGroupId = this.nextGroupId;
      if(newGroupId >= ActionQueue.MAX_GROUP_ID){
        newGroupId = this.lastGroupId = 0;
        this.nextGroupId = 1;
      }else{
        this.lastGroupId = newGroupId;
        this.nextGroupId++;
      }
      actionNode.groupId = newGroupId;
    }else if(actionNode.groupId == ActionQueue.MAX_GROUP_ID){
      actionNode.groupId = this.lastGroupId;
    }else{
      actionNode.groupId = newGroupId;
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
    this.#processGroupId(actionNode);
    super.push( actionNode );
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
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      actionNode.queue = this;
      this.#processGroupId(actionNode);
      super.unshift( actionNode );
    }
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
    if(groupId < 0 || groupId >= ActionQueue.AUTO_INCREMENT_GROUP_ID) return;
    let index = this.length;
    while(index--){
      const action = this[index];
      if(action && action.groupId == groupId){
        this.splice(index, 1);
      }
    }
  }

  actionTypeExists(actionType: ActionType){
    return this.findIndex( (a: Action) => a.type == actionType ) >= 0;
  }

}