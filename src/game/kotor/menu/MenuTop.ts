import { GameMenu } from "../../../gui";
import type { GUIControl, GUIButton } from "../../../gui";

/**
 * MenuTop class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuTop.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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
      this.BTN_MSG.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuMessages.open();
      });

      this.BTN_JOU.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuJournal.open();
      });

      this.BTN_MAP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuMap.open();
      });

      this.BTN_OPT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuOptions.open();
      });

      this.BTN_CHAR.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuCharacter.open();
      });

      this.BTN_ABI.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuAbilities.open();
      });

      this.BTN_INV.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuInventory.open();
      });

      this.BTN_EQU.addEventListener('click', (e) => {
        e.stopPropagation();
        this.CloseAllOtherMenus();
        this.manager.MenuEquipment.open();
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
    let currentMenu = this.manager.GetCurrentMenu();
    if (currentMenu == this.manager.MenuAbilities || currentMenu == this.manager.MenuInventory || currentMenu == this.manager.MenuJournal || currentMenu == this.manager.MenuMap || currentMenu == this.manager.MenuMessages || currentMenu == this.manager.MenuOptions || currentMenu == this.manager.MenuCharacter || currentMenu == this.manager.MenuEquipment) {
      currentMenu.close();
    }
  }
  
}
