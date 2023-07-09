/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUIControl, GUIButton } from "../../../gui";
import { MenuManager } from "../../../managers";

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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_MSG.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuMessages.open();
      });

      this.BTN_JOU.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuJournal.open();
      });

      this.BTN_MAP.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuMap.open();
      });

      this.BTN_OPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuOptions.open();
      });

      this.BTN_CHAR.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuCharacter.open();
      });

      this.BTN_ABI.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuAbilities.open();
      });

      this.BTN_INV.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuInventory.open();
      });

      this.BTN_EQU.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        MenuManager.MenuEquipment.open();
      });

      this.tGuiPanel.offset.y = 198;
      this.recalculatePosition();
      resolve();
    });
  }

  show() {
    super.show();
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
      currentMenu.close();
    }
  }
  
}
