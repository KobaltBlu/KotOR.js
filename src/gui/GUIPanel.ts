import type { GameMenu } from "./GameMenu";
import { GUIControl } from "./GUIControl";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import type { GFFStruct } from "../resource/GFFStruct";

/**
 * GUIPanel class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIPanel extends GUIControl {
  
  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIPanel;
  }

  createControl(){
    return this.widget;
  }

}