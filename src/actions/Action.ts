import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { GameState } from "../GameState";
import { ICombatAction } from "../interface/combat/ICombatAction";
// import { ModuleObjectManager, PartyManager } from "../managers";
import { type ModuleCreature, type ModuleObject } from "../module";
// import type { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFStruct } from "../resource/GFFStruct";
import { BitWise } from "../utility/BitWise";
import { ActionParameter } from "./ActionParameter";
import { ActionQueue } from "./ActionQueue";
import * as THREE from "three";
import { ComputedPath } from "../module/ModulePath";
// import { PathPoint } from "../engine/pathfinding/PathPoint";

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
  runCreatureAvoidance(delta = 0, finalTarget: THREE.Vector3) {
    if (!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;
    const owner: ModuleCreature = this.owner as any;

    /**
     * Don't run avoidance for player controller creatures
     */
    if(GameState.PartyManager.party.indexOf(owner) == 0)
      return;

    //Check Creature Avoidance
    let obstacle = undefined;
    let obstacleDistance = Infinity;
    let ahead = owner.position.clone().sub(owner.forceVector.clone().normalize()).multiplyScalar(1);
    let ahead2 = owner.position.clone().sub(owner.forceVector.clone().normalize()).multiplyScalar(1).multiplyScalar(0.5);
    for(let i = 0; i < owner.area.creatures.length; i++){
      const creature = owner.area.creatures[i];
      if(creature === owner || creature.isDead())
        continue;

      const hitDistance = creature.getAppearance().hitdist * 1.1;
      // let creaturePos = creature.position;
      // let distance = owner.position.distanceTo(creature.position);

      if(ahead.distanceTo(creature.position) <= hitDistance){
        if(ahead.distanceTo(creature.position) < obstacleDistance){
          obstacle = creature;
          obstacleDistance = ahead.distanceTo(creature.position);
        }
      }else if(ahead2.distanceTo(creature.position) <= hitDistance){
        if(ahead2.distanceTo(creature.position) < obstacleDistance){
          obstacle = creature;
          obstacleDistance = ahead2.distanceTo(creature.position);
        }
      }   
    }

    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      const creature = GameState.PartyManager.party[i];
      if(creature === owner || creature.isDead())
        continue;

      let hitDistance = creature.getAppearance().hitdist * 1.1;
      let creaturePos = creature.position.clone();
      // let distance = owner.position.distanceTo(creature.position);

      if(ahead.distanceTo(creaturePos) <= hitDistance){
        if(ahead.distanceTo(creaturePos) < obstacleDistance){
          obstacle = creature;
          obstacleDistance = ahead.distanceTo(creaturePos);
        }
      }else if(ahead2.distanceTo(creaturePos) <= hitDistance){
        if(ahead2.distanceTo(creaturePos) < obstacleDistance){
          obstacle = creature;
          obstacleDistance = ahead2.distanceTo(creaturePos);
        }
      }
    }

    if(!BitWise.InstanceOfObject(obstacle, ModuleObjectType.ModuleCreature)){
      if(owner.blockingTimer > 0){
        owner.blockingTimer -= 0.5;
      }
      if(owner.blockingTimer < 0)
        owner.blockingTimer = 0;

      return;
    }

    const safetyBuffer = 1.5; // Buffer to ensure we steer clear of the obstacle
    const safeRadius = obstacle.getHitDistance() * safetyBuffer;

    const line_dir = this.owner.forceVector.clone();
    const line_a = this.owner.position.clone();
    const line_b = line_a.clone().sub(line_dir.clone().multiplyScalar(obstacleDistance * 2));

    // const avoidRadius = this.owner.position.distanceTo(obstacle.position);//Math.max(safeRadius, this.owner.position.distanceTo(threatening.position) * 2);

    const start = this.owner.position.clone();
    // const end = this.owner.position.clone().add(this.owner.forceVector);
    const direction = new THREE.Vector3().subVectors(line_b, start).normalize();
    // const dir2 = this.owner.forceVector.clone().multiplyScalar(avoidRadius);
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();

    const detourPoint1 = this.owner.area.getNearestWalkablePoint(
      obstacle.position.clone().add(perpendicular.clone().multiplyScalar(safeRadius)),
      this.owner.getHitDistance()
    );
    const detourPoint2 = this.owner.area.getNearestWalkablePoint(
      obstacle.position.clone().sub(perpendicular.clone().multiplyScalar(safeRadius)),
      this.owner.getHitDistance()
    );

    // Determine which detour point is further from a walkable edge
    const detour1ToEnd = this.owner.area.scorePointEdgeDistance(detourPoint1);
    const detour2ToEnd = this.owner.area.scorePointEdgeDistance(detourPoint2);

    const useP1 =(detour1ToEnd > detour2ToEnd);
    const chosenDetourPoint = useP1 ? detourPoint1 : detourPoint2;

    // const endSafe = this.owner.area.getNearestWalkablePoint(line_b, this.owner.getHitDistance());

    const path = ComputedPath.FromVector3List([this.owner.position, chosenDetourPoint]);
    const path2 = owner.area.path.traverseToPoint(this.owner, chosenDetourPoint, finalTarget, false);
    path2.prunePathPoints();
    path.merge(path2);
    path.fixWalkEdges(this.owner.getHitDistance());
    path.setOwner(this.owner);
    path.setColor(this.owner.helperColor);
    path.smooth();
    this.owner.setComputedPath(path);

    /**
     * Have the threatening NPC wait a beat before resuming their MoveToPoint
     */
    if(obstacle.action?.type == ActionType.ActionMoveToPoint){
      const isObstacleMoving = !!obstacle.forceVector.length();
      const hitDistance = obstacle.getHitDistance() * 1.1;
      let ahead = obstacle.position.clone().sub(obstacle.forceVector);
      const obstacleMovingAway = (ahead.distanceTo(owner.position) > hitDistance)

      /**
       * If the obstacle is moving on a collision course with this NPC
       * have it take the alternate detour
       */
      if(isObstacleMoving && !obstacleMovingAway){
        const tTarget = new THREE.Vector3(
          obstacle.action.getParameter<number>(0),
          obstacle.action.getParameter<number>(1),
          obstacle.action.getParameter<number>(2),
        );
        const chosenDetourPoint = !useP1 ? detourPoint1 : detourPoint2;
        const path = ComputedPath.FromVector3List([obstacle.position, chosenDetourPoint]);
        const path2 = obstacle.area.path.traverseToPoint(obstacle, chosenDetourPoint, tTarget, false);
        path2.prunePathPoints();
        path.merge(path2);
        path.fixWalkEdges(obstacle.getHitDistance());
        path.setOwner(obstacle);
        path.setColor(obstacle.helperColor);
        path.smooth();
        obstacle.setComputedPath(path);
      }
      /**
       * Have the NPC wait a beat before resuming their move action
       */
      else if(isObstacleMoving) 
      {
        // const w = new GameState.ActionFactory.ActionWait();
        // w.setParameter(0, ActionParameterType.FLOAT, 2.5);
        // obstacle.actionQueue.addFront(w);
      }
    }

    owner.blockingTimer += 1;
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
