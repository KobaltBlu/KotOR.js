/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIListBox, GUIButton } from "../../../gui";
import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { InGameConfirm as K1_InGameConfirm } from "../../kotor/KOTOR";

/* @file
* The InGameConfirm menu class.
*/

export class InGameConfirm extends K1_InGameConfirm {

  declare LB_MESSAGE: GUIListBox;
  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'confirm_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close()
      });

      this.BTN_CANCEL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close()
      });

      this.tGuiPanel.widget.position.z = 10;
      resolve();
    });
  }

  Show() {
    super.Show();
  }

  Update(delta: number) {
    super.Update(delta);
    this.tGuiPanel.widget.position.x = 0;
    this.tGuiPanel.widget.position.y = 0;
  }

  ShowTutorialMessage(id = 39, nth = 0) {
    if (!GameState.TutorialWindowTracker[id]) {
      this.LB_MESSAGE.extent.top = 0;
      let tlkId = parseInt(TwoDAManager.datatables.get('tutorial')?.rows[id]['message_pc' + nth]);
      this.LB_MESSAGE.clearItems();
      this.LB_MESSAGE.addItem(TLKManager.GetStringById(tlkId));
      let messageHeight = this.LB_MESSAGE.getNodeHeight(this.LB_MESSAGE.children[0]);
      this.LB_MESSAGE.extent.height = messageHeight;
      this.tGuiPanel.extent.height = 87 + messageHeight;
      this.BTN_CANCEL.hide();
      this.BTN_OK.extent.top = this.tGuiPanel.extent.height / 2 + this.BTN_OK.extent.height / 2;
      this.tGuiPanel.resizeControl();
      this.LB_MESSAGE.resizeControl();
      this.tGuiPanel.recalculate();
      this.Show();
      GameState.TutorialWindowTracker[id] = 1;
    }
  }
  
}
