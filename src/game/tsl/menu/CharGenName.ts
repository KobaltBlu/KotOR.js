import { GameState } from "../../../GameState";
import type { GUILabel, GUIButton } from "../../../gui";
import { CharGenName as K1_CharGenName } from "../../kotor/KOTOR";

/**
 * CharGenName class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenName.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.NAME_BOX_EDIT.setEditable(true);

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.END_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.selectedCreature.firstName = this.NAME_BOX_EDIT.getValue();
        this.manager.CharGenQuickPanel.step2 = true;
        this.close();
      });

      this.BTN_RANDOM.addEventListener('click', (e) => {
        e.stopPropagation();
        this.NAME_BOX_EDIT.setText(GameState.CharGenManager.generateRandomName());
      });
      resolve();
    });
  }

  show() {
    super.show();
    this.NAME_BOX_EDIT.setText(GameState.CharGenManager.selectedCreature.firstName);
  }
  
}
