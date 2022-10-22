/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUIButton } from "../../../gui";
import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";

/* @file
* The InGameConfirm menu class.
*/

export class InGameConfirm extends GameMenu {

  LB_MESSAGE: GUIListBox;
  BTN_OK: GUIButton;
  BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'confirm';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_a = this.BTN_OK;

      this.BTN_CANCEL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_b = this.BTN_CANCEL;

      this.tGuiPanel.widget.position.z = 10;
      resolve();
    });
  }

  Show() {
    super.Show();
    this.RecalculatePosition();
  }

  Update(delta: number = 0) {
    super.Update(delta);
    if (!this.bVisible)
      return;
    this.tGuiPanel.widget.position.x = 0;
    this.tGuiPanel.widget.position.y = 0;
    this.LB_MESSAGE.updateBounds();
    this.BTN_CANCEL.updateBounds();
    this.BTN_OK.updateBounds();
  }

  ShowTutorialMessage(id = 39, nth = 0) {
    if (!GameState.TutorialWindowTracker[id]) {
      this.LB_MESSAGE.extent.top = 0;
      let tlkId = parseInt(TwoDAManager.datatables.get('tutorial').rows[id]['message' + nth]);
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
      this.Open();
      GameState.TutorialWindowTracker[id] = 0;
    }
  }
  
}
