/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton, MenuManager } from "../../../gui";
import { CharGenName as K1_CharGenName } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { CharGenManager } from "../../../managers/CharGenManager";

/* @file
* The CharGenName menu class.
*/

export class CharGenName extends K1_CharGenName {

  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare NAME_BOX_EDIT: GUILabel;
  declare END_BTN: GUIButton;
  declare BTN_RANDOM: GUIButton;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'name_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.NAME_BOX_EDIT.setEditable(true);

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.END_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedCreature.firstName = this.NAME_BOX_EDIT.getValue();
        MenuManager.CharGenQuickPanel.step2 = true;
        this.Close();
      });
      resolve();
    });
  }

  Show() {
    super.Show();
    this.NAME_BOX_EDIT.setText(CharGenManager.selectedCreature.firstName);
  }
  
}
