/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuUpgrade menu class.
*/

export class MenuUpgrade extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_DESCBG_LS: GUILabel;
  LB_DESC_LS: GUIListBox;
  _3D_MODEL: GUILabel;
  _3D_MODEL_LS: GUILabel;
  LBL_UPGRADE31: GUILabel;
  LBL_UPGRADE32: GUILabel;
  LBL_UPGRADE33: GUILabel;
  LBL_UPGRADE41: GUILabel;
  LBL_UPGRADE42: GUILabel;
  LBL_UPGRADE43: GUILabel;
  LBL_UPGRADE44: GUILabel;
  BTN_UPGRADE31: GUIButton;
  BTN_UPGRADE32: GUIButton;
  BTN_UPGRADE33: GUIButton;
  BTN_UPGRADE41: GUIButton;
  BTN_UPGRADE42: GUIButton;
  BTN_UPGRADE43: GUIButton;
  BTN_UPGRADE44: GUIButton;
  LBL_PROPERTY: GUILabel;
  LBL_SLOTNAME: GUILabel;
  LBL_LSSLOTNAME: GUILabel;
  LBL_UPGRADES: GUILabel;
  LBL_UPGRADE_COUNT: GUILabel;
  BTN_ASSEMBLE: GUIButton;
  LBL_TITLE: GUILabel;
  LBL_DESCBG: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'upgrade';
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
