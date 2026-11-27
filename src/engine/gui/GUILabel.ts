import type { GFFStruct } from "@core/resource/GFFStruct";
import type { GameMenu } from "@engine/gui/GameMenu";
import { GUIControl } from "@engine/gui/GUIControl";
import { GUIControlTypeMask } from "@core/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@core/enums/gui/GUIControlType";

/**
 * GUILabel class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUILabel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUILabel extends GUIControl {
  
  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUILabel;
    this.setControlType(GUIControlType.Label);
  }

}
