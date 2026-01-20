import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import type { ModuleObject } from "../module";
import type { Action } from "./Action";

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

  static AUTO_INCREMENT_GROUP_ID = 0xFFFF;
  static MAX_GROUP_ID = 0xFFFE;
  
  NEXT_GROUP_ID: number = 0;
  nextGroupId: number;
  lastGroupId: number;
  owner: any;

  /**
   * ActionQueue
   * initializes a new ActionQueue object
   *
   * @param ...items - an array of actions to initialize the queue with
   * @returns void
   *
   */
  constructor(...items: any[]){
    super(...items);
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
   * add action to the back of the queue
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  add( actionNode: Action ){
    if(!actionNode){ return; }
    actionNode.owner = this.owner;
    super.push( actionNode );
  }

  /**
   * Add the supplied action to the front of the queue
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  addFront( actionNode: Action ){
    if(!actionNode){ return; }
    actionNode.owner = this.owner;
    super.unshift( actionNode );
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
  //@ts-expect-error because I am too lazy to fix it
  push( actionNode: Action ){
    actionNode.owner = this.owner;
    actionNode.queue = this;
    this.#processGroupId(actionNode);
    this.add( actionNode );
  }

  /**
   * shifts the actionNode to the beginning of the queue
   *
   * @param actionNode - the action node to push
   * @returns void
   *
   */
  //@ts-expect-error because I am too lazy to fix it
  unshift( actionNode: Action ){
    actionNode.owner = this.owner;
    actionNode.queue = undefined;
    this.#processGroupId(actionNode);
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
    const action = this[0];
    if(!action){ return; }
    action.owner = this.owner;
    const status = action.update( delta );
    if(status != ActionStatus.IN_PROGRESS){
      this.shift();
    }
  }

  /**
   * clears all actions from the queue
   *
   * @returns void
   *
   */
  clear(){
    this.splice(0, this.length).map( (a: Action) => a.dispose() );
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
        this.splice(index, 1).map( (a: Action) => a.dispose() );
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
        this.splice(index, 1).map( (a: Action) => a.dispose() );
      }
    }
  }

  actionTypeExists(actionType: ActionType){
    return this.findIndex( (a: Action) => a.type == actionType ) >= 0;
  }

}