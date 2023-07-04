/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { DialogMessageManager, FeedbackMessageManager, MenuManager, TLKManager } from "../../../managers";

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
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
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

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_MSG.onHoverIn();
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
    MenuManager.MenuTop.BTN_ABI.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_JOU.click();
  }
  
}
