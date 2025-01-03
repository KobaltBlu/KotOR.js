import type { PathPoint } from "../../../engine/pathfinding/PathPoint";
import type { ModuleArea } from "../../../module/ModuleArea";

/**
 * IPathPointOptions interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IPathPointOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IPathPointOptions {
  id: number;
  connections: PathPoint[];
  first_connection: number;
  num_connections: number;
  vector: THREE.Vector3;
  area?: ModuleArea
}