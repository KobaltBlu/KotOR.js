/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, MenuManager } from "../../../gui";
import { CharGenManager } from "../../../managers/CharGenManager";

/* @file
* The CharGenName menu class.
*/

export class CharGenName extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  NAME_BOX_EDIT: GUILabel;
  END_BTN: GUIButton;
  BTN_RANDOM: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'name';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
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

      this.BTN_RANDOM.hide();
      resolve();
    });
  }

  Show() {
    super.Show();
    this.NAME_BOX_EDIT.setText(CharGenManager.selectedCreature.firstName);
  }
  
}
