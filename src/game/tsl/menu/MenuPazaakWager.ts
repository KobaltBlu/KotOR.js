/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton } from "../../../gui";
import { MenuPazaakWager as K1_MenuPazaakWager } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  Show(): void {
    super.Show();
  }

  Hide(): void {
    super.Hide();
  }
  
}
