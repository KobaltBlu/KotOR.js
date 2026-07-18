import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import { DLGObject } from "@/resource/DLGObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";

/**
 * ActionDialogObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionDialogObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionDialogObject extends Action {
  validate_conversation_resref: boolean = false;
  conversation: DLGObject;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDialogObject;
    this.clearable = false;

    //PARAMS
    // 0 - dword:   speaker object id
    // 1 - string:  conversation resref
    // 2 - int:     bPrivateConversation 
    // 3 - int:     (?) nConversationType
    // 4 - int:     ignoreStartRange
    // 5 - dword:   listener object id (OBJECT_INVALID = use owner)
    // 6-11 - string: sNameObjectToIgnore1-6 (DialogNonDependantList)
    
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    const conversation_resref: string = this.getParameter<string>(1) || '';
    const bPrivate = !!this.getParameter<number>(2);
    const ignoreStartRange = this.getParameter<number>(4) || 0;
    const listenerParam = this.getParameter<ModuleObject>(5);
    const listener = BitWise.InstanceOfObject(listenerParam, ModuleObjectType.ModuleObject) &&
      (listenerParam as any).id !== ModuleObjectConstant.OBJECT_INVALID
      ? listenerParam
      : this.owner;

    const ignoreNames: string[] = [];
    for(let i = 0; i < 6; i++){
      const name = this.getParameter<string>(6 + i);
      if(typeof name === 'string' && name.trim().length > 0){
        ignoreNames.push(name);
      }
    }

    if(!this.target){
      return ActionStatus.FAILED;
    }

    if(!this.validate_conversation_resref){
      this.validate_conversation_resref = true;
      if(conversation_resref){
        this.conversation = DLGObject.FromResRef(conversation_resref);
      }
    }

    if(GameState.Mode == EngineMode.DIALOG){
      return ActionStatus.FAILED;
    }

    const dialog = this.conversation ? this.conversation : this.owner?.conversation;

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
    {
      GameState.CutsceneManager.startConversation(dialog, this.owner, this.target || listener, bPrivate, ignoreNames);
      return ActionStatus.COMPLETE;
    }

    const distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 4.5 && !ignoreStartRange){
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
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
    }

    this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    this.owner.force = 0;
    this.owner.speed = 0;

    this.owner.heardStrings = [];
    this.target.heardStrings = [];
    const onDialog = BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)
      ? this.target.scripts[ModuleObjectScript.CreatureOnDialog]
      : undefined;
    if(onDialog){
      // Ignore names still apply if OnDialog starts the cutscene path later
      GameState.CutsceneManager.setDialogNonDependantNames(ignoreNames);
      this.target.onDialog(this.owner, -1, this.conversation);
    }else{
      GameState.CutsceneManager.startConversation(dialog, this.target, listener, bPrivate, ignoreNames);
    }
    return ActionStatus.COMPLETE;
  }

}
