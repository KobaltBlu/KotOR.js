import type { GUIButton, GUIControl, GUILabel } from "../../../gui";
import { MenuLevelUp as K1_MenuLevelUp } from "../../kotor/KOTOR";

/**
 * MenuLevelUp class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuLevelUp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuLevelUp extends K1_MenuLevelUp {

  declare BTN_BACK: GUIButton;
  declare LBL_5: GUIControl;
  declare LBL_4: GUIControl;
  declare LBL_3: GUIControl;
  declare LBL_2: GUIControl;
  declare LBL_1: GUIControl;
  declare LBL_NUM1: GUILabel;
  declare LBL_NUM2: GUILabel;
  declare LBL_NUM3: GUILabel;
  declare LBL_NUM4: GUILabel;
  declare LBL_NUM5: GUILabel;
  declare BTN_STEPNAME4: GUIButton;
  declare BTN_STEPNAME1: GUIButton;
  declare BTN_STEPNAME2: GUIButton;
  declare BTN_STEPNAME3: GUIButton;
  declare BTN_STEPNAME5: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'leveluppnl_p';
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
