/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuMessages as K1_MenuMessages } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The MenuMessages menu class.
*/

export class MenuMessages extends K1_MenuMessages {

  declare LBL_BAR6: GUILabel;
  declare LB_MESSAGES: GUIListBox;
  declare LBL_MESSAGES: GUILabel;
  declare LB_DIALOG: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare BTN_DIALOG: GUIButton;
  declare BTN_FEEDBACK: GUIButton;
  declare LBL_FILTER: GUILabel;
  declare BTN_EXIT: GUIButton;
  declare BTN_COMBAT: GUIButton;
  declare BTN_EFFECTS: GUIButton;
  declare LB_COMBAT: GUIListBox;
  declare LB_EFFECTS_GOOD: GUIListBox;
  declare LB_EFFECTS_BAD: GUIListBox;
  declare LBL_EFFECTS_GOOD: GUILabel;
  declare LBL_EFFECTS_BAD: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'messages_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

show() {
  super.show();
}
  
}
