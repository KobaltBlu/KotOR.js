import * as THREE from "three";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ComputedPath } from "@/engine/pathfinding/ComputedPath";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import type { Action } from "@/actions/Action";

export function runActionCreatureAvoidance(
  action: Action,
  delta = 0,
  finalTarget: THREE.Vector3,
  excludeTarget?: ModuleObject,
) {
  if (!BitWise.InstanceOfObject(action.owner, ModuleObjectType.ModuleCreature)) return;
  const owner: ModuleCreature = action.owner as any;

  if (owner.forceVector.lengthSq() < 0.001) return;

  const isPlayerCharacter = GameState.PartyManager.party.indexOf(owner) === 0;

  const AVOIDANCE_DISTANCE = 1.0;
  const AVOIDANCE_DISTANCE_SHORT = 0.5;
  const SAFETY_BUFFER = 1.1;
  const BLOCKING_DECAY_RATE = 0.5;

  const forceNormalized = owner.forceVector.clone().normalize();
  const ahead = owner.position.clone().add(forceNormalized.clone().multiplyScalar(AVOIDANCE_DISTANCE));
  const ahead2 = owner.position.clone().add(forceNormalized.clone().multiplyScalar(AVOIDANCE_DISTANCE_SHORT));

  let closestObstacle: ModuleCreature | undefined;
  let closestDistance = Infinity;

  const checkCreatureCollision = (creature: ModuleCreature) => {
    if (creature === owner || creature.isDead() || !creature.getAppearance()) return;

    if (excludeTarget && creature === excludeTarget) {
      return;
    }

    if (isPlayerCharacter && GameState.PartyManager.party.indexOf(creature) >= 0) {
      return;
    }

    if (!isPlayerCharacter && GameState.PartyManager.party.indexOf(creature) >= 0) {
      return;
    }

    const hitDistance = creature.getAppearance().hitdist * SAFETY_BUFFER;
    const creaturePos = creature.position;

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

  for (let i = 0; i < owner.area.creatures.length; i++) {
    checkCreatureCollision(owner.area.creatures[i]);
  }

  if (!isPlayerCharacter) {
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      checkCreatureCollision(GameState.PartyManager.party[i]);
    }
  }

  if (!closestObstacle) {
    if (owner.blockingTimer > 0) {
      owner.blockingTimer = Math.max(0, owner.blockingTimer - BLOCKING_DECAY_RATE * delta);
    }
    return;
  }

  if (isPlayerCharacter) {
    applyPlayerAvoidance(owner, closestObstacle, delta);
  } else {
    calculateAvoidancePath(action, owner, closestObstacle, finalTarget);
    coordinateObstacleAvoidance(owner, closestObstacle);
  }

  owner.blockingTimer += 1;
}

function applyPlayerAvoidance(owner: ModuleCreature, obstacle: ModuleCreature, delta: number) {
  const AVOIDANCE_FORCE = 0.3;

  const distanceToObstacle = owner.position.distanceTo(obstacle.position);
  const avoidanceStrength = Math.max(0, 1 - (distanceToObstacle / (obstacle.getHitDistance() * 2)));

  if (avoidanceStrength < 0.1) return;

  const awayFromObstacle = owner.position.clone().sub(obstacle.position).normalize();
  const perpendicular = new THREE.Vector3(-awayFromObstacle.y, awayFromObstacle.x, 0).normalize();

  const currentDirection = owner.forceVector.clone().normalize();
  const dotProduct = currentDirection.dot(perpendicular);
  const avoidDirection = dotProduct > 0 ? perpendicular : perpendicular.clone().negate();

  const avoidanceForce = avoidDirection.clone().multiplyScalar(AVOIDANCE_FORCE * avoidanceStrength * delta);
  owner.forceVector.add(avoidanceForce);

  const originalLength = owner.forceVector.length();
  if (originalLength > 0) {
    owner.forceVector.normalize().multiplyScalar(originalLength);
  }
}

function calculateAvoidancePath(
  action: Action,
  owner: ModuleCreature,
  obstacle: ModuleCreature,
  finalTarget: THREE.Vector3,
) {
  const SAFETY_BUFFER = 1.5;
  const safeRadius = obstacle.getHitDistance() * SAFETY_BUFFER;

  const direction = owner.forceVector.clone().normalize();
  const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();

  const detourPoint1 = owner.area.getNearestWalkablePoint(
    obstacle.position.clone().add(perpendicular.clone().multiplyScalar(safeRadius)),
    owner.getHitDistance(),
  );
  const detourPoint2 = owner.area.getNearestWalkablePoint(
    obstacle.position.clone().sub(perpendicular.clone().multiplyScalar(safeRadius)),
    owner.getHitDistance(),
  );

  const detour1Score = owner.area.scorePointEdgeDistance(detourPoint1);
  const detour2Score = owner.area.scorePointEdgeDistance(detourPoint2);
  const usePoint1 = detour1Score > detour2Score;
  const chosenDetourPoint = usePoint1 ? detourPoint1 : detourPoint2;

  const path = ComputedPath.FromVector3List([owner.position, chosenDetourPoint]);
  const path2 = owner.area.path.traverseToPoint(owner, chosenDetourPoint, finalTarget, false);
  path2.prunePathPoints();
  path.merge(path2);
  path.setOwner(owner);
  path.fixWalkEdges(owner.getHitDistance());
  path.setColor(owner.helperColor);
  path.smooth();
  path.realtime = action.computedPath?.realtime ?? false;
  path.timer = 20;
  action.setComputedPath(path);
}

function coordinateObstacleAvoidance(owner: ModuleCreature, obstacle: ModuleCreature) {
  if (obstacle.action?.type !== ActionType.ActionMoveToPoint) return;

  const isObstacleMoving = obstacle.forceVector.lengthSq() > 0.001;
  if (!isObstacleMoving) return;

  const hitDistance = obstacle.getHitDistance() * 1.1;
  const obstacleAhead = obstacle.position.clone().add(obstacle.forceVector.clone().normalize());
  const obstacleMovingAway = obstacleAhead.distanceTo(owner.position) > hitDistance;

  if (!obstacleMovingAway) {
    const target = new THREE.Vector3(
      obstacle.action.getParameter<number>(0),
      obstacle.action.getParameter<number>(1),
      obstacle.action.getParameter<number>(2),
    );

    const direction = obstacle.forceVector.clone().normalize();
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
    const safeRadius = obstacle.getHitDistance() * 1.5;

    const alternateDetour = owner.area.getNearestWalkablePoint(
      obstacle.position.clone().sub(perpendicular.clone().multiplyScalar(safeRadius)),
      obstacle.getHitDistance(),
    );

    const path = ComputedPath.FromVector3List([obstacle.position, alternateDetour]);
    const path2 = obstacle.area.path.traverseToPoint(obstacle, alternateDetour, target, false);
    path2.prunePathPoints();
    path.merge(path2);
    path.setOwner(obstacle);
    path.fixWalkEdges(obstacle.getHitDistance());
    path.setColor(obstacle.helperColor);
    path.smooth();
    path.realtime = obstacle.action.computedPath?.realtime ?? false;
    path.timer = 20;
    obstacle.action.setComputedPath(path);
  }
}
