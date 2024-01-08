import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/**
 * MenuPazaakWager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakWager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakWager extends GameMenu {

  LBL_BG: GUILabel;
  LBL_WAGERVAL: GUILabel;
  LBL_TITLE: GUILabel;
  LBL_MAXIMUM: GUILabel;
  BTN_LESS: GUIButton;
  BTN_MORE: GUIButton;
  BTN_QUIT: GUIButton;
  BTN_WAGER: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pazaakwager';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
