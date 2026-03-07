import type { PathPoint } from "../../../engine/pathfinding/PathPoint";

/**
 * IClosestPathPointData interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IClosestPathPointData.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IClosestPathPointData {
  point_a: PathPoint, 
  point_b: PathPoint, 
  closest_position_on_line: THREE.Vector3
}