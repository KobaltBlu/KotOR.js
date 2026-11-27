import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleObject } from "@/module";
import { RuntimeFaultManager } from "@/utility/RuntimeFaultManager";
import type { Action } from "@/actions/Action";

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

  private getActionFaultKey(action: Action): string {
    const ownerId = this.owner?.id ?? 'unknown-owner';
    const actionType = action?.type ?? 'unknown-action';
    const groupId = action?.groupId ?? 'unknown-group';
    return `ActionQueue.process:${ownerId}:${actionType}:${groupId}`;
  }

  private getActionFaultContext(action: Action){
    return {
      ownerId: this.owner?.id,
      ownerTag: this.owner?.getTag?.(),
      ownerType: this.owner?.constructor?.name,
      actionType: action?.type,
      actionGroupId: action?.groupId,
      queueLength: this.length,
    };
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
    actionNode.queue = this;
    this.#processGroupId(actionNode);
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
    actionNode.queue = this;
    this.#processGroupId(actionNode);
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
  push(...actions: Action[]): number {
    for(const action of actions){
      this.add(action);
    }
    return this.length;
  }

  /**
   * shifts the actionNode to the beginning of the queue
   *
   * @param actionNode - the action node to push
   * @returns void
   *
   */
  unshift(...actions: Action[]): number {
    for(let i = actions.length - 1; i >= 0; i--){
      this.addFront(actions[i]);
    }
    return this.length;
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
    if(!action){ return; }
    action.owner = this.owner;
    let status = RuntimeFaultManager.run<ActionStatus>(
      this.getActionFaultKey(action),
      () => action.update( delta ),
      {
        fallback: ActionStatus.FAILED,
        suppressAfterFailures: 1,
        cooldownMs: 0,
        logThrottleMs: 2000,
        context: () => this.getActionFaultContext(action)
      }
    );
    if(status != ActionStatus.IN_PROGRESS){
      // An update may prepend a follow-up or clear itself. Remove only the action
      // that actually ran, never a newly inserted movement/jump action.
      const index = this.indexOf(action);
      if(index >= 0){
        this.splice(index, 1);
        try{
          action.dispose?.();
        }catch(error){
          console.error('ActionQueue.process: failed to dispose completed action', {
            context: this.getActionFaultContext(action),
            error,
          });
        }
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
    if(groupId < 0) return;
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