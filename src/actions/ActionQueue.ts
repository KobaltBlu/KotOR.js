import type { Action } from "@/actions/Action";
import { ACTION_QUEUE_AUTO_INCREMENT_GROUP_ID, ACTION_QUEUE_MAX_GROUP_ID } from "@/actions/ActionConstants";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleObject } from "@/module";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Game);

/**
 * ActionQueue class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionQueue.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionQueue extends Array<Action> {
  static AUTO_INCREMENT_GROUP_ID = ACTION_QUEUE_AUTO_INCREMENT_GROUP_ID;
  static MAX_GROUP_ID = ACTION_QUEUE_MAX_GROUP_ID;

  NEXT_GROUP_ID: number = 0;
  nextGroupId: number;
  lastGroupId: number;
  owner: ModuleObject | undefined;

  /**
   * ActionQueue
   * initializes a new ActionQueue object
   *
   * @param items - optional actions to initialize the queue with
   */
  constructor(...items: Action[]) {
    super();
    log.trace("ActionQueue constructor", items.length);
    for (let i = 0; i < items.length; i++) {
      this.push(items[i]);
    }
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
    log.trace('ActionQueue setOwner', owner?.id ?? 'unknown');
    this.owner = owner;
    log.trace('ActionQueue setOwner done');
  }

  /**
   * add action to the back of the queue
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  add( actionNode: Action ){
    log.trace('ActionQueue add', actionNode?.type);
    if(!actionNode){ return; }
    actionNode.owner = this.owner;
    super.push( actionNode );
    log.trace('ActionQueue add done', this.length);
  }

  /**
   * Add the supplied action to the front of the queue
   *
   * @param actionNode - the action node to add
   * @returns void
   *
   */
  addFront( actionNode: Action ){
    log.trace('ActionQueue addFront', actionNode?.type);
    if(!actionNode){ return; }
    actionNode.owner = this.owner;
    super.unshift( actionNode );
    log.trace('ActionQueue addFront done', this.length);
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
    log.trace('ActionQueue #processGroupId', actionNode.groupId);
    let newGroupId = actionNode.groupId;
    if(newGroupId < 0 || newGroupId > 0xFFFF){
      log.warn('Invalid GroupID %s, clamping to AUTO_INCREMENT', String(newGroupId));
      newGroupId = 0xFFFF;
    }
    if(newGroupId == ActionQueue.AUTO_INCREMENT_GROUP_ID){
      newGroupId = this.nextGroupId;
      log.trace('ActionQueue auto groupId', newGroupId);
      if(newGroupId >= ActionQueue.MAX_GROUP_ID){
        newGroupId = this.lastGroupId = 0;
        this.nextGroupId = 1;
        log.trace('ActionQueue groupId wrap');
      }else{
        this.lastGroupId = newGroupId;
        this.nextGroupId++;
      }
      actionNode.groupId = newGroupId;
    }else if(actionNode.groupId == ActionQueue.MAX_GROUP_ID){
      actionNode.groupId = this.lastGroupId;
      log.trace('ActionQueue groupId MAX -> lastGroupId');
    }else{
      actionNode.groupId = newGroupId;
      log.trace('ActionQueue groupId explicit', newGroupId);
    }
  }


  /**
   * push the actionNode into the queue
   *
   * @param actionNode - the action node to push
   * @returns void
   *
   */
  // @ts-expect-error - Array.push returns number; we override to not return to match legacy action queue API
  push( actionNode: Action ){
    log.trace('ActionQueue push', actionNode?.type);
    actionNode.owner = this.owner;
    actionNode.queue = this;
    this.#processGroupId(actionNode);
    this.add( actionNode );
    log.debug('ActionQueue push done', this.length);
  }

  /**
   * shifts the actionNode to the beginning of the queue
   *
   * @param actionNode - the action node to push
   * @returns void
   *
   */
  // @ts-expect-error - Array.unshift returns number; we override to not return to match legacy action queue API
  unshift( actionNode: Action ){
    log.trace('ActionQueue unshift', actionNode?.type);
    actionNode.owner = this.owner;
    actionNode.queue = undefined;
    this.#processGroupId(actionNode);
    this.addFront( actionNode );
    log.debug('ActionQueue unshift done', this.length);
  }

  /**
   * updates the current action in the queue
   *
   * @param delta - deltaTime
   * @returns void
   *
   */
  process( delta: number = 0 ){
    log.trace('ActionQueue process', { delta, queueLength: this.length });
    const action = this[0];
    if(!action){ log.trace('ActionQueue process no action'); return; }
    action.owner = this.owner;
    const status = action.update( delta );
    log.trace('ActionQueue process update status', status);
    if(status != ActionStatus.IN_PROGRESS){
      this.shift();
      log.trace('ActionQueue process shifted', this.length);
    }
  }

  /**
   * clears all actions from the queue
   *
   * @returns void
   *
   */
  clear(){
    const n = this.length;
    log.trace('ActionQueue clear', n);
    this.splice(0, this.length).map( (a: Action) => a.dispose() );
    log.debug('ActionQueue clear done');
  }

  /**
   * removes the action from the queue
   *
   * @param actionNode - node to remove
   * @returns void
   *
   */
  clearAction(action: Action){
    log.trace('ActionQueue clearAction', action?.type);
    if(action){
      const index = this.indexOf(action);
      log.trace('ActionQueue clearAction index', index);
      if(index >= 0){
        this.splice(index, 1).map( (a: Action) => a.dispose() );
        this.clearActionsByGroupId(action.groupId);
        log.debug('ActionQueue clearAction done', this.length);
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
    log.trace('ActionQueue clearActionsByGroupId entry', groupId);
    if(groupId > 0) {
      log.trace('ActionQueue clearActionsByGroupId skip (groupId > 0)');
      return;
    }
    let index = this.length;
    log.debug('ActionQueue clearActionsByGroupId scan', index);
    while(index--){
      const action = this[index];
      if(action && action.groupId == groupId){
        this.splice(index, 1).map( (a: Action) => a.dispose() );
        log.trace('ActionQueue clearActionsByGroupId removed', index);
      }
    }
    log.trace('ActionQueue clearActionsByGroupId exit');
  }

  actionTypeExists(actionType: ActionType){
    const exists = this.findIndex( (a: Action) => a.type == actionType ) >= 0;
    log.trace('ActionQueue actionTypeExists', actionType, exists);
    return exists;
  }

}
