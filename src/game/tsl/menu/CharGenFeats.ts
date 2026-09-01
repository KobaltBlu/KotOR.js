import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GUIFeatItem } from "@/game/tsl/gui/GUIFeatItem";
import { CharGenFeats as K1_CharGenFeats } from "@/game/kotor/KOTOR";

/**
 * CharGenFeats class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenFeats.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenFeats extends K1_CharGenFeats {

  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare STD_SELECTIONS_REMAINING_LBL: GUILabel;
  declare STD_REMAINING_SELECTIONS_LBL: GUILabel;
  declare LB_DESC: GUIListBox;
  declare LBL_NAME: GUILabel;
  declare BTN_SELECT: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_ACCEPT: GUIButton;
  declare BTN_RECOMMENDED: GUIButton;
  declare LB_FEATS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'ftchrgen_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(skipInit);
  }

  protected getFeatItemClass() {
    return GUIFeatItem;
  }
  
}
