/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuSkillInfo as K1_MenuSkillInfo } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The MenuSkillInfo menu class.
*/

export class MenuSkillInfo extends K1_MenuSkillInfo {

  declare LBL_MESSAGE: GUILabel;
  declare LB_SKILLS: GUIListBox;
  declare BTN_OK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'skillinfo_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
