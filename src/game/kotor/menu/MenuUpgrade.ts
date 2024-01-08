import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/**
 * MenuUpgrade class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuUpgrade.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgrade extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_DESCBG_LS: GUILabel;
  LB_DESC_LS: GUIListBox;
  _3D_MODEL: GUILabel;
  _3D_MODEL_LS: GUILabel;
  LBL_UPGRADE31: GUILabel;
  LBL_UPGRADE32: GUILabel;
  LBL_UPGRADE33: GUILabel;
  LBL_UPGRADE41: GUILabel;
  LBL_UPGRADE42: GUILabel;
  LBL_UPGRADE43: GUILabel;
  LBL_UPGRADE44: GUILabel;
  BTN_UPGRADE31: GUIButton;
  BTN_UPGRADE32: GUIButton;
  BTN_UPGRADE33: GUIButton;
  BTN_UPGRADE41: GUIButton;
  BTN_UPGRADE42: GUIButton;
  BTN_UPGRADE43: GUIButton;
  BTN_UPGRADE44: GUIButton;
  LBL_PROPERTY: GUILabel;
  LBL_SLOTNAME: GUILabel;
  LBL_LSSLOTNAME: GUILabel;
  LBL_UPGRADES: GUILabel;
  LBL_UPGRADE_COUNT: GUILabel;
  BTN_ASSEMBLE: GUIButton;
  LBL_TITLE: GUILabel;
  LBL_DESCBG: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'upgrade';
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
