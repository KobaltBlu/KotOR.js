import type { PathPoint } from "../../../engine/pathfinding/PathPoint";

export interface ClosestPathPointData {
  point_a: PathPoint, 
  point_b: PathPoint, 
  closest_position_on_line: THREE.Vector3
}