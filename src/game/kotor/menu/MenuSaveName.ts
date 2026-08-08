import { GameMenu } from "@/gui";
import type { GUILabel, GUIButton, GUIEditBox } from "@/gui";

/**
 * MenuSaveName class.
 *
 * Retail CSWGuiSaveNamePanel — overlay edit box for new save names.
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
  EDITBOX: GUIEditBox;
  LBL_TITLE: GUILabel;

  onSave: ((name: string) => void) | undefined;

  constructor(){
    super();
    this.isOverlayGUI = true;
    this.gui_resref = 'savename';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      // Retail save edit max length 0x10 (GUIEditBox default)

      this.BTN_OK.addEventListener('click', () => {
        const name = String(this.EDITBOX.getValue?.() ?? '').trim();
        const cb = this.onSave;
        this.onSave = undefined;
        this.close();
        if(typeof cb === 'function' && name){
          cb(name);
        }
      });
      this._button_a = this.BTN_OK;

      this.BTN_CANCEL.addEventListener('click', () => {
        this.onSave = undefined;
        this.close();
      });
      this._button_b = this.BTN_CANCEL;
      resolve();
    });
  }

  show() {
    this.EDITBOX.setText('');
    super.show();
    this.manager.activeGUIElement = this.EDITBOX;
    this.selectedControl = this.EDITBOX;
  }

  close() {
    this.onSave = undefined;
    super.close();
  }

}
