/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GameMenu, GUIControl } from ".";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import { GFFStruct } from "../resource/GFFStruct";

/* @file
 * The GUIPanel class.
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