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
import { ComputedPath } from "../engine/pathfinding/ComputedPath";

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
   * Used to store a reference for a computed path
   */
  computedPath: ComputedPath;

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

  setComputedPath(path: ComputedPath){
    this.computedPath = path;
    this.owner.setComputedPath(path);
  }

  /**
   * Handles creature collision avoidance during movement.
   * 
   * @param delta - Time elapsed since last update in seconds
   * @param finalTarget - The final destination point
   * @param excludeTarget - Optional object to exclude from avoidance (e.g., target object being moved to)
   * @remarks
   * This method checks for potential collisions with other creatures and
   * adjusts movement vectors to avoid them. Only applies to creature-type
   * objects that are part of the party.
   */
  runCreatureAvoidance(delta = 0, finalTarget: THREE.Vector3, excludeTarget?: ModuleObject) {
    if (!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;
    const owner: ModuleCreature = this.owner as any;

    // Early exit if no movement vector
    if (owner.forceVector.lengthSq() < 0.001) return;

    // Check if this is the player character
    const isPlayerCharacter = GameState.PartyManager.party.indexOf(owner) === 0;

    // Constants for avoidance behavior
    const AVOIDANCE_DISTANCE = 1.0; // Distance ahead to check for obstacles
    const AVOIDANCE_DISTANCE_SHORT = 0.5; // Shorter distance for closer detection
    const SAFETY_BUFFER = 1.1; // Multiplier for hit distance safety
    const BLOCKING_DECAY_RATE = 0.5; // Rate at which blocking timer decreases

    // Calculate look-ahead points (fixed direction - was backwards)
    const forceNormalized = owner.forceVector.clone().normalize();
    const ahead = owner.position.clone().add(forceNormalized.clone().multiplyScalar(AVOIDANCE_DISTANCE));
    const ahead2 = owner.position.clone().add(forceNormalized.clone().multiplyScalar(AVOIDANCE_DISTANCE_SHORT));

    // Find the closest obstacle
    let closestObstacle: ModuleCreature | undefined;
    let closestDistance = Infinity;

    // Helper function to check a creature for collision
    const checkCreatureCollision = (creature: ModuleCreature) => {
      if (creature === owner || creature.isDead() || !creature.getAppearance()) return;

      // Skip the target object if it's specified
      if (excludeTarget && creature === excludeTarget) {
        return;
      }

      // For player character, only avoid NPCs (not party members)
      if (isPlayerCharacter && GameState.PartyManager.party.indexOf(creature) >= 0) {
        return;
      }

      // For NPCs, avoid both other NPCs and party members
      if (!isPlayerCharacter && GameState.PartyManager.party.indexOf(creature) >= 0) {
        // Skip party members for NPCs to prevent them from avoiding each other
        return;
      }

      const hitDistance = creature.getAppearance().hitdist * SAFETY_BUFFER;
      const creaturePos = creature.position;

      // Check both look-ahead points
      const distAhead = ahead.distanceTo(creaturePos);
      const distAhead2 = ahead2.distanceTo(creaturePos);

      if (distAhead <= hitDistance && distAhead < closestDistance) {
        closestObstacle = creature;
        closestDistance = distAhead;
      } else if (distAhead2 <= hitDistance && distAhead2 < closestDistance) {
        closestObstacle = creature;
        closestDistance = distAhead2;
      }
    };

    // Check area creatures
    for (let i = 0; i < owner.area.creatures.length; i++) {
      checkCreatureCollision(owner.area.creatures[i]);
    }

    // For NPCs, also check party members for avoidance
    if (!isPlayerCharacter) {
      for (let i = 0; i < GameState.PartyManager.party.length; i++) {
        checkCreatureCollision(GameState.PartyManager.party[i]);
      }
    }

    // If no obstacle found, decay blocking timer and return
    if (!closestObstacle) {
      if (owner.blockingTimer > 0) {
        owner.blockingTimer = Math.max(0, owner.blockingTimer - BLOCKING_DECAY_RATE * delta);
      }
      return;
    }

    // Different avoidance behavior for player vs NPCs
    if (isPlayerCharacter) {
      // For player character, use force-based avoidance (adjust movement vector)
      this.applyPlayerAvoidance(owner, closestObstacle, closestDistance, delta);
    } else {
      // For NPCs, use full path recalculation
      this.calculateAvoidancePath(owner, closestObstacle, finalTarget, closestDistance);
      this.coordinateObstacleAvoidance(owner, closestObstacle);
    }

    owner.blockingTimer += 1;
  }

  /**
   * Applies force-based avoidance for player character
   */
  private applyPlayerAvoidance(owner: ModuleCreature, obstacle: ModuleCreature, obstacleDistance: number, delta: number) {
    const AVOIDANCE_FORCE = 0.3; // How strong the avoidance force is
    const MIN_AVOIDANCE_DISTANCE = 0.5; // Minimum distance before applying avoidance
    
    // Calculate avoidance force based on distance to obstacle
    const distanceToObstacle = owner.position.distanceTo(obstacle.position);
    const avoidanceStrength = Math.max(0, 1 - (distanceToObstacle / (obstacle.getHitDistance() * 2)));
    
    if (avoidanceStrength < 0.1) return; // Don't apply very weak forces
    
    // Calculate direction away from obstacle
    const awayFromObstacle = owner.position.clone().sub(obstacle.position).normalize();
    
    // Calculate perpendicular direction (90 degrees to the right)
    const perpendicular = new THREE.Vector3(-awayFromObstacle.y, awayFromObstacle.x, 0).normalize();
    
    // Determine which side to avoid to (based on current movement direction)
    const currentDirection = owner.forceVector.clone().normalize();
    const dotProduct = currentDirection.dot(perpendicular);
    const avoidDirection = dotProduct > 0 ? perpendicular : perpendicular.clone().negate();
    
    // Apply avoidance force to movement vector
    const avoidanceForce = avoidDirection.clone().multiplyScalar(AVOIDANCE_FORCE * avoidanceStrength * delta);
    owner.forceVector.add(avoidanceForce);
    
    // Normalize to maintain consistent speed
    const originalLength = owner.forceVector.length();
    if (originalLength > 0) {
      owner.forceVector.normalize().multiplyScalar(originalLength);
    }
  }

  /**
   * Calculates the avoidance path around an obstacle
   */
  private calculateAvoidancePath(owner: ModuleCreature, obstacle: ModuleCreature, finalTarget: THREE.Vector3, obstacleDistance: number) {
    const SAFETY_BUFFER = 1.5;
    const safeRadius = obstacle.getHitDistance() * SAFETY_BUFFER;

    // Calculate perpendicular direction for detour
    const direction = owner.forceVector.clone().normalize();
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();

    // Calculate two possible detour points
    const detourPoint1 = owner.area.getNearestWalkablePoint(
      obstacle.position.clone().add(perpendicular.clone().multiplyScalar(safeRadius)),
      owner.getHitDistance()
    );
    const detourPoint2 = owner.area.getNearestWalkablePoint(
      obstacle.position.clone().sub(perpendicular.clone().multiplyScalar(safeRadius)),
      owner.getHitDistance()
    );

     // Choose the better detour point based on edge distance
    const detour1Score = owner.area.scorePointEdgeDistance(detourPoint1);
    const detour2Score = owner.area.scorePointEdgeDistance(detourPoint2);
    const usePoint1 = detour1Score > detour2Score;
    const chosenDetourPoint = usePoint1 ? detourPoint1 : detourPoint2;

    // Create and set the avoidance path
    const path = ComputedPath.FromVector3List([owner.position, chosenDetourPoint]);
    const path2 = owner.area.path.traverseToPoint(owner, chosenDetourPoint, finalTarget, false);
    path2.prunePathPoints();
    path.merge(path2);
    path.fixWalkEdges(owner.getHitDistance());
    path.setOwner(owner);
    path.setColor(owner.helperColor);
    path.smooth();
    this.setComputedPath(path);
  }

  /**
   * Coordinates avoidance behavior with the obstacle creature
   */
  private coordinateObstacleAvoidance(owner: ModuleCreature, obstacle: ModuleCreature) {
    if (obstacle.action?.type !== ActionType.ActionMoveToPoint) return;

    const isObstacleMoving = obstacle.forceVector.lengthSq() > 0.001;
    if (!isObstacleMoving) return;

    const hitDistance = obstacle.getHitDistance() * 1.1;
    const obstacleAhead = obstacle.position.clone().add(obstacle.forceVector.clone().normalize());
    const obstacleMovingAway = obstacleAhead.distanceTo(owner.position) > hitDistance;

    // If obstacle is moving toward us, have it take alternate detour
    if (!obstacleMovingAway) {
      const target = new THREE.Vector3(
        obstacle.action.getParameter<number>(0),
        obstacle.action.getParameter<number>(1),
        obstacle.action.getParameter<number>(2)
      );

      // Calculate alternate detour (opposite of what we chose)
      const direction = obstacle.forceVector.clone().normalize();
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
      const safeRadius = obstacle.getHitDistance() * 1.5;
      
      const alternateDetour = owner.area.getNearestWalkablePoint(
        obstacle.position.clone().sub(perpendicular.clone().multiplyScalar(safeRadius)),
        obstacle.getHitDistance()
      );

      const path = ComputedPath.FromVector3List([obstacle.position, alternateDetour]);
      const path2 = obstacle.area.path.traverseToPoint(obstacle, alternateDetour, target, false);
      path2.prunePathPoints();
      path.merge(path2);
      path.fixWalkEdges(obstacle.getHitDistance());
      path.setOwner(obstacle);
      path.setColor(obstacle.helperColor);
      path.smooth();
      obstacle.action.setComputedPath(path);
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
