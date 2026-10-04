import type { GUIButton, GUIListBox, GUILabel } from "@engine/gui";
import { MenuResolutions as K1_MenuResolutions } from "@engine/games/kotor/menu/MenuResolutions";

/**
 * MenuResolutions class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuResolutions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuResolutions extends K1_MenuResolutions {

  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare LB_RESOLUTIONS: GUIListBox;
  declare LBL_RESOLUTION: GUILabel;

  constructor(){
    super();
    this.isOverlayGUI = true;
    this.gui_resref = 'optresolution_p';
    this.background = '';
    this.voidFill = false;
  }
  
}
