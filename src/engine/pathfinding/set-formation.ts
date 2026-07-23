import * as THREE from "three";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";

const DEG2RAD = Math.PI / 180;

/**
 * Retail CSWSCreature::SetFormation @ 00514700.
 * formations.2da ANGLE_n / DISTANCE_n → MoveToPoint + ChangeFacingPoint.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file set-formation.ts
 */
export function setCreatureFormation(
  anchor: ModuleObject,
  creature: ModuleCreature,
  pattern: number,
  position: number
): boolean {
  if(!BitWise.InstanceOfObject(anchor, ModuleObjectType.ModuleObject)){
    return false;
  }
  if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)){
    return false;
  }
  if(position < 1 || position > 10){
    return false;
  }

  const formations = GameState.TwoDAManager.datatables.get("formations");
  if(!formations?.rows?.[pattern]){
    return false;
  }

  const row = formations.rows[pattern];
  const angleKey = `angle_${position}`;
  const distKey = `distance_${position}`;
  const angleDeg = parseFloat(row[angleKey] ?? row[angleKey.toUpperCase()] ?? row[`ANGLE_${position}`]);
  const distance = parseFloat(row[distKey] ?? row[distKey.toUpperCase()] ?? row[`DISTANCE_${position}`]);
  if(!Number.isFinite(angleDeg) || !Number.isFinite(distance)){
    return false;
  }

  // Retail Yaw @ 004aa0f0 on anchor orientation, then + ANGLE degrees.
  const ox = typeof anchor.getXOrientation === "function" ? anchor.getXOrientation() : 0;
  const oy = typeof anchor.getYOrientation === "function" ? anchor.getYOrientation() : 1;
  const yaw = -Math.atan2(ox, oy);
  const theta = yaw + angleDeg * DEG2RAD;

  // Rotate (distance, 0, 0) by yaw+angle around Z (retail Quaternion * Vector).
  const target = new THREE.Vector3(
    anchor.position.x + distance * Math.cos(theta),
    anchor.position.y + distance * Math.sin(theta),
    anchor.position.z
  );

  const move = new GameState.ActionFactory.ActionMoveToPoint();
  move.setParameter(0, ActionParameterType.FLOAT, target.x);
  move.setParameter(1, ActionParameterType.FLOAT, target.y);
  move.setParameter(2, ActionParameterType.FLOAT, target.z);
  move.setParameter(3, ActionParameterType.DWORD, creature.area?.id ?? GameState.module?.area?.id ?? 0);
  move.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
  move.setParameter(5, ActionParameterType.INT, 1); // run
  move.setParameter(6, ActionParameterType.FLOAT, 1.0);
  move.setParameter(7, ActionParameterType.INT, 0);
  move.setParameter(8, ActionParameterType.FLOAT, 30.0);
  creature.actionQueue.add(move);

  // Retail trailing action 0x31 ActionChangeFacingPoint toward computed spot.
  const face = new GameState.ActionFactory.ActionChangeFacingPoint();
  face.setParameter(0, ActionParameterType.FLOAT, target.x);
  face.setParameter(1, ActionParameterType.FLOAT, target.y);
  creature.actionQueue.add(face);

  return true;
}
