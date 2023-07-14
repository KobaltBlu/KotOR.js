/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { DialogMessageManager, FeedbackMessageManager, TLKManager } from "../../../managers";

/* @file
* The MenuMessages menu class.
*/

export class MenuMessages extends GameMenu {

  LB_MESSAGES: GUIListBox;
  LBL_MESSAGES: GUILabel;
  BTN_EXIT: GUIButton;
  LB_DIALOG: GUIListBox;
  BTN_SHOW: GUIButton;

  mode: number = 0;

  constructor(){
    super();
    this.gui_resref = 'messages';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;
      this.BTN_SHOW.addEventListener('click', (e: any) => {
        if(this.mode == 0){
          this.mode = 1;
        }else{
          this.mode = 0;
        }
        this.updateListVisibility();
      });
      resolve();
    });
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_MSG.onHoverIn();
    this.LB_MESSAGES.clearItems();
    this.LB_DIALOG.clearItems();

    const dlg_entries = DialogMessageManager.Entries.slice(0).reverse();
    for(let i = 0; i < dlg_entries.length; i++){
      const entry = dlg_entries[i];
      this.LB_DIALOG.addItem( `${entry.speaker}: ${entry.message}` );
    }

    const fb_entries = FeedbackMessageManager.Entries.slice(0).reverse();
    for(let i = 0; i < fb_entries.length; i++){
      const entry = fb_entries[i];
      this.LB_MESSAGES.addItem( `${entry.message}` );
    }

    this.updateListVisibility();

  }

  updateListVisibility(){
    this.LB_MESSAGES.hide();
    this.LB_DIALOG.hide();
    if(this.mode == 0){
      this.LB_DIALOG.show();
      this.BTN_SHOW.setText( TLKManager.GetStringById(42142).Value );
    }else{
      this.LB_MESSAGES.show();
      this.BTN_SHOW.setText( TLKManager.GetStringById(42143).Value );
    }
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_ABI.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_JOU.click();
  }
  
}
