/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuPazaakWager as K1_MenuPazaakWager, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuPazaakWager menu class.
*/

export class MenuPazaakWager extends K1_MenuPazaakWager {

  declare LBL_BG: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LBL_MAXIMUM: GUILabel;
  declare BTN_QUIT: GUIButton;
  declare BTN_WAGER: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare BTN_LESS: GUIButton;
  declare BTN_MORE: GUIButton;
  declare LBL_WAGERVAL: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'pazaakwager_p';
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
