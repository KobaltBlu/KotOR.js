/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuContainer menu class.
*/

export class MenuContainer extends GameMenu {

  LBL_MESSAGE: GUILabel;
  LB_ITEMS: GUIListBox;
  BTN_OK: GUIButton;
  BTN_GIVEITEMS: GUIButton;
  BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'container';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Hide(onClosed = false) {
  super.Hide();
  if (onClosed && this.container instanceof ModulePlaceable) {
    try {
      this.container.close(GameState.getCurrentPlayer());
    } catch (e: any) {
    }
  }
}

Open(object = undefined) {
  this.container = object;
  super.Open();
}

Show() {
  super.Show();
  this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
  this.LB_ITEMS.clearItems();
  if (this.container instanceof ModuleCreature || this.container instanceof ModulePlaceable) {
    let inventory = this.container.getInventory();
    for (let i = 0; i < inventory.length; i++) {
      let item = inventory[i];
      this.LB_ITEMS.addItem(item, null);
    }
    TextureLoader.LoadQueue();
  }
}
  
}
