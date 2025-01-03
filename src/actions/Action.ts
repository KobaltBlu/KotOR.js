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
 * Base class for all game actions in the engine.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @remarks
 * Actions represent discrete behaviors that game objects can perform. They are managed
 * by the ActionQueue system and can be chained together to create complex behaviors.
 * Each action type extends this base class and implements its own update logic.
 * 
 * @file Action.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Action {
  
  /** Reference to the ActionQueue class */
  static ActionQueue: typeof ActionQueue = ActionQueue;

  /** The type identifier for this action */
  type: ActionType;

  /** Group identifier for related actions */
  groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID;

  /** The object performing the action */
  owner: ModuleObject;

  /** The target of the action, if any */
  target: ModuleObject;

  /** Array of parameters controlling the action's behavior */
  parameters: ActionParameter[];

  /** Pathfinding data for movement-based actions */
  path: any;

  /** Position data for finding open spaces */
  openSpot: any;

  /** Whether this action can be cleared from the queue */
  clearable: boolean = true;

  /** Associated combat action data */
  combatAction: ICombatAction;

  /** Reference to parent cutscene attack action */
  isCutsceneAttack: Action;

  /** The queue this action belongs to */
  queue: ActionQueue;

  /** Whether this action was initiated by user input */
  isUserAction: boolean = false;

  /**
   * Creates a new action instance.
   * 
   * @param actionId - Unique identifier for this action
   * @param groupId - Identifier for grouping related actions
   */
  constructor(actionId: number = -1, groupId: number = -1) {
    this.type = ActionType.ActionInvalid;
    this.groupId = groupId == -1 ? ActionQueue.AUTO_INCREMENT_GROUP_ID : groupId;
    this.owner = undefined;
    this.target = undefined;
    this.parameters = [];
    this.path = undefined;
    this.openSpot = undefined;
  }

  /**
   * Updates the action state.
   * 
   * @param delta - Time elapsed since last update in seconds
   * @returns Current status of the action
   * @virtual
   */
  update(delta: number = 0): ActionStatus {
    return ActionStatus.FAILED;
  }

  /**
   * The destructor for this action
   */
  dispose(){
    //stub
  }

  /**
   * Sets the owner of this action.
   * 
   * @param owner - The object that will perform this action
   */
  setOwner(owner: ModuleObject) {
    this.owner = owner;
  }

  /**
   * Gets the owner of this action.
   * 
   * @returns The object performing this action
   */
  getOwner() {
    return this.owner;
  }

  /**
   * Sets the target of this action.
   * 
   * @param target - The object this action is targeting
   */
  setTarget(target: ModuleObject) {
    this.target = target;
  }

  /**
   * Gets the target of this action.
   * 
   * @returns The target of this action
   */
  getTarget() {
    return this.target;
  }

  /**
   * Handles creature collision avoidance during movement.
   * 
   * @param delta - Time elapsed since last update in seconds
   * @remarks
   * This method checks for potential collisions with other creatures and
   * adjusts movement vectors to avoid them. Only applies to creature-type
   * objects that are part of the party.
   */
  runCreatureAvoidance(delta = 0) {
    if (!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;
    const owner: ModuleCreature = this.owner as any;

    if(GameState.PartyManager.party.indexOf(owner) >= 0){

      //Check Creature Avoidance
      let threatening = undefined;
      let threateningDistance = Infinity;
      let ahead = owner.position.clone().sub(owner.forceVector.clone().normalize()).multiplyScalar(1);
      let ahead2 = owner.position.clone().sub(owner.forceVector.clone().normalize()).multiplyScalar(1).multiplyScalar(0.5);
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
        owner.forceVector.x = Math.cos(atan);
        owner.forceVector.y = Math.sin(atan);

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

  /**
   * Sets multiple parameters for this action from GFF structs.
   * 
   * @param params - Array of GFF structs containing parameter data
   * @param count - Number of parameters to set
   */
  setParameters(params: GFFStruct[] = [], count = 0) {
    if (count) {
      if (Array.isArray(params)) {
        for (let i = 0; i < count; i++) {
          this.parameters[i] = ActionParameter.FromStruct(params[i]);
        }
      }
    }
  }

  /**
   * Gets the value of a parameter at the specified index.
   * 
   * @param index - Index of the parameter to retrieve
   * @returns The parameter value, converted to appropriate type
   */
  getParameter<T>(index = 0): T {
    let param = this.parameters[index];
    if (!param) { return; }
    switch (param.type) {
      case ActionParameterType.DWORD:
        return GameState.ModuleObjectManager.GetObjectById(param.value as number) as T;
      case ActionParameterType.SCRIPT_SITUATION:
        return param.scriptInstance as T;
      default:
        return param.value as T;
    }
  }

  /**
   * Sets a parameter value at the specified index.
   * 
   * @param index - Index of the parameter to set
   * @param type - Type of the parameter from ActionParameterType
   * @param value - Value to set
   * @returns The converted parameter value
   * @throws Error if parameter type is invalid
   */
  setParameter<T>(index = 0, type = 0, value: any = 0): T {
    let param = this.parameters[index];

    if (typeof param == 'undefined') {
      param = this.parameters[index] = new ActionParameter(type);
    }

    switch (param.type) {
      case ActionParameterType.INT:
        param.value = !isNaN((value | 0)) ? (value | 0) : 0;
        break;
      case ActionParameterType.FLOAT:
        param.value = !isNaN(parseFloat(value)) ? parseFloat(value) : 0;
        break;
      case ActionParameterType.DWORD:
        if (BitWise.InstanceOfObject(value, ModuleObjectType.ModuleObject)) {
          param.value = value.id ? value.id : ModuleObjectConstant.OBJECT_INVALID;
        } else {
          param.value = !isNaN(parseInt(value)) ? parseInt(value) : 0;
        }
        break;
      case ActionParameterType.STRING:
        param.value = value.toString();
        break;
      case ActionParameterType.SCRIPT_SITUATION:
        if (value instanceof GameState.NWScript.NWScriptInstance)
          param.scriptInstance = value;
        break;
      default:
        throw 'setParameter: Invalid type: (' + type + ')';
    }
    return param.value as T;
  }
}
