/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuQuestItem menu class.
*/

export class MenuQuestItem extends GameMenu {

  LB_ITEM_DESCRIPTION: GUIListBox;
  LB_ITEMS: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'questitem';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
