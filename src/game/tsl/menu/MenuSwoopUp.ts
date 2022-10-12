/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuSwoopUp as K1_MenuSwoopUp, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuSwoopUp menu class.
*/

export class MenuSwoopUp extends K1_MenuSwoopUp {

  declare LB_DESC: GUIListBox;
  declare LB_DESC_LS: GUIListBox;
  declare _3D_MODEL: GUILabel;
  declare _3D_MODEL_LS: GUILabel;
  declare LB_ITEMS: GUIListBox;
  declare LBL_UPGRADE31: GUILabel;
  declare LBL_UPGRADE32: GUILabel;
  declare LBL_UPGRADE33: GUILabel;
  declare LBL_UPGRADE41: GUILabel;
  declare LBL_UPGRADE42: GUILabel;
  declare LBL_UPGRADE43: GUILabel;
  declare LBL_UPGRADE44: GUILabel;
  declare BTN_UPGRADE31: GUIButton;
  declare BTN_UPGRADE32: GUIButton;
  declare BTN_UPGRADE33: GUIButton;
  declare LBL_PROPERTY: GUILabel;
  declare LBL_SLOTNAME: GUILabel;
  declare LBL_LSSLOTNAME: GUILabel;
  declare LBL_UPGRADES: GUILabel;
  declare LBL_UPGRADE_COUNT: GUILabel;
  declare BTN_ASSEMBLE: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_DESCBG_LS: GUILabel;
  declare LBL_DESCBG: GUILabel;
  declare BTN_UPGRADE34: GUIButton;
  declare BTN_UPGRADE35: GUIButton;
  declare BTN_UPGRADE36: GUIButton;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'swoopup_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
