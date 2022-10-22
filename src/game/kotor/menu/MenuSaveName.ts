/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIButton, GUILabel } from "../../../gui";

/* @file
* The MenuSaveName menu class.
*/

export class MenuSaveName extends GameMenu {

  BTN_OK: GUIButton;
  BTN_CANCEL: GUIButton;
  EDITBOX: GUILabel;
  LBL_TITLE: GUILabel;

  onSave: Function;

  constructor(){
    super();
    this.gui_resref = 'savename';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.EDITBOX.setEditable(true);

      this.BTN_OK.addEventListener('click', () => {
        // if(typeof this.onSave == 'function')
        //   this.onSave(this.EDITBOX.getValue())

        this.Close();
      });
      this._button_b = this.BTN_OK;

      this.BTN_CANCEL.addEventListener('click', () => {


        this.Close();
      });
      this._button_a = this.BTN_CANCEL;
      resolve();
    });
  }

  Show() {
    this.tGuiPanel.widget.position.z = 10;
    this.EDITBOX.setText('');
    super.Show();
    GameState.activeGUIElement = this.EDITBOX;
  }
  
}
