/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuEquipment menu class.
*/

export class MenuEquipment extends GameMenu {

  LBL_CANTEQUIP: GUILabel;
  LBL_ATTACK_INFO: GUILabel;
  LBL_TOHITR: GUILabel;
  LBL_PORT_BORD: GUILabel;
  LBL_PORTRAIT: GUILabel;
  LB_ITEMS: GUIListBox;
  LBL_DEF_INFO: GUILabel;
  BTN_INV_HEAD: GUIButton;
  LBL_INV_HEAD: GUILabel;
  BTN_INV_IMPLANT: GUIButton;
  LBL_INV_IMPLANT: GUILabel;
  BTN_INV_BODY: GUIButton;
  LBL_INV_BODY: GUILabel;
  BTN_INV_ARM_L: GUIButton;
  LBL_INV_ARM_L: GUILabel;
  BTN_INV_WEAP_L: GUIButton;
  LBL_INV_WEAP_L: GUILabel;
  BTN_INV_BELT: GUIButton;
  LBL_INV_BELT: GUILabel;
  BTN_INV_WEAP_R: GUIButton;
  LBL_INV_WEAP_R: GUILabel;
  BTN_INV_ARM_R: GUIButton;
  LBL_INV_ARM_R: GUILabel;
  BTN_INV_HANDS: GUIButton;
  LBL_INV_HANDS: GUILabel;
  LBL_ATKL: GUILabel;
  LBL_ATKR: GUILabel;
  LBL_TXTBAR: GUILabel;
  LBL_DEF: GUILabel;
  LBL_TITLE: GUILabel;
  LBL_VITALITY: GUILabel;
  LBL_DAMAGE: GUILabel;
  LBL_TOHITL: GUILabel;
  LBL_TOHIT: GUILabel;
  LBL_SLOTNAME: GUILabel;
  LBL_SELECTTITLE: GUILabel;
  BTN_BACK: GUIButton;
  BTN_EQUIP: GUIButton;
  LB_DESC: GUIListBox;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'equip';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

UpdateListHover(slot = null) {
  if (slot) {
    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    let inv = InventoryManager.getInventory(slot, GameState.getCurrentPlayer());
    this.LB_ITEMS.addItem(new GUIItemNone());
    for (let i = 0; i < inv.length; i++) {
      this.LB_ITEMS.addItem(inv[i]);
      TextureLoader.LoadQueue();
    }
  }
}

UpdateList() {
  if (!this.equipmentSelectionActive) {
    this.BTN_EQUIP.hide();
    this.BTN_EXIT.setText(TLKManager.GetStringById(1582));
    this.LB_DESC.hide();
    this.BTN_INV_IMPLANT.show();
    this.BTN_INV_HEAD.show();
    this.BTN_INV_HANDS.show();
    this.BTN_INV_ARM_L.show();
    this.BTN_INV_BODY.show();
    this.BTN_INV_ARM_R.show();
    this.BTN_INV_WEAP_L.show();
    this.BTN_INV_BELT.show();
    this.BTN_INV_WEAP_R.show();
    this.LBL_INV_IMPLANT.show();
    this.LBL_INV_HEAD.show();
    this.LBL_INV_HANDS.show();
    this.LBL_INV_ARM_L.show();
    this.LBL_INV_BODY.show();
    this.LBL_INV_ARM_R.show();
    this.LBL_INV_WEAP_L.show();
    this.LBL_INV_BELT.show();
    this.LBL_INV_WEAP_R.show();
    this.LBL_PORTRAIT.show();
    this.LBL_PORT_BORD.show();
    this.LBL_SLOTNAME.show();
    this.LBL_TXTBAR.show();
    this.LBL_SELECTTITLE.setText('');
  } else {
    this.BTN_EQUIP.show();
    this.BTN_EQUIP.setText(TLKManager.GetStringById(31387));
    this.BTN_EXIT.setText(TLKManager.GetStringById(1581));
    this.LB_DESC.show();
    this.BTN_INV_IMPLANT.hide();
    this.BTN_INV_HEAD.hide();
    this.BTN_INV_HANDS.hide();
    this.BTN_INV_ARM_L.hide();
    this.BTN_INV_BODY.hide();
    this.BTN_INV_ARM_R.hide();
    this.BTN_INV_WEAP_L.hide();
    this.BTN_INV_BELT.hide();
    this.BTN_INV_WEAP_R.hide();
    this.LBL_INV_IMPLANT.hide();
    this.LBL_INV_HEAD.hide();
    this.LBL_INV_HANDS.hide();
    this.LBL_INV_ARM_L.hide();
    this.LBL_INV_BODY.hide();
    this.LBL_INV_ARM_R.hide();
    this.LBL_INV_WEAP_L.hide();
    this.LBL_INV_BELT.hide();
    this.LBL_INV_WEAP_R.hide();
    this.LBL_PORTRAIT.hide();
    this.LBL_PORT_BORD.hide();
    this.LBL_SLOTNAME.hide();
    this.LBL_TXTBAR.hide();
    this.LBL_SELECTTITLE.setText('');
  }
  this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
  this.LB_ITEMS.clearItems();
  this.selectedItem = null;
  this.UpdateSelected(null);
  let currentPC = PartyManager.party[0];
  if (this.slot) {
    let inv = InventoryManager.getInventory(this.slot, currentPC);
    this.LB_ITEMS.addItem(new GUIItemNone());
    for (let i = 0; i < inv.length; i++) {
      this.LB_ITEMS.addItem(inv[i]);
      TextureLoader.LoadQueue();
    }
  }
}

UpdateSelected(item = null) {
  this.selectedItem = item;
  this.LB_DESC.clearItems();
  if (this.selectedItem instanceof ModuleItem) {
    this.LB_DESC.addItem(this.selectedItem.getDescription());
  } else {
  }
}

UpdateSlotIcons() {
  let currentPC = PartyManager.party[0];
  if (currentPC.getRace() == 6) {
    let implant = currentPC.GetItemInSlot(UTCObject.SLOT.IMPLANT);
    if (implant) {
      let icon = 'i' + implant.getBaseItem().itemclass + '_' + ('000' + implant.getModelVariation()).slice(-3);
      if (this.LBL_INV_IMPLANT.getFillTextureName() != icon) {
        this.LBL_INV_IMPLANT.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_IMPLANT.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_IMPLANT.getFillTextureName() != 'iimplant') {
      this.LBL_INV_IMPLANT.setFillTextureName('iimplant');
      TextureLoader.tpcLoader.fetch('iimplant', texture => {
        this.LBL_INV_IMPLANT.setFillTexture(texture);
      });
    }
    let head = currentPC.GetItemInSlot(UTCObject.SLOT.HEAD);
    if (head) {
      let icon = 'i' + head.getBaseItem().itemclass + '_' + ('000' + head.getModelVariation()).slice(-3);
      if (this.LBL_INV_HEAD.getFillTextureName() != icon) {
        this.LBL_INV_HEAD.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_HEAD.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_HEAD.getFillTextureName() != 'ihead') {
      this.LBL_INV_HEAD.setFillTextureName('ihead');
      TextureLoader.tpcLoader.fetch('ihead', texture => {
        this.LBL_INV_HEAD.setFillTexture(texture);
      });
    }
    let hands = currentPC.GetItemInSlot(UTCObject.SLOT.ARMS);
    if (hands) {
      let icon = 'i' + hands.getBaseItem().itemclass + '_' + ('000' + hands.getModelVariation()).slice(-3);
      if (this.LBL_INV_HANDS.getFillTextureName() != icon) {
        this.LBL_INV_HANDS.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_HANDS.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_HANDS.getFillTextureName() != 'ihands') {
      this.LBL_INV_HANDS.setFillTextureName('ihands');
      TextureLoader.tpcLoader.fetch('ihands', texture => {
        this.LBL_INV_HANDS.setFillTexture(texture);
      });
    }
    let l_arm = currentPC.GetItemInSlot(UTCObject.SLOT.LEFTARMBAND);
    if (l_arm) {
      let icon = 'i' + l_arm.getBaseItem().itemclass + '_' + ('000' + l_arm.getModelVariation()).slice(-3);
      if (this.LBL_INV_ARM_L.getFillTextureName() != icon) {
        this.LBL_INV_ARM_L.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_ARM_L.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_ARM_L.getFillTextureName() != 'iforearm_l') {
      this.LBL_INV_ARM_L.setFillTextureName('iforearm_l');
      TextureLoader.tpcLoader.fetch('iforearm_l', texture => {
        this.LBL_INV_ARM_L.setFillTexture(texture);
      });
    }
    let armor = currentPC.GetItemInSlot(UTCObject.SLOT.ARMOR);
    if (armor) {
      let icon = 'i' + armor.getBaseItem().itemclass + '_' + ('000' + armor.getModelVariation()).slice(-3);
      if (this.LBL_INV_BODY.getFillTextureName() != icon) {
        this.LBL_INV_BODY.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_BODY.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_BODY.getFillTextureName() != 'iarmor') {
      this.LBL_INV_BODY.setFillTextureName('iarmor');
      TextureLoader.tpcLoader.fetch('iarmor', texture => {
        this.LBL_INV_BODY.setFillTexture(texture);
      });
    }
    let r_arm = currentPC.GetItemInSlot(UTCObject.SLOT.RIGHTARMBAND);
    if (r_arm) {
      let icon = 'i' + r_arm.getBaseItem().itemclass + '_' + ('000' + r_arm.getModelVariation()).slice(-3);
      if (this.LBL_INV_ARM_R.getFillTextureName() != icon) {
        this.LBL_INV_ARM_R.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_ARM_R.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_ARM_R.getFillTextureName() != 'iforearm_r') {
      this.LBL_INV_ARM_R.setFillTextureName('iforearm_r');
      TextureLoader.tpcLoader.fetch('iforearm_r', texture => {
        this.LBL_INV_ARM_R.setFillTexture(texture);
      });
    }
    let l_weap = currentPC.GetItemInSlot(UTCObject.SLOT.LEFTHAND);
    if (l_weap) {
      let icon = 'i' + l_weap.getBaseItem().itemclass + '_' + ('000' + l_weap.getModelVariation()).slice(-3);
      if (this.LBL_INV_WEAP_L.getFillTextureName() != icon) {
        this.LBL_INV_WEAP_L.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_WEAP_L.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_WEAP_L.getFillTextureName() != 'iweap_l') {
      this.LBL_INV_WEAP_L.setFillTextureName('iweap_l');
      TextureLoader.tpcLoader.fetch('iweap_l', texture => {
        this.LBL_INV_WEAP_L.setFillTexture(texture);
      });
    }
    let belt = currentPC.GetItemInSlot(UTCObject.SLOT.BELT);
    if (belt) {
      let icon = 'i' + belt.getBaseItem().itemclass + '_' + ('000' + belt.getModelVariation()).slice(-3);
      if (this.LBL_INV_BELT.getFillTextureName() != icon) {
        this.LBL_INV_BELT.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_BELT.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_BELT.getFillTextureName() != 'ibelt') {
      this.LBL_INV_BELT.setFillTextureName('ibelt');
      TextureLoader.tpcLoader.fetch('ibelt', texture => {
        this.LBL_INV_BELT.setFillTexture(texture);
      });
    }
    let r_weap = currentPC.GetItemInSlot(UTCObject.SLOT.RIGHTHAND);
    if (r_weap) {
      let icon = 'i' + r_weap.getBaseItem().itemclass + '_' + ('000' + r_weap.getModelVariation()).slice(-3);
      if (this.LBL_INV_WEAP_R.getFillTextureName() != icon) {
        this.LBL_INV_WEAP_R.setFillTextureName(icon);
        TextureLoader.tpcLoader.fetch(icon, texture => {
          this.LBL_INV_WEAP_R.setFillTexture(texture);
        });
      }
    } else if (this.LBL_INV_WEAP_R.getFillTextureName() != 'iweap_r') {
      this.LBL_INV_WEAP_R.setFillTextureName('iweap_r');
      TextureLoader.tpcLoader.fetch('iweap_r', texture => {
        this.LBL_INV_WEAP_R.setFillTexture(texture);
      });
    }
  } else {
  }
}

Show() {
  super.Show();
  GameState.MenuTop.LBLH_EQU.onHoverIn();
  GameState.MenuActive = true;
  this.equipmentSelectionActive = false;
  this.selectedControl = this.defaultControl;
  this.UpdateList();
  this['BTN_CHANGE1'].hide();
  this['BTN_CHANGE2'].hide();
  this.UpdateSlotIcons();
  let currentPC = PartyManager.party[0];
  if (currentPC) {
    this.LBL_VITALITY.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
    this.LBL_DEF.setText(currentPC.getAC());
  }
  for (let i = 0; i < PartyManager.party.length; i++) {
    let partyMember = PartyManager.party[i];
    let portraitId = partyMember.getPortraitId();
    let portrait = Global.kotor2DA['portraits'].rows[portraitId];
    if (!i) {
      if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
        this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
        TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
          this.LBL_PORTRAIT.setFillTexture(texture);
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

triggerControllerAPress() {
  if (this.equipmentSelectionActive) {
    if (this.selectedControl instanceof GUIControl) {
      this.selectedControl.click();
    }
  } else {
    this.BTN_EQUIP.click();
  }
}

triggerControllerBumperLPress() {
  GameState.MenuTop.BTN_OPT.click();
}

triggerControllerBumperRPress() {
  GameState.MenuTop.BTN_INV.click();
}

triggerControllerDUpPress() {
  if (this.equipmentSelectionActive) {
    this.LB_ITEMS.directionalNavigate('up');
  } else {
    this.BTN_INV_IMPLANT.onHoverOut();
    this.BTN_INV_HEAD.onHoverOut();
    this.BTN_INV_HANDS.onHoverOut();
    this.BTN_INV_ARM_L.onHoverOut();
    this.BTN_INV_BODY.onHoverOut();
    this.BTN_INV_ARM_R.onHoverOut();
    this.BTN_INV_WEAP_L.onHoverOut();
    this.BTN_INV_BELT.onHoverOut();
    this.BTN_INV_WEAP_R.onHoverOut();
    if (this.selectedControl == this.BTN_INV_IMPLANT) {
    } else if (this.selectedControl == this.BTN_INV_HEAD) {
    } else if (this.selectedControl == this.BTN_INV_HANDS) {
    } else if (this.selectedControl == this.BTN_INV_ARM_L) {
      this.selectedControl = this.BTN_INV_IMPLANT;
    } else if (this.selectedControl == this.BTN_INV_BODY) {
      this.selectedControl = this.BTN_INV_HEAD;
    } else if (this.selectedControl == this.BTN_INV_ARM_R) {
      this.selectedControl = this.BTN_INV_HANDS;
    } else if (this.selectedControl == this.BTN_INV_WEAP_L) {
      this.selectedControl = this.BTN_INV_ARM_L;
    } else if (this.selectedControl == this.BTN_INV_BELT) {
      this.selectedControl = this.BTN_INV_BODY;
    } else if (this.selectedControl == this.BTN_INV_WEAP_R) {
      this.selectedControl = this.BTN_INV_ARM_R;
    }
    if (this.selectedControl instanceof GUIControl) {
      this.selectedControl.onHoverIn();
    }
  }
}

triggerControllerDDownPress() {
  if (this.equipmentSelectionActive) {
    this.LB_ITEMS.directionalNavigate('down');
  } else {
    this.BTN_INV_IMPLANT.onHoverOut();
    this.BTN_INV_HEAD.onHoverOut();
    this.BTN_INV_HANDS.onHoverOut();
    this.BTN_INV_ARM_L.onHoverOut();
    this.BTN_INV_BODY.onHoverOut();
    this.BTN_INV_ARM_R.onHoverOut();
    this.BTN_INV_WEAP_L.onHoverOut();
    this.BTN_INV_BELT.onHoverOut();
    this.BTN_INV_WEAP_R.onHoverOut();
    if (this.selectedControl == this.BTN_INV_IMPLANT) {
      this.selectedControl = this.BTN_INV_ARM_L;
    } else if (this.selectedControl == this.BTN_INV_HEAD) {
      this.selectedControl = this.BTN_INV_BODY;
    } else if (this.selectedControl == this.BTN_INV_HANDS) {
      this.selectedControl = this.BTN_INV_BODY;
    } else if (this.selectedControl == this.BTN_INV_ARM_L) {
      this.selectedControl = this.BTN_INV_WEAP_L;
    } else if (this.selectedControl == this.BTN_INV_BODY) {
      this.selectedControl = this.BTN_INV_BELT;
    } else if (this.selectedControl == this.BTN_INV_ARM_R) {
      this.selectedControl = this.BTN_INV_WEAP_R;
    } else if (this.selectedControl == this.BTN_INV_WEAP_L) {
    } else if (this.selectedControl == this.BTN_INV_BELT) {
    } else if (this.selectedControl == this.BTN_INV_WEAP_R) {
    }
    if (this.selectedControl instanceof GUIControl) {
      this.selectedControl.onHoverIn();
    }
  }
}

triggerControllerDLeftPress() {
  if (this.equipmentSelectionActive) {
  } else {
    this.BTN_INV_IMPLANT.onHoverOut();
    this.BTN_INV_HEAD.onHoverOut();
    this.BTN_INV_HANDS.onHoverOut();
    this.BTN_INV_ARM_L.onHoverOut();
    this.BTN_INV_BODY.onHoverOut();
    this.BTN_INV_ARM_R.onHoverOut();
    this.BTN_INV_WEAP_L.onHoverOut();
    this.BTN_INV_BELT.onHoverOut();
    this.BTN_INV_WEAP_R.onHoverOut();
    if (this.selectedControl == this.BTN_INV_IMPLANT) {
    } else if (this.selectedControl == this.BTN_INV_HEAD) {
      this.selectedControl = this.BTN_INV_IMPLANT;
    } else if (this.selectedControl == this.BTN_INV_HANDS) {
      this.selectedControl = this.BTN_INV_HEAD;
    } else if (this.selectedControl == this.BTN_INV_ARM_L) {
    } else if (this.selectedControl == this.BTN_INV_BODY) {
      this.selectedControl = this.BTN_INV_ARM_L;
    } else if (this.selectedControl == this.BTN_INV_ARM_R) {
      this.selectedControl = this.BTN_INV_BODY;
    } else if (this.selectedControl == this.BTN_INV_WEAP_L) {
    } else if (this.selectedControl == this.BTN_INV_BELT) {
      this.selectedControl = this.BTN_INV_WEAP_L;
    } else if (this.selectedControl == this.BTN_INV_WEAP_R) {
      this.selectedControl = this.BTN_INV_BELT;
    }
    if (this.selectedControl instanceof GUIControl) {
      this.selectedControl.onHoverIn();
    }
  }
}

triggerControllerDRightPress() {
  if (this.equipmentSelectionActive) {
  } else {
    this.BTN_INV_IMPLANT.onHoverOut();
    this.BTN_INV_HEAD.onHoverOut();
    this.BTN_INV_HANDS.onHoverOut();
    this.BTN_INV_ARM_L.onHoverOut();
    this.BTN_INV_BODY.onHoverOut();
    this.BTN_INV_ARM_R.onHoverOut();
    this.BTN_INV_WEAP_L.onHoverOut();
    this.BTN_INV_BELT.onHoverOut();
    this.BTN_INV_WEAP_R.onHoverOut();
    if (this.selectedControl == this.BTN_INV_IMPLANT) {
      this.selectedControl = this.BTN_INV_HEAD;
    } else if (this.selectedControl == this.BTN_INV_HEAD) {
      this.selectedControl = this.BTN_INV_HANDS;
    } else if (this.selectedControl == this.BTN_INV_HANDS) {
    } else if (this.selectedControl == this.BTN_INV_ARM_L) {
      this.selectedControl = this.BTN_INV_BODY;
    } else if (this.selectedControl == this.BTN_INV_BODY) {
      this.selectedControl = this.BTN_INV_ARM_R;
    } else if (this.selectedControl == this.BTN_INV_ARM_R) {
    } else if (this.selectedControl == this.BTN_INV_WEAP_L) {
      this.selectedControl = this.BTN_INV_BELT;
    } else if (this.selectedControl == this.BTN_INV_BELT) {
      this.selectedControl = this.BTN_INV_WEAP_R;
    } else if (this.selectedControl == this.BTN_INV_WEAP_R) {
    }
    if (this.selectedControl instanceof GUIControl) {
      this.selectedControl.onHoverIn();
    }
  }
}

triggerControllerLStickYPress(positive = false) {
  if (positive) {
    this.LB_DESC.scrollUp();
  } else {
    this.LB_DESC.scrollDown();
  }
}
  
}