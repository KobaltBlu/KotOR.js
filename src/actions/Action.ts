
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { GameState } from "../GameState";
import { ICombatAction } from "../interface/combat/ICombatAction";
// import { ModuleObjectManager, PartyManager } from "../managers";
import type { ModuleCreature, ModuleObject } from "../module";
// import type { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFStruct } from "../resource/GFFStruct";
import { BitWise } from "../utility/BitWise";
import { ActionParameter } from "./ActionParameter";
import { ActionQueue } from "./ActionQueue";

/**
 * Action base class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Action.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Action {
  
  static ActionQueue: typeof ActionQueue = ActionQueue;

  type: ActionType;
  groupId: number = -1;
  owner: ModuleObject;
  target: ModuleObject;
  parameters: any[];
  path: any;
  openSpot: any;
  clearable: boolean = true;
  combatAction: ICombatAction;
  isCutsceneAttack: Action;
  queue: ActionQueue;
  isUserAction: boolean = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    this.type = ActionType.ActionInvalid;
    this.groupId = groupId;

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
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;
    const owner: ModuleCreature = this.owner as any;

    if(GameState.PartyManager.party.indexOf(owner) >= 0){

      //Check Creature Avoidance
      let threatening = undefined;
      let threateningDistance = Infinity;
      let ahead = owner.position.clone().sub(owner.AxisFront.clone().normalize()).multiplyScalar(1);
      let ahead2 = owner.position.clone().sub(owner.AxisFront.clone().normalize()).multiplyScalar(1).multiplyScalar(0.5);
      for(let i = 0; i < GameState.module.area.creatures.length; i++){
        let creature = GameState.module.area.creatures[i];
        if(creature === owner || creature.isDead())
          continue;

        let hitDistance = creature.getAppearance().hitdist;
        let creaturePos = creature.position.clone();
        let distance = owner.position.distanceTo(creature.position);

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

      for(let i = 0; i < GameState.PartyManager.party.length; i++){
        let creature = GameState.PartyManager.party[i];
        if(creature === owner || creature.isDead())
          continue;

        let hitDistance = creature.getAppearance().hitdist;
        let creaturePos = creature.position.clone();
        let distance = owner.position.distanceTo(creature.position);

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

      if(BitWise.InstanceOfObject(threatening, ModuleObjectType.ModuleCreature)){
        //console.log(threatening.getName(), 'is threatening', owner.getName());

        let dVector = threatening.position.clone().sub(owner.position).normalize();
        
        let creaturePos = threatening.position.clone();        
        let avoidance_force = ahead.clone().sub(dVector);
        avoidance_force.z = 0;
        let newTarget = owner.position.clone().add(avoidance_force);

        let tangent = newTarget.sub(owner.position.clone());
        let atan = Math.atan2(-avoidance_force.y, -avoidance_force.x);
        owner.rotation.z = (atan + Math.PI/2); //(1 - delta) * owner.rotation.z + delta * (atan + Math.PI/2)
        owner.AxisFront.x = Math.cos(atan);
        owner.AxisFront.y = Math.sin(atan);

        owner.blockingTimer += 1;
      }else{
        if(owner.blockingTimer > 0){
          owner.blockingTimer -= 0.5;
        }
        if(owner.blockingTimer > 0)
          owner.blockingTimer = 0;
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
        return GameState.ModuleObjectManager.GetObjectById(param.value);
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
        if(BitWise.InstanceOfObject(value, ModuleObjectType.ModuleObject)){
          param.value = value.id ? value.id : ModuleObjectConstant.OBJECT_INVALID;
        }else{
          param.value = !isNaN(parseInt(value)) ? parseInt(value) : 0;
        }
      break;
      case ActionParameterType.STRING:
        param.value = value.toString();
      break;
      case ActionParameterType.SCRIPT_SITUATION:
        if(value instanceof GameState.NWScript.NWScriptInstance)
          param.value = value;
      break;
      default:
        throw 'setParameter: Invalid type: ('+type+')';
    }
    return param.value;
  }

}
