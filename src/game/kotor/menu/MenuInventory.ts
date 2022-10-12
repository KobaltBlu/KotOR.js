/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuInventory menu class.
*/

export class MenuInventory extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_INV: GUILabel;
  LBL_CREDITS_VALUE: GUILabel;
  LBL_CREDITS: GUILabel;
  LB_DESCRIPTION: GUIListBox;
  LBL_BGPORT: GUILabel;
  LBL_BGSTATS: GUILabel;
  LBL_PORT: GUILabel;
  LBL_VIT: GUILabel;
  LBL_DEF: GUILabel;
  BTN_QUESTITEMS: GUIButton;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;
  BTN_USEITEM: GUIButton;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'inventory';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  GameState.MenuTop.LBLH_INV.onHoverIn();
  GameState.MenuActive = true;
  this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
  this.LB_ITEMS.clearItems();
  let inv = InventoryManager.getNonQuestInventory();
  for (let i = 0; i < inv.length; i++) {
    this.LB_ITEMS.addItem(inv[i]);
  }
  TextureLoader.LoadQueue();
  this['BTN_CHANGE1'].hide();
  this['BTN_CHANGE2'].hide();
  let currentPC = PartyManager.party[0];
  if (currentPC) {
    this.LBL_VIT.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
    this.LBL_DEF.setText(currentPC.getAC());
  }
  this.LBL_CREDITS_VALUE.setText(PartyManager.Gold);
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

triggerControllerBumperLPress() {
  GameState.MenuTop.BTN_EQU.click();
}

triggerControllerBumperRPress() {
  GameState.MenuTop.BTN_CHAR.click();
}
  
}
