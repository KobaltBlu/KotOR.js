/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";
import { CharGenManager } from "../../../managers";

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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.NAME_BOX_EDIT.setEditable(true);

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });

      this.END_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedCreature.firstName = this.NAME_BOX_EDIT.getValue();
        this.manager.CharGenQuickPanel.step2 = true;
        this.close();
      });

      this.BTN_RANDOM.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.NAME_BOX_EDIT.setText(CharGenManager.generateRandomName());
      });
      resolve();
    });
  }

  show() {
    super.show();
    this.NAME_BOX_EDIT.setText(CharGenManager.selectedCreature.firstName);
  }
  
}
