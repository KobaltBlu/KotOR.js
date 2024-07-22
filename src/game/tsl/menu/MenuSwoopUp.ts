import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";


/**
 * MenuSwoopUp class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSwoopUp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSwoopUp extends GameMenu {

  declare LB_DESC: GUIListBox;
  declare LB_DESC_LS: GUIListBox;
  declare _3D_MODEL: GUILabel;
  declare _3D_MODEL_LS: GUILabel;
  declare LB_ITEMS: GUIListBox;
  declare LBL_UPGRADE31: GUILabel;
  declare LBL_UPGRADE32: GUILabel;
  declare LBL_UPGRADE33: GUILabel;
  declare LBL_UPGRADE41: GUILabel;
  declare LBL_UPGRADE42: GUILabel;
  declare LBL_UPGRADE43: GUILabel;
  declare LBL_UPGRADE44: GUILabel;
  declare BTN_UPGRADE31: GUIButton;
  declare BTN_UPGRADE32: GUIButton;
  declare BTN_UPGRADE33: GUIButton;
  declare LBL_PROPERTY: GUILabel;
  declare LBL_SLOTNAME: GUILabel;
  declare LBL_LSSLOTNAME: GUILabel;
  declare LBL_UPGRADES: GUILabel;
  declare LBL_UPGRADE_COUNT: GUILabel;
  declare BTN_ASSEMBLE: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_DESCBG_LS: GUILabel;
  declare LBL_DESCBG: GUILabel;
  declare BTN_UPGRADE34: GUIButton;
  declare BTN_UPGRADE35: GUIButton;
  declare BTN_UPGRADE36: GUIButton;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'swoopup_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
