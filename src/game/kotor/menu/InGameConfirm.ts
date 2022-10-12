/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUIButton } from "../../../gui";

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

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  this.RecalculatePosition();
}

Update(delta) {
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
    let tlkId = parseInt(Global.kotor2DA.tutorial.rows[id]['message' + nth]);
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
