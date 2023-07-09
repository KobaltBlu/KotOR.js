/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { MenuQuestItem as K1_MenuQuestItem } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The MenuQuestItem menu class.
*/

export class MenuQuestItem extends K1_MenuQuestItem {

  declare LB_ITEM_DESCRIPTION: GUIListBox;
  declare LB_ITEMS: GUIListBox;
  declare LBL_TITLE: GUILabel;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'questitem_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
