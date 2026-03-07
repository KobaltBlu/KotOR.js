import { ModuleObject} from "../../module";
import { OdysseyModelAnimation } from "../../odyssey";
import { OdysseyModel3D } from "../../three/odyssey";

/**
 * IDLGStuntActor interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IDLGStuntActor.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IDLGStuntActor {
  participant: string;
  resref: string;
  model?: OdysseyModel3D;
  moduleObject?: ModuleObject;
  animations?: OdysseyModelAnimation[];
}