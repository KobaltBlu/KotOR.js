/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { ModuleCreatureArmorSlot } from "../../../enums/module/ModuleCreatureArmorSlot";
import { GameState } from "../../../GameState";
import { GUILabel, GUIButton, GUIListBox, GUIProtoItem } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { InventoryManager } from "../../../managers/InventoryManager";
import { PartyManager } from "../../../managers/PartyManager";
import { ModuleItem } from "../../../module";
import { MenuEquipment as K1_MenuEquipment } from "../../kotor/KOTOR";
import * as THREE from "three";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { TextureType } from "../../../enums/loaders/TextureType";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The MenuEquipment menu class.
*/

export class MenuEquipment extends K1_MenuEquipment {

  declare LBL_BACK1: GUILabel;
  declare LBL_INV_WEAP_R2: GUILabel;
  declare LBL_INV_WEAP_L2: GUILabel;
  declare LBL_INV_WEAP_R: GUILabel;
  declare LBL_INV_WEAP_L: GUILabel;
  declare LBL_INV_BELT: GUILabel;
  declare LBL_INV_ARM_R: GUILabel;
  declare LBL_INV_BODY: GUILabel;
  declare LBL_INV_ARM_L: GUILabel;
  declare LBL_INV_HANDS: GUILabel;
  declare LBL_INV_HEAD: GUILabel;
  declare LBL_DEF_BACK: GUILabel;
  declare LBL_DEF: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_TOHITR: GUILabel;
  declare BTN_INV_HEAD: GUIButton;
  declare LBL_INV_IMPLANT: GUILabel;
  declare BTN_INV_BODY: GUIButton;
  declare BTN_INV_ARM_L: GUIButton;
  declare BTN_INV_WEAP_L: GUIButton;
  declare BTN_INV_WEAP_L2: GUIButton;
  declare BTN_INV_WEAP_R2: GUIButton;
  declare BTN_INV_BELT: GUIButton;
  declare BTN_INV_WEAP_R: GUIButton;
  declare BTN_INV_ARM_R: GUIButton;
  declare BTN_INV_HANDS: GUIButton;
  declare LBL_ATKL: GUILabel;
  declare LBL_ATKR: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LBL_DAMAGE: GUILabel;
  declare LBL_TOHITL: GUILabel;
  declare LBL_TOHIT: GUILabel;
  declare LBL_SLOTNAME: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_ATTACKMOD: GUILabel;
  declare LBL_DAMTEXT: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_EQUIP: GUIButton;
  declare LB_ITEMS: GUIListBox;
  declare BTN_SWAPWEAPONS: GUIButton;
  declare LBL_CANTEQUIP: GUILabel;
  declare BTN_PREVNPC: GUIButton;
  declare BTN_NEXTNPC: GUIButton;
  declare LBL_DEF_TEXT: GUILabel;
  declare LB_DESC: GUIListBox;
  declare BTN_INV_IMPLANT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'equip_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.BTN_INV_IMPLANT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.IMPLANT;
        this.UpdateList();
      });

      this.BTN_INV_HEAD.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.HEAD;
        this.UpdateList();
      });

      this.BTN_INV_HANDS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.ARMS;
        this.UpdateList();
      });

      this.BTN_INV_ARM_L.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.LEFTARMBAND;
        this.UpdateList();
      });

      this.BTN_INV_BODY.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.ARMOR;
        this.UpdateList();
      });

      this.BTN_INV_ARM_R.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.RIGHTARMBAND;
        this.UpdateList();
      });

      this.BTN_INV_WEAP_L.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.LEFTHAND;
        this.UpdateList();
      });

      this.BTN_INV_BELT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.BELT;
        this.UpdateList();
      });

      this.BTN_INV_WEAP_R.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.RIGHTHAND;
        this.UpdateList();
      });

      this.BTN_EQUIP.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.selectedItem instanceof ModuleItem){
          //console.log('selectedItem', this.selectedItem, this.slot, );
          let currentPC = PartyManager.party[0];
          currentPC.equipItem(this.slot, this.selectedItem, () => {
            this.UpdateSlotIcons();
          });
          this.slot = null as any;
          this.equipmentSelectionActive = false;
          this.UpdateSelected(undefined as any);
          this.UpdateSlotIcons();
        }
      });
      resolve();
    });
  }

  UpdateList() {
    this.LB_ITEMS.clearItems();
    this.selectedItem = undefined as any;
    this.UpdateSelected(undefined as any);
    let currentPC = PartyManager.party[0];
    if (this.slot) {
      let inv = InventoryManager.getInventory(this.slot, currentPC);
      for (let i = 0; i < inv.length; i++) {
        this.LB_ITEMS.addItem(inv[i], undefined, (control: any, type: any) => {
          this.ListItemBuilder(inv[i], control, type);
        });
      }
      TextureLoader.LoadQueue();
    }
  }

  ListItemBuilder(item: any, control: GFFStruct, type: any) {
    control.GetFieldByLabel('TEXT').GetChildStructs()[0].GetFieldByLabel('TEXT').SetValue(item.getName());
    let _ctrl2 = new GUIProtoItem(this, control, this.LB_ITEMS, this.LB_ITEMS.scale);
    _ctrl2.extent.width -= 52;
    _ctrl2.extent.left -= 46;
    _ctrl2.setList(this.LB_ITEMS);
    this.LB_ITEMS.children.push(_ctrl2);
    let idx2 = this.LB_ITEMS.itemGroup.children.length;
    let item2 = _ctrl2.createControl();
    let iconMaterial = new THREE.SpriteMaterial({
      map: null,
      color: 16777215
    });
    iconMaterial.transparent = true;
    let iconSprite = new THREE.Sprite(iconMaterial);
    TextureLoader.enQueue(item.getIcon(), iconMaterial, TextureType.TEXTURE);
    item2.userData.spriteGroup = new THREE.Group();
    item2.userData.spriteGroup.position.x = -(_ctrl2.extent.width / 2) - 52 / 2;
    item2.userData.spriteGroup.position.y += 1;
    iconSprite.scale.x = 48;
    iconSprite.scale.y = 48;
    for (let i = 0; i < 7; i++) {
      let hexMaterial = new THREE.SpriteMaterial({
        map: null,
        color: 16777215
      });
      hexMaterial.transparent = true;
      let hexSprite = new THREE.Sprite(hexMaterial);
      if (!i) {
        hexSprite.name = 'lbl_hex';
        TextureLoader.enQueue('lbl_hex', hexMaterial, TextureType.TEXTURE);
        hexSprite.visible = true;
      } else {
        hexSprite.name = 'lbl_hex_' + (i + 1);
        TextureLoader.enQueue('lbl_hex_' + (i + 1), hexMaterial, TextureType.TEXTURE);
        hexSprite.visible = false;
      }
      hexSprite.scale.x = hexSprite.scale.y = 64;
      item2.userData.spriteGroup.add(hexSprite);
    }
    item2.add(item2.userData.spriteGroup);
    item2.userData.spriteGroup.add(iconSprite);
    this.LB_ITEMS.itemGroup.add(item2);
    _ctrl2.addEventListener('click', (e: any) => {
      e.stopPropagation();
      this.UpdateSelected(item);
    });
  }

  UpdateSelected(item: ModuleItem) {
    this.selectedItem = item;
    if (this.selectedItem instanceof ModuleItem) {

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
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_IMPLANT.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_IMPLANT.getFillTextureName() != 'iimplant') {
        this.LBL_INV_IMPLANT.setFillTextureName('iimplant');
        // TextureLoader.tpcLoader.fetch('iimplant', (texture: OdysseyTexture) => {
        //   this.LBL_INV_IMPLANT.setFillTexture(texture);
        // });
      }
      let head = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.HEAD);
      if (head) {
        let icon = 'i' + head.getBaseItem().itemclass + '_' + ('000' + head.getModelVariation()).slice(-3);
        if (this.LBL_INV_HEAD.getFillTextureName() != icon) {
          this.LBL_INV_HEAD.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_HEAD.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_HEAD.getFillTextureName() != 'ihead') {
        this.LBL_INV_HEAD.setFillTextureName('ihead');
        // TextureLoader.tpcLoader.fetch('ihead', (texture: OdysseyTexture) => {
        //   this.LBL_INV_HEAD.setFillTexture(texture);
        // });
      }
      let hands = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.ARMS);
      if (hands) {
        let icon = 'i' + hands.getBaseItem().itemclass + '_' + ('000' + hands.getModelVariation()).slice(-3);
        if (this.LBL_INV_HANDS.getFillTextureName() != icon) {
          this.LBL_INV_HANDS.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_HANDS.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_HANDS.getFillTextureName() != 'ihands') {
        this.LBL_INV_HANDS.setFillTextureName('ihands');
        // TextureLoader.tpcLoader.fetch('ihands', (texture: OdysseyTexture) => {
        //   this.LBL_INV_HANDS.setFillTexture(texture);
        // });
      }
      let l_arm = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTARMBAND);
      if (l_arm) {
        let icon = 'i' + l_arm.getBaseItem().itemclass + '_' + ('000' + l_arm.getModelVariation()).slice(-3);
        if (this.LBL_INV_ARM_L.getFillTextureName() != icon) {
          this.LBL_INV_ARM_L.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_ARM_L.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_ARM_L.getFillTextureName() != 'iforearm_l') {
        this.LBL_INV_ARM_L.setFillTextureName('iforearm_l');
        // TextureLoader.tpcLoader.fetch('iforearm_l', (texture: OdysseyTexture) => {
        //   this.LBL_INV_ARM_L.setFillTexture(texture);
        // });
      }
      let armor = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.ARMOR);
      if (armor) {
        let icon = 'i' + armor.getBaseItem().itemclass + '_' + ('000' + armor.getModelVariation()).slice(-3);
        if (this.LBL_INV_BODY.getFillTextureName() != icon) {
          this.LBL_INV_BODY.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_BODY.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_BODY.getFillTextureName() != 'iarmor') {
        this.LBL_INV_BODY.setFillTextureName('iarmor');
        // TextureLoader.tpcLoader.fetch('iarmor', (texture: OdysseyTexture) => {
        //   this.LBL_INV_BODY.setFillTexture(texture);
        // });
      }
      let r_arm = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTARMBAND);
      if (r_arm) {
        let icon = 'i' + r_arm.getBaseItem().itemclass + '_' + ('000' + r_arm.getModelVariation()).slice(-3);
        if (this.LBL_INV_ARM_R.getFillTextureName() != icon) {
          this.LBL_INV_ARM_R.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_ARM_R.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_ARM_R.getFillTextureName() != 'iforearm_r') {
        this.LBL_INV_ARM_R.setFillTextureName('iforearm_r');
        // TextureLoader.tpcLoader.fetch('iforearm_r', (texture: OdysseyTexture) => {
        //   this.LBL_INV_ARM_R.setFillTexture(texture);
        // });
      }
      let l_weap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
      if (l_weap) {
        let icon = 'i' + l_weap.getBaseItem().itemclass + '_' + ('000' + l_weap.getModelVariation()).slice(-3);
        if (this.LBL_INV_WEAP_L.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_L.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_WEAP_L.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_WEAP_L.getFillTextureName() != 'iweap_l') {
        this.LBL_INV_WEAP_L.setFillTextureName('iweap_l');
        // TextureLoader.tpcLoader.fetch('iweap_l', (texture: OdysseyTexture) => {
        //   this.LBL_INV_WEAP_L.setFillTexture(texture);
        // });
      }
      let belt = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.BELT);
      if (belt) {
        let icon = 'i' + belt.getBaseItem().itemclass + '_' + ('000' + belt.getModelVariation()).slice(-3);
        if (this.LBL_INV_BELT.getFillTextureName() != icon) {
          this.LBL_INV_BELT.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_BELT.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_BELT.getFillTextureName() != 'ibelt') {
        this.LBL_INV_BELT.setFillTextureName('ibelt');
        // TextureLoader.tpcLoader.fetch('ibelt', (texture: OdysseyTexture) => {
        //   this.LBL_INV_BELT.setFillTexture(texture);
        // });
      }
      let r_weap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
      if (r_weap) {
        let icon = 'i' + r_weap.getBaseItem().itemclass + '_' + ('000' + r_weap.getModelVariation()).slice(-3);
        if (this.LBL_INV_WEAP_R.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_R.setFillTextureName(icon);
          // TextureLoader.tpcLoader.fetch(icon, (texture: OdysseyTexture) => {
          //   this.LBL_INV_WEAP_R.setFillTexture(texture);
          // });
        }
      } else if (this.LBL_INV_WEAP_R.getFillTextureName() != 'iweap_r') {
        this.LBL_INV_WEAP_R.setFillTextureName('iweap_r');
        // TextureLoader.tpcLoader.fetch('iweap_r', (texture: OdysseyTexture) => {
        //   this.LBL_INV_WEAP_R.setFillTexture(texture);
        // });
      }
    } else {
    }
  }

  Show() {
    super.Show();
    this.UpdateList();
    this['BTN_CHANGE1'].hide();
    this['BTN_CHANGE2'].hide();
    this.UpdateSlotIcons();
    for (let i = 0; i < PartyManager.party.length; i++) {
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = TwoDAManager.datatables.get('portraits')?.rows[portraitId];
      if (!i) {
        if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
          this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
          // TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
          //   this.LBL_PORTRAIT.setFillTexture(texture);
          // });
        }
      } else {
        this.getControlByName('BTN_CHANGE' + i).show();
        if (this.getControlByName('BTN_CHANGE' + i).getFillTextureName() != portrait.baseresref) {
          this.getControlByName('BTN_CHANGE' + i).setFillTextureName(portrait.baseresref);
          // TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
          //   this.getControlByName('BTN_CHANGE' + i).setFillTexture(texture);
          // });
        }
      }
    }
  }
  
}
