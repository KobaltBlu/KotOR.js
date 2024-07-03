import { ModuleCreatureArmorSlot } from "../../../enums/module/ModuleCreatureArmorSlot";
import type { GUILabel, GUIButton, GUIListBox } from "../../../gui";
import type { ModuleItem } from "../../../module";
import { MenuEquipment as K1_MenuEquipment } from "../../kotor/KOTOR";
import { GUIItemEquipped } from "../../../gui/protoitem/GUIItemEquipped";
import { GUIItemNone } from "../../../gui/protoitem/GUIItemNone";
import { GameState } from "../../../GameState";
import { GUIInventoryItem } from "../gui/GUIInventoryItem";

/**
 * MenuEquipment class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuEquipment.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.defaultControl = this.BTN_INV_BODY;

      // this.LB_ITEMS.offset.x = 0;
      
      this.LB_DESC.hide();
      this.LBL_CANTEQUIP.hide();

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.equipmentSelectionActive){
          this.slot = null;
          this.equipmentSelectionActive = false;
          this.UpdateList();
        }else{
          this.close();
        }
      });
      this._button_b = this.BTN_BACK;

      this.BTN_INV_IMPLANT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.IMPLANT;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.IMPLANT);
      });

      this.BTN_INV_HEAD.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.HEAD;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.HEAD);
      });

      this.BTN_INV_HANDS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.ARMS;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.ARMS);
      });

      this.BTN_INV_ARM_L.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.LEFTARMBAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.LEFTARMBAND);
      });

      this.BTN_INV_BODY.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.ARMOR;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.ARMOR);
      });

      this.BTN_INV_ARM_R.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.RIGHTARMBAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.RIGHTARMBAND);
      });

      this.BTN_INV_WEAP_L.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.LEFTHAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.LEFTHAND);
      });

      this.BTN_INV_BELT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.BELT;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.BELT);
      });

      this.BTN_INV_WEAP_R.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.RIGHTHAND;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.RIGHTHAND);
      });

      this.BTN_INV_WEAP_L2.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.LEFTHAND2;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.LEFTHAND2);
      });

      this.BTN_INV_WEAP_R2.addEventListener('click', (e) => {
        e.stopPropagation();
        this.slot = ModuleCreatureArmorSlot.RIGHTHAND2;
        this.equipmentSelectionActive = true;
        this.UpdateList();
      }).addEventListener('hover', (e) => {
        this.UpdateListHover(ModuleCreatureArmorSlot.RIGHTHAND2);
      });

      this.BTN_EQUIP.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selectedItem){
          //console.log('selectedItem', this.selectedItem, this.slot, );
          let currentPC = GameState.PartyManager.party[0];
          currentPC.equipItem(this.slot, this.selectedItem, () => {
            this.UpdateSlotIcons();
          });
          this.slot = null as any;
          this.equipmentSelectionActive = false;
          this.UpdateSelected(undefined as any);
          this.UpdateSlotIcons();
        }
      });

      this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
      this.LB_ITEMS.padding = 2;
      this.LB_ITEMS.onSelected = (item: ModuleItem|GUIItemEquipped|GUIItemNone) => {
        this.UpdateSelected(item);
      }

      this.BTN_SWAPWEAPONS.addEventListener('click', (e) => {
        let currentPC = GameState.PartyManager.party[0];
        if(currentPC){
          const right_1 = currentPC.equipment.RIGHTHAND;
          const right_2 = currentPC.equipment.RIGHTHAND2;
          currentPC.equipment.RIGHTHAND = undefined;
          currentPC.equipment.RIGHTHAND2 = undefined;

          if(right_1) right_1.destroy();

          if(right_1) currentPC.equipItem(ModuleCreatureArmorSlot.RIGHTHAND2, right_1, () => { this.UpdateSlotIcons(true); });
          if(right_2) currentPC.equipItem(ModuleCreatureArmorSlot.RIGHTHAND,  right_2, () => { this.UpdateSlotIcons(true); });

          const left_1 = currentPC.equipment.LEFTHAND;
          const left_2 = currentPC.equipment.LEFTHAND2;
          currentPC.equipment.LEFTHAND = undefined;
          currentPC.equipment.LEFTHAND2 = undefined;

          if(left_1) left_1.destroy();

          if(left_1) currentPC.equipItem(ModuleCreatureArmorSlot.LEFTHAND2, left_1, () => { this.UpdateSlotIcons(true); });
          if(left_2) currentPC.equipItem(ModuleCreatureArmorSlot.LEFTHAND,  left_2, () => { this.UpdateSlotIcons(true); });
          this.UpdateSlotIcons(true);
        }
      });

      resolve();
    });
  }

  UpdateList() {
    super.UpdateList();
    if (!this.equipmentSelectionActive) {
      this.LBL_BACK1.show();
      this.LBL_ATKL.show();
      this.LBL_ATKR.show();
      this.LBL_ATTACKMOD.show();

      this.LBL_DEF_TEXT.show();
      this.LBL_DEF_BACK.show();
      this.LBL_DEF.show();

      this.LBL_DAMTEXT.show();
      this.LBL_DAMAGE.show();

      this.LBL_TOHIT.show();
      this.LBL_TOHITL.show();
      this.LBL_TOHITR.show();

      this.LBL_INV_WEAP_L2.show();
      this.LBL_INV_WEAP_R2.show();
      this.BTN_INV_WEAP_L2.show();
      this.BTN_INV_WEAP_R2.show();
      this.BTN_SWAPWEAPONS.show();
    }else{
      this.LBL_BACK1.hide();
      this.LBL_ATKL.hide();
      this.LBL_ATKR.hide();
      this.LBL_ATTACKMOD.hide();

      this.LBL_DEF_TEXT.hide();
      this.LBL_DEF_BACK.hide();
      this.LBL_DEF.hide();

      this.LBL_DAMTEXT.hide();
      this.LBL_DAMAGE.hide();

      this.LBL_TOHIT.hide();
      this.LBL_TOHITL.hide();
      this.LBL_TOHITR.hide();
      
      this.LBL_INV_WEAP_L2.hide();
      this.LBL_INV_WEAP_R2.hide();
      this.BTN_INV_WEAP_L2.hide();
      this.BTN_INV_WEAP_R2.hide();
      this.BTN_SWAPWEAPONS.hide();
    }
  }

  UpdateSlotIcons(force: boolean = false) {
    super.UpdateSlotIcons(force);
    let currentPC = GameState.PartyManager.party[0];
    if (currentPC.getRace() == 6) {
      let l_weap2 = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND2);
      if (l_weap2) {
        let icon = 'i' + l_weap2.baseItem.itemClass + '_' + ('000' + l_weap2.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_WEAP_L2.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_L2.setFillTextureName(icon);

        }
      } else if (force || this.LBL_INV_WEAP_L2.getFillTextureName() != 'iweap_l') {
        this.LBL_INV_WEAP_L2.setFillTextureName('iweap_l');
      }
      let r_weap2 = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
      if (r_weap2) {
        let icon = 'i' + r_weap2.baseItem.itemClass + '_' + ('000' + r_weap2.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_WEAP_R2.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_R2.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_WEAP_R2.getFillTextureName() != 'iweap_r') {
        this.LBL_INV_WEAP_R2.setFillTextureName('iweap_r');
      }
    }
  }

  show() {
    super.show();
    this.LBL_BACK1.widget.position.z = 0;
    this.UpdateSlotIcons();
  }
  
}
