import type { ModuleObject } from "../../module";
import type { PerceptionType } from "../../enums/engine/PerceptionType";

/**
 * IPerceptionInfo interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IPerceptionInfo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @see https://nwnlexicon.com/index.php?title=Perception
 * @interface
 */
export interface IPerceptionInfo {
  object: ModuleObject;
  objectId: number;
  data: number;
};