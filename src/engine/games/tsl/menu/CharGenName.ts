import type { GUILabel, GUIButton, GUIEditBox } from "@engine/gui";
import { CharGenName as K1_CharGenName } from "@engine/games/kotor/menu/CharGenName";

/**
 * CharGenName class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenName.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenName extends K1_CharGenName {

  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare NAME_BOX_EDIT: GUIEditBox;
  declare END_BTN: GUIButton;
  declare BTN_RANDOM: GUIButton;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'name_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(skipInit);
  }
  
}
