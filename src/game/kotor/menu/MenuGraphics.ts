/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUISlider, GUIListBox, GUIButton, GUICheckBox } from "../../../gui";

/* @file
* The MenuGraphics menu class.
*/

export class MenuGraphics extends GameMenu {

  LBL_TITLE: GUILabel;
  SLI_GAMMA: GUISlider;
  LBL_GAMMA: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;
  BTN_RESOLUTION: GUIButton;
  CB_SHADOWS: GUICheckBox;
  CB_GRASS: GUICheckBox;
  BTN_ADVANCED: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgraphics';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}
  
}
