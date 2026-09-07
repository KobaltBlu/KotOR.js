import type { GUIButton, GUILabel, GUIEditBox } from "@/gui";
import { MenuSaveName as K1_MenuSaveName } from "@/game/kotor/KOTOR";

/**
 * MenuSaveName class.
 *
 * (savename_p).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuSaveName.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSaveName extends K1_MenuSaveName {

  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare EDITBOX: GUIEditBox;
  declare LBL_TITLE: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'savename_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    // Inherit K1 wiring (OK/Cancel/edit focus); only swap the TSL GUI resref.
    await super.menuControlInitializer(skipInit);
  }

}
