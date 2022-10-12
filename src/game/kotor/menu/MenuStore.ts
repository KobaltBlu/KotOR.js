/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuStore menu class.
*/

export class MenuStore extends GameMenu {

  LB_INVITEMS: GUIListBox;
  LB_DESCRIPTION: GUIListBox;
  LB_SHOPITEMS: GUIListBox;
  LBL_BUYSELL: GUILabel;
  LBL_CREDITS_VALUE: GUILabel;
  LBL_CREDITS: GUILabel;
  LBL_COST_VALUE: GUILabel;
  LBL_COST: GUILabel;
  LBL_STOCK: GUILabel;
  LBL_STOCK_VALUE: GUILabel;
  BTN_Examine: GUIButton;
  BTN_Cancel: GUIButton;
  BTN_Accept: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'store';
    this.background = '1600x1200store';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

getItemSellPrice(item = undefined) {
  return item.cost + item.cost * this.storeObject.getMarkUp();
}

getItemBuyPrice(item = undefined) {
  return item.cost + item.cost * this.storeObject.getMarkDown();
}

Open(storeObject = undefined, creature = undefined, bonusMarkUp = 0, bonusMarkDown = 0) {
  this.storeObject = storeObject;
  this.creature = creature;
  this.bonusMarkUp = bonusMarkUp;
  this.bonusMarkDown = bonusMarkDown;
  super.Open();
}

Show() {
  super.Show();
  GameState.MenuActive = true;
  if (this.storeObject instanceof ModuleStore) {
    this.LB_DESCRIPTION.clearItems();
    this.LB_DESCRIPTION.hide();
    this.LB_INVITEMS.hide();
    this.LB_SHOPITEMS.hide();
    if (this.sellMode) {
      this.BTN_EXAMINE.setText(TLKManager.GetStringById(41937));
      this.LBL_COST.setText(TLKManager.GetStringById(41945));
      this.LBL_BUYSELL.setText(TLKManager.GetStringById(32130));
      this.BTN_ACCEPT.setText(TLKManager.GetStringById(32130));
      this.LB_INVITEMS.clearItems();
      let inv = InventoryManager.getSellableInventory();
      for (let i = 0; i < inv.length; i++) {
        this.LB_INVITEMS.addItem(inv[i], item => {
          this.LBL_COST_VALUE.setText(this.getItemSellPrice(item));
          this.LB_DESCRIPTION.clearItems();
          this.LB_DESCRIPTION.addItem(item.getDescription());
          this.LB_DESCRIPTION.updateList();
          this.LB_DESCRIPTION.show();
        });
      }
      this.LB_INVITEMS.select(this.LB_INVITEMS.children[0]);
      this.LB_INVITEMS.show();
    } else {
      this.BTN_EXAMINE.setText(TLKManager.GetStringById(41938));
      this.LBL_COST.setText(TLKManager.GetStringById(41943));
      this.LBL_BUYSELL.setText(TLKManager.GetStringById(32132));
      this.BTN_ACCEPT.setText(TLKManager.GetStringById(32132));
      this.LB_SHOPITEMS.clearItems();
      let inv = this.storeObject.getInventory();
      for (let i = 0; i < inv.length; i++) {
        this.LB_SHOPITEMS.addItem(inv[i], item => {
          this.LBL_COST_VALUE.setText(this.getItemBuyPrice(item));
          this.LB_DESCRIPTION.clearItems();
          this.LB_DESCRIPTION.addItem(item.getDescription());
          this.LB_DESCRIPTION.updateList();
          this.LB_DESCRIPTION.show();
        });
      }
      this.LB_SHOPITEMS.select(this.LB_SHOPITEMS.children[0]);
      this.LB_SHOPITEMS.show();
    }
    this.LBL_CREDITS_VALUE.setText(PartyManager.Gold || 0);
    TextureLoader.LoadQueue();
  } else {
    this.Close();
  }
}
  
}
