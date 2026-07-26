import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
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
    // 5 - dword:   listener object id (OBJECT_INVALID = use owner; bUseLeader → party[0])
    // 6-11 - string: sNameObjectToIgnore1-6 (DialogNonDependantList)
    // 12 - int:    TSL nBarkX (−1 default)
    // 13 - int:    TSL nBarkY (−1 default)
    // 14 - int:    TSL bUseLeader
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
    const barkX = this.getParameter<number>(12);
    const barkY = this.getParameter<number>(13);
    const barkScreenX = typeof barkX === 'number' ? barkX : -1;
    const barkScreenY = typeof barkY === 'number' ? barkY : -1;
    const bUseLeader = !!this.getParameter<number>(14);

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

    // TSL bUseLeader — force party leader as the conversation listener
    let effectiveListener = listener;
    if(bUseLeader && GameState.PartyManager?.party?.[0]){
      effectiveListener = GameState.PartyManager.party[0];
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
    {
      GameState.CutsceneManager.startConversation(dialog, this.owner, this.target || effectiveListener, bPrivate, ignoreNames, barkScreenX, barkScreenY);
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
    // Zero path + cam-relative locomotion (WASD/stick axes survive mode change otherwise)
    (this.owner as any).clearLocomotionState?.(true);

    this.owner.heardStrings = [];
    this.target.heardStrings = [];
    if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      // Ignore names still apply if OnDialog starts the cutscene path later.
      // onDialog applies retail empty/"default" → k_hen_dialogue01 fallback.
      GameState.CutsceneManager.setDialogNonDependantNames(ignoreNames);
      if(this.target.onDialog(this.owner, -1, this.conversation)){
        return ActionStatus.COMPLETE;
      }
    }
    GameState.CutsceneManager.startConversation(dialog, this.target, effectiveListener, bPrivate, ignoreNames, barkScreenX, barkScreenY);
    return ActionStatus.COMPLETE;
  }

}
