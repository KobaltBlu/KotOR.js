/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIControl, GUIButton, MenuManager } from "../../../gui";

/* @file
* The MenuTop menu class.
*/

export class MenuTop extends GameMenu {

  LBLH_ABI: GUIControl;
  LBLH_CHA: GUIControl;
  LBLH_EQU: GUIControl;
  LBLH_INV: GUIControl;
  LBLH_JOU: GUIControl;
  LBLH_MAP: GUIControl;
  LBLH_OPT: GUIControl;
  LBLH_MSG: GUIControl;
  BTN_EQU: GUIButton;
  BTN_INV: GUIButton;
  BTN_CHAR: GUIButton;
  BTN_ABI: GUIButton;
  BTN_MSG: GUIButton;
  BTN_JOU: GUIButton;
  BTN_MAP: GUIButton;
  BTN_OPT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'top';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
    });
  }

  Show() {
    super.Show();
    this.LBLH_OPT.onHoverOut();
    this.LBLH_MAP.onHoverOut();
    this.LBLH_JOU.onHoverOut();
    this.LBLH_ABI.onHoverOut();
    this.LBLH_MSG.onHoverOut();
    this.LBLH_CHA.onHoverOut();
    this.LBLH_INV.onHoverOut();
    this.LBLH_EQU.onHoverOut();
  }

  CloseAllOtherMenus() {
    let currentMenu = MenuManager.GetCurrentMenu();
    if (currentMenu == MenuManager.MenuAbilities || currentMenu == MenuManager.MenuInventory || currentMenu == MenuManager.MenuJournal || currentMenu == MenuManager.MenuMap || currentMenu == MenuManager.MenuMessages || currentMenu == MenuManager.MenuOptions || currentMenu == MenuManager.MenuCharacter || currentMenu == MenuManager.MenuEquipment) {
      currentMenu.Close();
    }
  }
  
}
