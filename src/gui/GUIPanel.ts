/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GameMenu, GUIControl } from ".";
import { GFFStruct } from "../resource/GFFStruct";

/* @file
 * The GUIPanel class.
 */

export class GUIPanel extends GUIControl {
  
  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  createControl(){
    return this.widget;
  }

}