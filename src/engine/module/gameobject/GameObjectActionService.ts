import * as THREE from 'three';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { ActionType } from '@core/enums/actions/ActionType';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { GFFField } from '@core/resource/GFFField';
import type { CombatRoundAction } from '@engine/combat';
import { EngineDebugType } from '@engine/enums/engine';
import { resolveScriptAnimationConstant } from '@engine/module/animation/resolveScriptAnimationConstant';
import type { GameObject } from '@engine/module/GameObject';
import { isCreature } from '@engine/module/guards/isCreature';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';
import type { NWScriptInstance } from '@engine/nwscript/NWScriptInstance';
import type { ComputedPath } from '@engine/pathfinding';
import type EngineLocation from '@engine/runtime/EngineLocation';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class GameObjectActionService {
  private computedPath: ComputedPath;

  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  clearAllActions(skipUnclearable = false){
    if(skipUnclearable) this.host.combatRound?.clearAllAttacks?.();
    else this.host.combatRound?.clearActions?.();
    if(skipUnclearable && this.host.combatRound?.roundPaused){
      this.host.combatRound.resetCombatAnimations?.(0);
    }
    this.host.setComputedPath(undefined);
    if(skipUnclearable){
      for(let i = this.host.actionQueue.length - 1; i >= 0; i--){
        const action = this.host.actionQueue[i];
        if(
          action.type == ActionType.ActionDialogObject ||
          action.type == ActionType.ActionPauseDialog ||
          action.type == ActionType.ActionResumeDialog ||
          action.type == ActionType.ActionWait
        ) continue;
        if(typeof action.clearable === 'undefined' || action.clearable){
          this.host.actionQueue.splice(i, 1).map((queued) => queued.dispose());
        }
      }
    }else{
      this.host.actionQueue.clear();
    }
    this.runtime.cancelTimingBarFor?.(this.host);
    if((this.host as { foundEnemyCreature?: unknown }).foundEnemyCreature !== undefined){
      (this.host as { foundEnemyCreature?: unknown }).foundEnemyCreature = undefined;
    }
    (this.host as any).clearLocomotionState?.(true);
  }

  cancelLocomotionActions(){
    for(let i = this.host.actionQueue.length - 1; i >= 0; i--){
      const action = this.host.actionQueue[i];
      if(!action) continue;
      if([
        ActionType.ActionMoveToPoint,
        ActionType.ActionFollowLeader,
        ActionType.ActionForceFollowObject,
        ActionType.ActionDrive,
        ActionType.ActionJumpToPoint,
        ActionType.ActionJumpToObject,
        ActionType.ActionRandomWalk,
      ].includes(action.type)){
        this.host.actionQueue.splice(i, 1).map((queued) => queued.dispose());
      }
    }
    this.host.setComputedPath(undefined);
    (this.host as any).clearLocomotionState?.(false);
  }

  clearCombatAction(combatAction: CombatRoundAction = undefined){
    if(combatAction) return this.host.combatRound.clearAction(combatAction);
    if(this.host.combatRound?.action){
      this.host.combatRound.action = undefined;
      return true;
    }
    return false;
  }

  clearCombatActionAtIndex(index: number = 0): boolean {
    if(index < 0 || !this.host.combatRound?.scheduledActionList?.length) return false;
    if(index >= this.host.combatRound.scheduledActionList.length) return false;
    return !!this.host.combatRound.scheduledActionList.splice(index, 1).length;
  }

  actionPlayAnimation(anim: number | string = 0, speed = 1, time = 1){
    if(typeof anim === 'string') throw 'anim cannot be a string!';
    const constant = resolveScriptAnimationConstant(anim);
    if(constant < 10000){
      console.error('actionPlayAnimation', constant, anim);
      return;
    }
    const action = this.runtime.createAction('ActionPlayAnimation');
    action.setParameter(0, ActionParameterType.INT, constant);
    action.setParameter(1, ActionParameterType.FLOAT, speed || 1);
    action.setParameter(2, ActionParameterType.FLOAT, time);
    this.host.actionQueue.add(action);
  }

  actionDialogObject(target: GameObject, dialogResRef = '', ignoreStartRange = true, bPrivate = 0, nConvoType = 1, clearable = false, ignoreObjectNames: string[] = [], barkScreenX: number = -1, barkScreenY: number = -1, bUseLeader: boolean = false){
    const action = this.runtime.createAction('ActionDialogObject');
    action.setParameter(0, ActionParameterType.DWORD, target.id);
    action.setParameter(1, ActionParameterType.STRING, dialogResRef);
    action.setParameter(2, ActionParameterType.INT, bPrivate ? 1 : 0);
    action.setParameter(3, ActionParameterType.INT, nConvoType);
    action.setParameter(4, ActionParameterType.INT, ignoreStartRange ? 1 : 0);
    action.setParameter(5, ActionParameterType.DWORD,
      bUseLeader && this.runtime.getParty?.()?.[0]
        ? this.runtime.getParty()[0].id
        : GameObjectConstant.OBJECT_INVALID);
    for(let i = 0; i < 6; i++){
      action.setParameter(6 + i, ActionParameterType.STRING, ignoreObjectNames[i] ?? '');
    }
    action.setParameter(12, ActionParameterType.INT, barkScreenX);
    action.setParameter(13, ActionParameterType.INT, barkScreenY);
    action.setParameter(14, ActionParameterType.INT, bUseLeader ? 1 : 0);
    action.clearable = clearable;
    console.log('GameObject.actionDialogObject', action);
    this.host.actionQueue.add(action);
  }

  actionUseObject(object: GameObject){
    const action = this.runtime.createAction('ActionUseObject');
    action.setParameter(0, ActionParameterType.DWORD, object.id);
    this.host.actionQueue.add(action);
  }

  actionOpenDoor(door: GameObject){
    const action = this.runtime.createAction('ActionOpenDoor');
    action.setParameter(0, ActionParameterType.DWORD, door.id);
    action.setParameter(1, ActionParameterType.INT, 0);
    this.host.actionQueue.add(action);
  }

  actionCloseDoor(door: GameObject){
    const action = this.runtime.createAction('ActionCloseDoor');
    action.setParameter(0, ActionParameterType.DWORD, door.id);
    action.setParameter(1, ActionParameterType.INT, 0);
    this.host.actionQueue.add(action);
  }

  actionWait(time = 0){
    const action = this.runtime.createAction('ActionWait');
    action.setParameter(0, ActionParameterType.FLOAT, time);
    this.host.actionQueue.add(action);
  }

  doCommand(script: NWScriptInstance){
    const action = this.runtime.createAction('ActionDoCommand');
    action.setParameter(0, ActionParameterType.SCRIPT_SITUATION, script);
    this.host.actionQueue.add(action);
  }

  getComputedPath(){
    return this.computedPath;
  }

  setComputedPath(computedPath: ComputedPath){
    if(this.computedPath) this.computedPath.dispose();
    this.computedPath = computedPath;
    if(!this.computedPath) return;
    this.computedPath.owner = this.host;
    if(this.host.context?.debug[EngineDebugType.PATH_FINDING]){
      this.computedPath.enableHelper = true;
    }
    this.computedPath.buildHelperLine();
  }

  JumpToLocation(location: EngineLocation){
    if(!location) return;
    if(isCreature(this.host)){
      const action = this.runtime.createAction('ActionJumpToPoint');
      action.setParameter(0, ActionParameterType.FLOAT, location.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, location.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, location.position.z);
      action.setParameter(3, ActionParameterType.DWORD, location.area?.id ?? this.host.area?.id ?? 0);
      action.setParameter(4, ActionParameterType.INT, 1);
      action.setParameter(5, ActionParameterType.FLOAT, 20.0);
      action.setParameter(6, ActionParameterType.FLOAT, location.rotation.x);
      action.setParameter(7, ActionParameterType.FLOAT, location.rotation.y);
      action.owner = this.host;
      action.update(0);
      return;
    }
    this.host.position.copy(location.position);
    this.host.markCollisionMatrixDirty('position');
    this.host.computeBoundingBox();
    this.host.setFacing(-Math.atan2(location.rotation.x, location.rotation.y) + Math.PI / 2, true);
    this.host.collisionManager.groundFace = undefined;
    this.host.collisionManager.lastGroundFace = undefined;
  }

  FacePoint(point = new THREE.Vector3()){
    const tangent = point.clone().sub(this.host.position);
    this.host.setFacing(Math.atan2(-tangent.y, -tangent.x) + Math.PI / 2, true);
  }

  loadActionList(){
    try{
      if(!this.host.template?.RootNode) return;
      ActionListSerializer.deserialize(
        this.host as any,
        this.host.template.RootNode,
        (struct) => this.runtime.actionFromStruct(struct),
      );
    }catch(error: any){
      console.error(error);
    }
  }

  actionQueueToActionList(){
    return ActionListSerializer.writeField(
      { addField: (field: GFFField) => field },
      this.host as any,
    );
  }
}
