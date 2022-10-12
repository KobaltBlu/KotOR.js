/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuInventory as K1_MenuInventory, GUILabel, GUIButton, GUIListBox } from "../../../gui";

/* @file
* The MenuInventory menu class.
*/

export class MenuInventory extends K1_MenuInventory {

  declare LBL_BAR6: GUILabel;
  declare LBL_FILTER: GUILabel;
  declare LBL_INV: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare BTN_USEITEM: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare BTN_ALL: GUIButton;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare BTN_DATAPADS: GUIButton;
  declare BTN_WEAPONS: GUIButton;
  declare BTN_ARMOR: GUIButton;
  declare BTN_USEABLE: GUIButton;
  declare BTN_MISC: GUIButton;
  declare BTN_QUESTS: GUIButton;
  declare BTN_EXIT: GUIButton;
  declare LB_ITEMS: GUIListBox;
  declare LB_DESCRIPTION: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'inventory_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  Show() {
    super.Show();
    GameState.MenuActive = true;
    this.LB_ITEMS.clearItems();
    let inv = InventoryManager.getNonQuestInventory();
    for (let i = 0; i < inv.length; i++) {
      this.LB_ITEMS.addItem(inv[i]);
    }
    TextureLoader.LoadQueue();
    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();
    for (let i = 0; i < PartyManager.party.length; i++) {
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];
      if (!i) {
        if (this.LBL_PORT.getFillTextureName() != portrait.baseresref) {
          this.LBL_PORT.setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
            this.LBL_PORT.setFillTexture(texture);
          });
        }
      } else {
        this['BTN_CHANGE' + i].show();
        if (this['BTN_CHANGE' + i].getFillTextureName() != portrait.baseresref) {
          this['BTN_CHANGE' + i].setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
            this['BTN_CHANGE' + i].setFillTexture(texture);
          });
        }
      }
    }
  }
  
}
