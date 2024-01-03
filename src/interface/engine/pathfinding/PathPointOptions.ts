import type { PathPoint } from "../../../engine/pathfinding/PathPoint";

export interface PathPointOptions {
  id: number;
  connections: PathPoint[];
  first_connection: number;
  num_connections: number;
  vector: THREE.Vector3;
}