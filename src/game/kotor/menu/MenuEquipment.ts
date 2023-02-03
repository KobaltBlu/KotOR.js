/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { TextureType } from "../../../enums/loaders/TextureType";
import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton, GUIProtoItem, GUIControl, MenuManager } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import * as THREE from "three";
import { ModuleCreatureArmorSlot } from "../../../enums/module/ModuleCreatureArmorSlot";
import { ModuleItem } from "../../../module";
import { PartyManager } from "../../../managers/PartyManager";
import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { InventoryManager } from "../../../managers/InventoryManager";

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

  defaultControl: GUIControl;
  slot: ModuleCreatureArmorSlot;
  equipmentSelectionActive: boolean;
  selectedItem: ModuleItem;

  constructor(){
    super();
    this.gui_resref = 'equip';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.defaultControl = this.BTN_INV_BODY;

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      
      this.LB_DESC.hide();
      this.LBL_CANTEQUIP.hide();

      this.BTN_BACK = this.getControlByName('BTN_BACK');
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.equipmentSelectionActive){
          this.slot = null;
          this.equipmentSelectionActive = false;
          this.UpdateList();
        }else{
          this.Close();
        }
      });
      this._button_b = this.BTN_BACK;

      this.BTN_INV_IMPLANT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.IMPLANT;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.IMPLANT);
      });

      this.BTN_INV_HEAD.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.HEAD;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.HEAD);
      });

      this.BTN_INV_HANDS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.ARMS;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.ARMS);
      });

      this.BTN_INV_ARM_L.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.LEFTARMBAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.LEFTARMBAND);
      });

      this.BTN_INV_BODY.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.ARMOR;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.ARMOR);
      });

      this.BTN_INV_ARM_R.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.RIGHTARMBAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.RIGHTARMBAND);
      });

      this.BTN_INV_WEAP_L.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.LEFTHAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.LEFTHAND);
      });

      this.BTN_INV_BELT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.BELT;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.BELT);
      });

      this.BTN_INV_WEAP_R.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.RIGHTHAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e: any) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.RIGHTHAND);
      });

      this.BTN_EQUIP.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selectedItem instanceof ModuleItem){
          //console.log('selectedItem', this.selectedItem, this.slot, );
          let currentPC = PartyManager.party[0];
          if(this.selectedItem instanceof GUIItemNone){
            currentPC.unequipSlot(this.slot);
          }else if(this.selectedItem instanceof ModuleItem){
            currentPC.equipItem(this.slot, this.selectedItem, () => {
              this.UpdateSlotIcons();
            });
          }
          this.slot = null;
          this.equipmentSelectionActive = false;
          this.UpdateSelected(null);
          this.UpdateSlotIcons();
          this.UpdateList();
        }
      });
      

      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.UpdateSelected(item);
      }
      resolve();
    });
  }

  UpdateListHover(slot: number) {
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
      this.BTN_BACK.setText(TLKManager.GetStringById(1582));
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
      this.BTN_BACK.setText(TLKManager.GetStringById(1581));
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

  UpdateSelected(item: ModuleItem) {
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
      let implant = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.IMPLANT);
      if (implant) {
        let icon = 'i' + implant.getBaseItem().itemclass + '_' + ('000' + implant.getModelVariation()).slice(-3);
        if (this.LBL_INV_IMPLANT.getFillTextureName() != icon) {
          this.LBL_INV_IMPLANT.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_IMPLANT.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_IMPLANT.getFillTextureName() != 'iimplant') {
        this.LBL_INV_IMPLANT.setFillTextureName('iimplant');
        TextureLoader.tpcLoader.fetch('iimplant', (texture: OdysseyTexture) => {
          this.LBL_INV_IMPLANT.setFillTexture(texture);
        });
      }
      let head = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.HEAD);
      if (head) {
        let icon = 'i' + head.getBaseItem().itemclass + '_' + ('000' + head.getModelVariation()).slice(-3);
        if (this.LBL_INV_HEAD.getFillTextureName() != icon) {
          this.LBL_INV_HEAD.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_HEAD.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_HEAD.getFillTextureName() != 'ihead') {
        this.LBL_INV_HEAD.setFillTextureName('ihead');
        TextureLoader.tpcLoader.fetch('ihead', (texture: OdysseyTexture) => {
          this.LBL_INV_HEAD.setFillTexture(texture);
        });
      }
      let hands = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.ARMS);
      if (hands) {
        let icon = 'i' + hands.getBaseItem().itemclass + '_' + ('000' + hands.getModelVariation()).slice(-3);
        if (this.LBL_INV_HANDS.getFillTextureName() != icon) {
          this.LBL_INV_HANDS.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_HANDS.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_HANDS.getFillTextureName() != 'ihands') {
        this.LBL_INV_HANDS.setFillTextureName('ihands');
        TextureLoader.tpcLoader.fetch('ihands', (texture: OdysseyTexture) => {
          this.LBL_INV_HANDS.setFillTexture(texture);
        });
      }
      let l_arm = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTARMBAND);
      if (l_arm) {
        let icon = 'i' + l_arm.getBaseItem().itemclass + '_' + ('000' + l_arm.getModelVariation()).slice(-3);
        if (this.LBL_INV_ARM_L.getFillTextureName() != icon) {
          this.LBL_INV_ARM_L.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_ARM_L.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_ARM_L.getFillTextureName() != 'iforearm_l') {
        this.LBL_INV_ARM_L.setFillTextureName('iforearm_l');
        TextureLoader.tpcLoader.fetch('iforearm_l', (texture: OdysseyTexture) => {
          this.LBL_INV_ARM_L.setFillTexture(texture);
        });
      }
      let armor = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.ARMOR);
      if (armor) {
        let icon = 'i' + armor.getBaseItem().itemclass + '_' + ('000' + armor.getModelVariation()).slice(-3);
        if (this.LBL_INV_BODY.getFillTextureName() != icon) {
          this.LBL_INV_BODY.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_BODY.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_BODY.getFillTextureName() != 'iarmor') {
        this.LBL_INV_BODY.setFillTextureName('iarmor');
        TextureLoader.tpcLoader.fetch('iarmor', (texture: OdysseyTexture) => {
          this.LBL_INV_BODY.setFillTexture(texture);
        });
      }
      let r_arm = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTARMBAND);
      if (r_arm) {
        let icon = 'i' + r_arm.getBaseItem().itemclass + '_' + ('000' + r_arm.getModelVariation()).slice(-3);
        if (this.LBL_INV_ARM_R.getFillTextureName() != icon) {
          this.LBL_INV_ARM_R.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_ARM_R.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_ARM_R.getFillTextureName() != 'iforearm_r') {
        this.LBL_INV_ARM_R.setFillTextureName('iforearm_r');
        TextureLoader.tpcLoader.fetch('iforearm_r', (texture: OdysseyTexture) => {
          this.LBL_INV_ARM_R.setFillTexture(texture);
        });
      }
      let l_weap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
      if (l_weap) {
        let icon = 'i' + l_weap.getBaseItem().itemclass + '_' + ('000' + l_weap.getModelVariation()).slice(-3);
        if (this.LBL_INV_WEAP_L.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_L.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_WEAP_L.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_WEAP_L.getFillTextureName() != 'iweap_l') {
        this.LBL_INV_WEAP_L.setFillTextureName('iweap_l');
        TextureLoader.tpcLoader.fetch('iweap_l', (texture: OdysseyTexture) => {
          this.LBL_INV_WEAP_L.setFillTexture(texture);
        });
      }
      let belt = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.BELT);
      if (belt) {
        let icon = 'i' + belt.getBaseItem().itemclass + '_' + ('000' + belt.getModelVariation()).slice(-3);
        if (this.LBL_INV_BELT.getFillTextureName() != icon) {
          this.LBL_INV_BELT.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_BELT.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_BELT.getFillTextureName() != 'ibelt') {
        this.LBL_INV_BELT.setFillTextureName('ibelt');
        TextureLoader.tpcLoader.fetch('ibelt', (texture: OdysseyTexture) => {
          this.LBL_INV_BELT.setFillTexture(texture);
        });
      }
      let r_weap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
      if (r_weap) {
        let icon = 'i' + r_weap.getBaseItem().itemclass + '_' + ('000' + r_weap.getModelVariation()).slice(-3);
        if (this.LBL_INV_WEAP_R.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_R.setFillTextureName(icon);
          TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
            this.LBL_INV_WEAP_R.setFillTexture(texture);
          });
        }
      } else if (this.LBL_INV_WEAP_R.getFillTextureName() != 'iweap_r') {
        this.LBL_INV_WEAP_R.setFillTextureName('iweap_r');
        TextureLoader.tpcLoader.fetch('iweap_r', (texture: OdysseyTexture) => {
          this.LBL_INV_WEAP_R.setFillTexture(texture);
        });
      }
    } else {
    }
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_EQU.onHoverIn();
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
    let btn_change: GUIControl;
    for (let i = 0; i < PartyManager.party.length; i++) {
      btn_change = this.getControlByName('BTN_CHANGE' + i);
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = TwoDAManager.datatables.get('portraits').rows[portraitId];
      if (!i) {
        if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
          this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
            this.LBL_PORTRAIT.setFillTexture(texture);
          });
        }
      } else {
        btn_change.show();
        if (btn_change.getFillTextureName() != portrait.baseresref) {
          btn_change.setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
            btn_change.setFillTexture(texture);
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
    MenuManager.MenuTop.BTN_OPT.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_INV.click();
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

class GUIItemNone {
  constructor(){
    // super()
  }

  getIcon(){
    return 'inone';
  }

  getStackSize(){
    return 1;
  }

  getName(){
    //None String
    return TLKManager.TLKStrings[363].Value;
  }

}

class GUIInventoryItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below
      let button = new GUIButton(this.menu, this.control, this, this.scale);
      button.extent.width = 190;
      button.text.text = this.node.getName();
      button.autoCalculatePosition = false;
      this.children.push(button);

      let _buttonWidget = button.createControl();
      _buttonWidget.position.x = (this.extent.width - button.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      let buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      buttonIcon.text.text = this.node.getStackSize() > 1 ? this.node.getStackSize().toString() : '';
      buttonIcon.disableTextAlignment();
      buttonIcon.extent.width = 55;
      buttonIcon.extent.height = 55;
      buttonIcon.extent.top = 0;
      buttonIcon.extent.left = 0;
      buttonIcon.disableBorder();
      buttonIcon.disableHighlight();
      buttonIcon.hasText = true;
      buttonIcon.autoCalculatePosition = false;
      this.children.push(buttonIcon);

      let _buttonIconWidget = buttonIcon.createControl();
      _buttonIconWidget.position.x = -(this.extent.width/2 - buttonIcon.extent.width/2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;

      //Stack Count Text Position
      if(this.node.getStackSize() >= 100){
        buttonIcon.widget.userData.text.position.set(6, -10, 5);
      }else if(this.node.getStackSize() >= 10){
        buttonIcon.widget.userData.text.position.set(10, -10, 5);
      }else{
        buttonIcon.widget.userData.text.position.set(14, -10, 5);
      }

      this.widget.add(_buttonIconWidget);

      this.widget.userData.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.widget.userData.iconMaterial.transparent = true;
      this.widget.userData.iconMaterial.visible = false;
      this.widget.userData.iconSprite = new THREE.Sprite( this.widget.userData.iconMaterial );
      //console.log(this.node.getIcon());
      TextureLoader.enQueue(this.node.getIcon(), this.widget.userData.iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        this.widget.userData.iconMaterial.visible = true;
      });
      
      this.widget.userData.spriteGroup = new THREE.Group();
      //this.widget.spriteGroup.position.x = -(this.extent.width/2)-(52/2); //HACK
      //this.widget.spriteGroup.position.y -= 4;
      this.widget.userData.iconSprite.scale.x = 52;
      this.widget.userData.iconSprite.scale.y = 52;
      this.widget.userData.iconSprite.position.z = 1;

      this.widget.userData.hexMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.widget.userData.hexMaterial.transparent = true;
      this.widget.userData.hexSprite = new THREE.Sprite( this.widget.userData.hexMaterial );
      this.widget.userData.hexSprite.scale.x = this.widget.userData.hexSprite.scale.y = 64;
      this.widget.userData.hexSprite.position.z = 1;

      if(GameState.GameKey != 'TSL')
        this.widget.userData.spriteGroup.add(this.widget.userData.hexSprite);
        
      this.widget.userData.spriteGroup.add(this.widget.userData.iconSprite);

      if(this.node.getStackSize() >= 100){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_7');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else if(this.node.getStackSize() > 1){
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_6');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }else{
        this.widget.userData.hexMaterial.map = GUIListBox.hexTextures.get('lbl_hex_3');
        this.widget.userData.hexMaterial.needsUpdate = true;
      }

      this.onSelect = () => {
        if(this.selected){
          this.showHighlight();
          this.hideBorder();
          this.pulsing = true;
          this.text.color.setRGB(1, 1, 0);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;
  
          button.showHighlight();
          button.hideBorder();
          this.widget.userData.hexMaterial.color.setRGB(1, 1, 0);
          button.setHighlightColor(1, 1, 0);
          button.pulsing = true;
          buttonIcon.pulsing = true;

          button.text.color.setRGB(1, 1, 0);
          button.text.material.uniforms.diffuse.value = button.text.color;
          button.text.material.needsUpdate = true;
        }else{
          this.hideHighlight();
          this.showBorder();
          this.pulsing = false;
          this.text.color.setRGB(0, 0.658824, 0.980392);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;
  
          button.hideHighlight();
          button.showBorder();
          this.widget.userData.hexMaterial.color.setRGB(0, 0.658823549747467, 0.9803921580314636);
          button.setBorderColor(0, 0.658823549747467, 0.9803921580314636);
          button.pulsing = false;
          buttonIcon.pulsing = false;

          button.text.color.setRGB(0, 0.658824, 0.980392);
          button.text.material.uniforms.diffuse.value = button.text.color;
          button.text.material.needsUpdate = true;
        }
      };
      this.onSelect.call(this);

      //StackCount Text
      _buttonIconWidget.add(this.widget.userData.spriteGroup);
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}
