import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton, GUIControl } from "../../../gui";

/**
 * MenuLevelUp class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuLevelUp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuLevelUp extends GameMenu {

  LBL_BG: GUILabel;
  BTN_BACK: GUIButton;
  LBL_5: GUIControl;
  LBL_4: GUIControl;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  LBL_NUM1: GUILabel;
  LBL_NUM2: GUILabel;
  LBL_NUM3: GUILabel;
  LBL_NUM4: GUILabel;
  LBL_NUM5: GUILabel;
  BTN_STEPNAME4: GUIButton;
  BTN_STEPNAME1: GUIButton;
  BTN_STEPNAME2: GUIButton;
  BTN_STEPNAME3: GUIButton;
  BTN_STEPNAME5: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'leveluppnl';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
