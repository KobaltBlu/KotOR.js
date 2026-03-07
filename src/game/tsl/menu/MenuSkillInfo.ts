
import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuSkillInfo as K1_MenuSkillInfo } from "../../kotor/KOTOR";

/**
 * MenuSkillInfo class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSkillInfo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSkillInfo extends K1_MenuSkillInfo {

  declare LBL_MESSAGE: GUILabel;
  declare LB_SKILLS: GUIListBox;
  declare BTN_OK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'skillinfo_p';
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
