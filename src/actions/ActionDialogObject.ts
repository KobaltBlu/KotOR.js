import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import { DLGObject } from "@/resource/DLGObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

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
    // 5 - dword:   (?) listener - `appears to be object_invalid mostly`
    
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    let conversation_resref: string = this.getParameter<string>(1) || '';
    let ignoreStartRange = this.getParameter<number>(4) || 0;

    if(!this.validate_conversation_resref){
      this.validate_conversation_resref = true;
      if(conversation_resref){
        this.conversation = DLGObject.FromResRef(conversation_resref);
      }
    }

    const resolvedConversation = this.conversation ?? this.owner?.conversation;

    if(GameState.Mode == EngineMode.DIALOG){
      console.log('ActionDialogObject: Already in dialog', this.owner.getName(), this.owner.getTag());
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
    {
      GameState.CutsceneManager.startConversation(resolvedConversation, this.owner, this.target);
      return ActionStatus.COMPLETE;
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 4.5 && !ignoreStartRange){
      // this.owner.openSpot = undefined;
      enqueueMoveToPoint(this.owner, {
        x: this.target.position.x,
        y: this.target.position.y,
        z: this.target.position.z,
        area: GameState.module.area.id,
        target: this.target.id,
        run: true,
        range: 4.5,
        timeout: 30.0,
        groupId: this.groupId,
      });

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      this.owner.force = 0;
      this.owner.speed = 0;

      if (BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature) && !(this.owner as any).keepStealthInDialog) {
        (this.owner as any).stealthMode = false;
      }

      if (BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature) && (this.target as any).orientOnClick !== false) {
        this.target.FacePoint(this.owner.position);
      }

      this.owner.heardStrings = [];
      this.target.heardStrings = [];
      const onDialog = BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature) ? this.target.scripts[ModuleObjectScript.CreatureOnDialog] : undefined;
      if(onDialog){
        this.target.onDialog(this.owner, -1, resolvedConversation);
      }else{
        GameState.CutsceneManager.startConversation(resolvedConversation, this.target, this.owner);
      }
      return ActionStatus.COMPLETE;
    }
    
    return ActionStatus.FAILED;
  }

}
