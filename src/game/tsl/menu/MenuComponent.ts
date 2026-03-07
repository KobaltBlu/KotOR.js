import { GameMenu } from "../../../gui";
import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";

/**
 * MenuComponent class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuComponent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuComponent extends GameMenu {

  declare LBL_BAR2: GUILabel;
  declare LB_DESCRIPTIONINV: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LB_DESCRIPTION: GUIListBox;
  declare LB_SHOPITEMS: GUIListBox;
  declare LB_INVITEMS: GUIListBox;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare LBL_COST_VALUE: GUILabel;
  declare LBL_COST: GUILabel;
  declare LBL_STOCK: GUILabel;
  declare LBL_STOCK_VALUE: GUILabel;
  declare BTN_Accept: GUIButton;
  declare BTN_Examine: GUIButton;
  declare BTN_CREATE_RANGED: GUIButton;
  declare BTN_CREATE_MELEE: GUIButton;
  declare BTN_CREATE_ARMOR: GUIButton;
  declare BTN_CREATE_LIGHTSABER: GUIButton;
  declare BTN_CREATE_MISC: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_RELATEDSKILL: GUILabel;
  declare BTN_BREAK_ALL: GUIButton;
  declare BTN_BREAK_WEAPONS: GUIButton;
  declare BTN_BREAK_ARMOR: GUIButton;
  declare BTN_BREAK_USEABLE: GUIButton;
  declare BTN_BREAK_MISC: GUIButton;
  declare LBL_TITLE2: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare LBL_BAR3: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'component_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
