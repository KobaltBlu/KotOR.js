/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuUpgrade as K1_MenuUpgrade, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuUpgrade menu class.
*/

export class MenuUpgrade extends K1_MenuUpgrade {

  declare LB_ITEMS: GUIListBox;
  declare _3D_MODEL: GUILabel;
  declare _3D_MODEL_LS: GUILabel;
  declare LBL_UPGRADE33: GUILabel;
  declare LBL_UPGRADE31: GUILabel;
  declare LBL_UPGRADE32: GUILabel;
  declare BTN_UPGRADE33: GUIButton;
  declare BTN_UPGRADE31: GUIButton;
  declare BTN_UPGRADE32: GUIButton;
  declare LBL_PROPERTY: GUILabel;
  declare LBL_SLOTNAME: GUILabel;
  declare BTN_ASSEMBLE: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare BTN_BACK: GUIButton;
  declare LBL_UPGRADE31_LS: GUILabel;
  declare LBL_UPGRADE32_LS: GUILabel;
  declare LBL_UPGRADE33_LS: GUILabel;
  declare BTN_UPGRADE31_LS: GUIButton;
  declare BTN_UPGRADE32_LS: GUIButton;
  declare BTN_UPGRADE33_LS: GUIButton;
  declare LBL_UPGRADE34_LS: GUILabel;
  declare LBL_UPGRADE35_LS: GUILabel;
  declare LBL_UPGRADE36_LS: GUILabel;
  declare BTN_UPGRADE34_LS: GUIButton;
  declare BTN_UPGRADE35_LS: GUIButton;
  declare BTN_UPGRADE36_LS: GUIButton;
  declare LB_DESC: GUIListBox;
  declare BTN_OK: GUIButton;
  declare LBL_TITLE2: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'upgrade_p';
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