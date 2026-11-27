import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import { MenuScriptSelect as K1_MenuScriptSelect } from "@engine/games/kotor/menu/MenuScriptSelect";

/**
 * MenuScriptSelect class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuScriptSelect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuScriptSelect extends K1_MenuScriptSelect {

  declare LST_AIState: GUIListBox;
  declare LB_DESC: GUIListBox;
  declare LBL_TITLE: GUILabel;
  declare BTN_Back: GUIButton;
  declare BTN_Accept: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'scriptselect_p';
    this.background = '';
    // Modal over character — no void fill (K1 script select / AddPanel overlay).
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    // Keep K1 wiring (Back / Accept / list); only the layout resref differs.
    await super.menuControlInitializer(skipInit);
  }
  
}
