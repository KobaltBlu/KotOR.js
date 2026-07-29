import type { GUILabel, GUIListBox, GUIButton, GUICheckBox } from "@/gui";
import { MenuGraphicsAdvanced as K1_MenuGraphicsAdvanced } from "@/game/kotor/KOTOR";

/**
 * MenuGraphicsAdvanced class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuGraphicsAdvanced.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGraphicsAdvanced extends K1_MenuGraphicsAdvanced {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare BTN_ANTIALIAS: GUIButton;
  declare BTN_ANTIALIASLEFT: GUIButton;
  declare BTN_ANTIALIASRIGHT: GUIButton;
  declare BTN_ANISOTROPY: GUIButton;
  declare BTN_ANISOTROPYLEFT: GUIButton;
  declare BTN_ANISOTROPYRIGHT: GUIButton;
  declare BTN_TEXQUAL: GUIButton;
  declare BTN_TEXQUALLEFT: GUIButton;
  declare BTN_TEXQUALRIGHT: GUIButton;
  declare CB_FRAMEBUFF: GUICheckBox;
  declare CB_VSYNC: GUICheckBox;
  declare CB_SOFTSHADOWS: GUICheckBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_CANCEL: GUIButton;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgraphicadv_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

}
