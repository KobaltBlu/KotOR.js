import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";

/**
 * MenuSaveName class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSaveName.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.EDITBOX.setEditable(true);

      this.BTN_OK.addEventListener('click', () => {
        // if(typeof this.onSave == 'function')
        //   this.onSave(this.EDITBOX.getValue())

        this.close();
      });
      this._button_b = this.BTN_OK;

      this.BTN_CANCEL.addEventListener('click', () => {


        this.close();
      });
      this._button_a = this.BTN_CANCEL;
      resolve();
    });
  }

  show() {
    this.tGuiPanel.widget.position.z = 10;
    this.EDITBOX.setText('');
    super.show();
    this.manager.activeGUIElement = this.EDITBOX;
  }
  
}
