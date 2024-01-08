import type { GUILabel, GUIButton } from "../../../gui";
import { MenuPazaakWager as K1_MenuPazaakWager } from "../../kotor/KOTOR";

/**
 * MenuPazaakWager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakWager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }
  
}
