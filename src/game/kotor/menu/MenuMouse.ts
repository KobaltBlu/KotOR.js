/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIListBox, GUIButton, GUISlider, GUICheckBox } from "../../../gui";

/* @file
* The MenuMouse menu class.
*/

export class MenuMouse extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  SLI_MOUSESEN: GUISlider;
  LBL_MOUSESEN: GUILabel;
  CB_REVBUTTONS: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optmouse';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
