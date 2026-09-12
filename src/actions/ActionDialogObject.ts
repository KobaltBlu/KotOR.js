import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GameState } from "@/GameState";
import { resolveBeginConversationDialog, resolveDialogStartOwner } from "@/actions/dialog-start";
import type { ModuleObject } from "@/module/ModuleObject";
import { DLGObject } from "@/resource/DLGObject";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";

import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

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
    // 0 - dword: oTarget (speaker / target object id to converse with)
    // 1 - string: sDialogResRef (conversation dialog resref)
    // 2 - int: bPrivate (private conversation flag)
    // 3 - int: nConversationType (conversation type, default 0)
    // 4 - int: bIgnoreStartRange (1 = ignore start distance check)
    // 5 - dword: oListener (listener object id; OBJECT_INVALID = use owner)
    // 6 - string: sNameObjectToIgnore1 (dialog non-dependant list item 1)
    // 7 - string: sNameObjectToIgnore2 (dialog non-dependant list item 2)
    // 8 - string: sNameObjectToIgnore3 (dialog non-dependant list item 3)
    // 9 - string: sNameObjectToIgnore4 (dialog non-dependant list item 4)
    // 10 - string: sNameObjectToIgnore5 (dialog non-dependant list item 5)
    // 11 - string: sNameObjectToIgnore6 (dialog non-dependant list item 6)
    // 12 - float: fBarkScreenX (TSL bark screen coordinate X, -1 default)
    // 13 - float: fBarkScreenY (TSL bark screen coordinate Y, -1 default)
    // 14 - int: bUseLeader (TSL flag: 1 = route listener to party leader)
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    const conversation_resref: string = this.getParameter<string>(1) || '';
    const bPrivate = !!this.getParameter<number>(2);
    const ignoreStartRange = this.getParameter<number>(4) || 0;
    const listenerParam = this.getParameter<ModuleObject>(5);
    const listener = isObject(listenerParam) &&
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

    // Only resolve an explicit ActionStartConversation resref here.
    // Blank leaves this.conversation unset so OnDialog → BeginConversation uses
    // StartDialog GetDialogResref on the dialog owner (often the last speaker).
    if(!this.validate_conversation_resref){
      this.validate_conversation_resref = true;
      if(conversation_resref){
        this.conversation = DLGObject.FromResRef(conversation_resref);
      }
    }

    // Wait out an active conversation instead of discarding the action.
    // end_m01aa: k_pend_trastk_en AssignCommand(Trask, ActionWait(2) +
    // ActionStartConversation(PC)) often becomes ready while m01aa_c01 still
    // holds DIALOG mode; failing here drops Trask's post-cutscene talk.
    if(GameState.Mode == EngineMode.DIALOG){
      return ActionStatus.IN_PROGRESS;
    }

    // TSL bUseLeader — force party leader as the conversation listener
    let effectiveListener = listener;
    if(bUseLeader && GameState.PartyManager?.party?.[0]){
      effectiveListener = GameState.PartyManager.party[0];
    }

    if(isCreature(this.owner))
    {
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
      this.owner.clearLocomotionState?.(true);
    }

    this.owner.heardStrings = [];
    this.target.heardStrings = [];

    // ActionDialogObject fires OnDialog on oObjectToConverseWith (creatures,
    // doors, placeables). Pass only an explicit resref DLG; blank leaves
    // instance.conversation unset so BeginConversation matches StartDialog.
    // If OnDialog runs but does not enter dialog (e.g. GetCommandable failed),
    // fall through to direct start — Deadeye invis speaker depends on this.
    // Bark one-liners endConversation immediately (active=false, Mode stays INGAME),
    // so also watch conversationEpoch for BeginConversation that already barked.
    GameState.CutsceneManager.setDialogNonDependantNames(ignoreNames);
    if(typeof this.target.onDialog === 'function'){
      const epoch = GameState.CutsceneManager.conversationEpoch;
      this.target.onDialog(this.owner, -1, this.conversation);
      if(
        GameState.Mode == EngineMode.DIALOG ||
        GameState.CutsceneManager?.active ||
        GameState.CutsceneManager.conversationEpoch !== epoch
      ){
        return ActionStatus.COMPLETE;
      }
    }

    // No OnDialog script / dialog not started — same ownership/resref rules as BeginConversation.
    const dialogOwner = resolveDialogStartOwner(this.target, this.owner);
    const other = dialogOwner === this.target ? (effectiveListener || this.owner) : this.target;
    const dialog = resolveBeginConversationDialog('', this.conversation, dialogOwner);
    if(!dialog){
      return ActionStatus.FAILED;
    }
    GameState.CutsceneManager.startConversation(dialog, dialogOwner, other, bPrivate, ignoreNames, barkScreenX, barkScreenY);
    return ActionStatus.COMPLETE;
  }

}
