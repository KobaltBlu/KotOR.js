import { ActionCombat, ActionCastSpell, ActionCloseDoor, ActionDialogObject, ActionDoCommand, ActionDropItem, ActionEquipItem, ActionFollowLeader, ActionGiveItem, ActionItemCastSpell, ActionJumpToObject, ActionJumpToPoint, ActionLockObject, ActionMoveToPoint, ActionOpenDoor, ActionPauseDialog, ActionPhysicalAttacks, ActionPlayAnimation, ActionQueue, ActionResumeDialog, ActionSetCommandable, ActionTakeItem, ActionUnlockObject, ActionUseObject, ActionWait } from ".";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { CombatAction } from "../interface/combat/CombatAction";
import { PartyManager } from "../managers/PartyManager";
import { ModuleCreature, ModuleObject } from "../module";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFStruct } from "../resource/GFFStruct";
import { ActionParameter } from "./ActionParameter";

export class Action {
  type: ActionType;
  actionId: number = -1;
  groupId: number = -1;
  owner: ModuleObject;
  target: any;
  parameters: any[];
  path: any;
  openSpot: any;
  clearable: boolean = true;
  combatAction: CombatAction;
  isCutsceneAttack: Action;
  queue: ActionQueue;

  constructor( actionId: number = -1, groupId: number = -1 ){
    this.type = ActionType.ActionInvalid;
    this.groupId = groupId;
    this.actionId = actionId;

    this.owner = undefined; //The owner of the action
    this.target = undefined; //The target of the action

    this.parameters = [];

    this.path = undefined;
    this.openSpot = undefined;
  }

  update(delta: number = 0): ActionStatus {
    return ActionStatus.FAILED;
  }

  setOwner( owner: ModuleObject ){
    this.owner = owner;
  }

  getOwner(){
    return this.owner;
  }

  setTarget( target: ModuleObject ){
    this.target = target;
  }

  getTarget(){
    this.target;
  }

  runCreatureAvoidance(delta = 0){
    if(!(this.owner instanceof ModuleCreature)) return;
    if(PartyManager.party.indexOf(this.owner) >= 0){

      //Check Creature Avoidance
      let threatening = undefined;
      let threateningDistance = Infinity;
      let ahead = this.owner.position.clone().sub(this.owner.AxisFront.clone().normalize()).multiplyScalar(1);
      let ahead2 = this.owner.position.clone().sub(this.owner.AxisFront.clone().normalize()).multiplyScalar(1).multiplyScalar(0.5);
      for(let i = 0; i < GameState.module.area.creatures.length; i++){
        let creature = GameState.module.area.creatures[i];
        if(creature === this.owner || creature.isDead())
          continue;

        let hitDistance = creature.getAppearance().hitdist;
        let creaturePos = creature.position.clone();
        let distance = this.owner.position.distanceTo(creature.position);

        if(ahead.distanceTo(creaturePos) <= hitDistance){
          if(ahead.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead.distanceTo(creaturePos);
          }
        }else if(ahead2.distanceTo(creaturePos) <= hitDistance){
          //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
          if(ahead2.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead2.distanceTo(creaturePos);
          }
        }   
      }

      for(let i = 0; i < PartyManager.party.length; i++){
        let creature = PartyManager.party[i];
        if(creature === this.owner || creature.isDead())
          continue;

        let hitDistance = creature.getAppearance().hitdist;
        let creaturePos = creature.position.clone();
        let distance = this.owner.position.distanceTo(creature.position);

        if(ahead.distanceTo(creaturePos) <= hitDistance){
          if(ahead.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead.distanceTo(creaturePos);
          }
        }else if(ahead2.distanceTo(creaturePos) <= hitDistance){
          //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
          if(ahead2.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead2.distanceTo(creaturePos);
          }
        }
      }

      if(threatening instanceof ModuleCreature){
        //console.log(threatening.getName(), 'is threatening', this.owner.getName());

        let dVector = threatening.position.clone().sub(this.owner.position).normalize();
        
        let creaturePos = threatening.position.clone();        
        let avoidance_force = ahead.clone().sub(dVector);
        avoidance_force.z = 0;
        let newTarget = this.owner.position.clone().add(avoidance_force);

        let tangent = newTarget.sub(this.owner.position.clone());
        let atan = Math.atan2(-avoidance_force.y, -avoidance_force.x);
        this.owner.rotation.z = (atan + Math.PI/2); //(1 - delta) * this.owner.rotation.z + delta * (atan + Math.PI/2)
        this.owner.AxisFront.x = Math.cos(atan);
        this.owner.AxisFront.y = Math.sin(atan);

        this.owner.blockingTimer += 1;
      }else{
        if(this.owner.blockingTimer > 0){
          this.owner.blockingTimer -= 0.5;
        }
        if(this.owner.blockingTimer > 0)
          this.owner.blockingTimer = 0;
      }

    }
  }

  setParameters( params: GFFStruct[] = [], count = 0 ){
    if(count){
      if(Array.isArray(params)){
        for(let i = 0; i < count; i++){
          this.parameters[i] = ActionParameter.FromStruct( params[i] );
        }
      }
    }
  }

  getParameter( index = 0 ){
    let param = this.parameters[index];
    switch(param.type){
      case ActionParameterType.DWORD:
        return ModuleObject.GetObjectById(param.value);
      default:
        return param.value;
    }
  }

  setParameter( index = 0, type = 0, value: any = 0 ){
    let param = this.parameters[index];

    if(typeof param == 'undefined'){
      param = this.parameters[index] = new ActionParameter( type );
    }

    switch(param.type){
      case ActionParameterType.INT:
        param.value = !isNaN((value|0)) ? (value|0) : 0;
      break;
      case ActionParameterType.FLOAT:
        param.value = !isNaN(parseFloat(value)) ? parseFloat(value) : 0;
      break;
      case ActionParameterType.DWORD:
        if(value instanceof ModuleObject){
          param.value = value.id ? value.id : ModuleObject.OBJECT_INVALID;
        }else{
          param.value = !isNaN(parseInt(value)) ? parseInt(value) : 0;
        }
      break;
      case ActionParameterType.STRING:
        param.value = value.toString();
      break;
      case ActionParameterType.SCRIPT_SITUATION:
        if(value instanceof NWScriptInstance)
          param.value = value;
      break;
      default:
        throw 'setParameter: Invalid type: ('+type+')';
    }
    return param.value;
  }

  static FromStruct( struct: GFFStruct ){
    let action = undefined;
    let actionId = struct.GetFieldByLabel('ActionId').GetValue();
    let groupId = struct.GetFieldByLabel('GroupActionId').GetValue();
    let paramCount = struct.GetFieldByLabel('NumParams').GetValue();

    let paramStructs: GFFStruct[] = [];
    if(struct.HasField('Paramaters'))
      paramStructs = struct.GetFieldByLabel('Paramaters').GetChildStructs();

    switch(actionId){
      case ActionType.ActionCombat:
        action = new ActionCombat(actionId, groupId);
      break;
      case ActionType.ActionCastSpell:
        action = new ActionCastSpell(actionId, groupId);
      break;
      case ActionType.ActionCloseDoor:
        action = new ActionCloseDoor(actionId, groupId);
      break;
      case ActionType.ActionDialogObject:
        action = new ActionDialogObject(actionId, groupId);
      break;
      case ActionType.ActionDoCommand:
        action = new ActionDoCommand(actionId, groupId);
      break;
      case ActionType.ActionDropItem:
        action = new ActionDropItem(actionId, groupId);
      break;
      case ActionType.ActionEquipItem:
        action = new ActionEquipItem(actionId, groupId);
      break;
      case ActionType.ActionFollowLeader:
        action = new ActionFollowLeader(actionId, groupId);
      break;
      case ActionType.ActionGiveItem:
        action = new ActionGiveItem(actionId, groupId);
      break;
      case ActionType.ActionItemCastSpell:
        action = new ActionItemCastSpell(actionId, groupId);
      break;
      case ActionType.ActionJumpToObject:
        action = new ActionJumpToObject(actionId, groupId);
      break;
      case ActionType.ActionJumpToPoint:
        action = new ActionJumpToPoint(actionId, groupId);
      break;
      case ActionType.ActionLockObject:
        action = new ActionLockObject(actionId, groupId);
      break;
      case ActionType.ActionMoveToPoint:
        action = new ActionMoveToPoint(actionId, groupId);
      break;
      case ActionType.ActionOpenDoor:
        action = new ActionOpenDoor(actionId, groupId);
      break;
      case ActionType.ActionPauseDialog:
        action = new ActionPauseDialog(actionId, groupId);
      break;
      case ActionType.ActionPlayAnimation:
        action = new ActionPlayAnimation(actionId, groupId);
      break;
      case ActionType.ActionPhysicalAttacks:
        action = new ActionPhysicalAttacks(actionId, groupId);
      break;
      case ActionType.ActionResumeDialog:
        action = new ActionResumeDialog(actionId, groupId);
      break;
      case ActionType.ActionSetCommandable:
        action = new ActionSetCommandable(actionId, groupId);
      break;
      case ActionType.ActionTakeItem:
        action = new ActionTakeItem(actionId, groupId);
      break;
      case ActionType.ActionUnlockObject:
        action = new ActionUnlockObject(actionId, groupId);
      break;
      case ActionType.ActionUseObject:
        action = new ActionUseObject(actionId, groupId);
      break;
      case ActionType.ActionWait:
        action = new ActionWait(actionId, groupId);
      break;
      default:
        console.log('ActionList Unhandled Action', '0x'+(actionId.toString(16).toUpperCase()), action, this);
      break;
    }

    if(action instanceof Action){
      action.setParameters(paramStructs, paramCount);
    }

    return action;
  }

}
