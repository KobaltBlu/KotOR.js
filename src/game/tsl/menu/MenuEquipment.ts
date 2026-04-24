import { ModuleCreatureArmorSlot } from '@/enums/module/ModuleCreatureArmorSlot';
import type { GUILabel, GUIButton, GUIListBox } from '@/gui';
import { ModuleCreature, ModuleItem } from '@/module';
import { MenuEquipment as K1_MenuEquipment } from '@/game/kotor/KOTOR';
import { GUIItemEquipped } from '@/gui/protoitem/GUIItemEquipped';
import { GUIItemNone } from '@/gui/protoitem/GUIItemNone';
import { GameState } from '@/GameState';
import { GUIInventoryItem } from '@/game/tsl/gui/GUIInventoryItem';

const STR_SLOT_DISABLED = 125554; //You cannot equip or remove an item from this slot.

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

  currentNPCIndex: number = 0;

  constructor() {
    super();
    this.gui_resref = 'equip_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if (skipInit) return;

    this.childMenu = this.manager.MenuTop;

    return new Promise<void>((resolve, reject) => {
      this.defaultControl = this.BTN_INV_BODY;

      // alphaTest on all 11 slot icon labels so transparent icon textures render correctly
      this.LBL_INV_IMPLANT.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_IMPLANT.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_HEAD.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_HEAD.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_HANDS.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_HANDS.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_ARM_L.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_ARM_L.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_BODY.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_BODY.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_ARM_R.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_ARM_R.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_L.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_L.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_BELT.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_BELT.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_R.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_R.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_L2.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_L2.highlight.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_R2.border.fill.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_R2.highlight.fill.material.alphaTest = 0.5;

      this.LB_DESC.hide();
      this.LBL_CANTEQUIP.hide();

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.equipmentSelectionActive) {
          this.slot = null;
          this.equipmentSelectionActive = false;
          this.updateList();
        } else {
          this.close();
        }
      });
      this._button_b = this.BTN_BACK;

      this.BTN_INV_IMPLANT.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.IMPLANT)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.IMPLANT;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.IMPLANT);
      });

      this.BTN_INV_HEAD.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.HEAD)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.HEAD;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.HEAD);
      });

      this.BTN_INV_HANDS.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.ARMS)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.ARMS;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.ARMS);
      });

      this.BTN_INV_ARM_L.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.LEFTARMBAND)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.LEFTARMBAND;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.LEFTARMBAND);
      });

      this.BTN_INV_BODY.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.ARMOR)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.ARMOR;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.ARMOR);
      });

      this.BTN_INV_ARM_R.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.RIGHTARMBAND)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.RIGHTARMBAND;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.RIGHTARMBAND);
      });

      this.BTN_INV_WEAP_L.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.LEFTHAND)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.LEFTHAND;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.LEFTHAND);
      });

      this.BTN_INV_BELT.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.BELT)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.BELT;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.BELT);
      });

      this.BTN_INV_WEAP_R.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.RIGHTHAND)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.RIGHTHAND;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.RIGHTHAND);
      });

      this.BTN_INV_WEAP_L2.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.LEFTHAND2)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.LEFTHAND2;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.LEFTHAND2);
      });

      this.BTN_INV_WEAP_R2.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSlotLocked(ModuleCreatureArmorSlot.RIGHTHAND2)) {
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
          return;
        }
        this.slot = ModuleCreatureArmorSlot.RIGHTHAND2;
        this.equipmentSelectionActive = true;
        this.updateList();
      }).addEventListener('hover', (e) => {
        this.updateListHover(ModuleCreatureArmorSlot.RIGHTHAND2);
      });

      this.BTN_EQUIP.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedItem instanceof ModuleItem || this.selectedItem instanceof GUIItemNone) {
          const currentPC = GameState.PartyManager.party[this.currentNPCIndex];
          if (this.selectedItem instanceof GUIItemNone) {
            currentPC.unequipSlot(this.slot);
          } else {
            currentPC.equipItem(this.slot, this.selectedItem).then(() => {
              this.updateSlotIcons();
            });
          }
          this.slot = null;
          this.equipmentSelectionActive = false;
          this.updateSelected(undefined as any);
          this.updateSlotIcons();
          this.updateList();
        }
      });

      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      this.LB_ITEMS.padding = 2;
      this.LB_ITEMS.onSelected = (item: ModuleItem | GUIItemEquipped | GUIItemNone) => {
        this.updateSelected(item);
      };

      this.BTN_PREVNPC.addEventListener('click', (e) => {
        e.stopPropagation();
        if (GameState.PartyManager.party.length > 1) {
          GameState.PartyManager.SwitchLeaderAtIndex(GameState.PartyManager.party.length - 1);
        }
      });

      this.BTN_NEXTNPC.addEventListener('click', (e) => {
        e.stopPropagation();
        if (GameState.PartyManager.party.length > 1) {
          GameState.PartyManager.SwitchLeaderAtIndex(1);
        }
      });

      this.BTN_SWAPWEAPONS.addEventListener('click', (e) => {
        const currentPC = GameState.PartyManager.party[this.currentNPCIndex];
        if (currentPC) {
          const right_1 = currentPC.equipment.RIGHTHAND;
          const right_2 = currentPC.equipment.RIGHTHAND2;
          currentPC.equipment.RIGHTHAND = undefined;
          currentPC.equipment.RIGHTHAND2 = undefined;

          if (right_1) right_1.destroy();

          if (right_1)
            currentPC.equipItem(ModuleCreatureArmorSlot.RIGHTHAND2, right_1).then(() => {
              this.updateSlotIcons(true);
            });
          if (right_2)
            currentPC.equipItem(ModuleCreatureArmorSlot.RIGHTHAND, right_2).then(() => {
              this.updateSlotIcons(true);
            });

          const left_1 = currentPC.equipment.LEFTHAND;
          const left_2 = currentPC.equipment.LEFTHAND2;
          currentPC.equipment.LEFTHAND = undefined;
          currentPC.equipment.LEFTHAND2 = undefined;

          if (left_1) left_1.destroy();

          if (left_1)
            currentPC.equipItem(ModuleCreatureArmorSlot.LEFTHAND2, left_1).then(() => {
              this.updateSlotIcons(true);
            });
          if (left_2)
            currentPC.equipItem(ModuleCreatureArmorSlot.LEFTHAND, left_2).then(() => {
              this.updateSlotIcons(true);
            });
          this.updateSlotIcons(true);
        }
      });

      GameState.PartyManager.AddEventListener('change', (pm: ModuleCreature) => {
        if (!this.isVisible()) return;
        this.updateCharacterStats();
      });

      resolve();
    });
  }

  updateList() {
    super.updateList();
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
      this.updateSlotLock();
    } else {
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

  updateSlotIcons(force: boolean = false) {
    const currentPC = GameState.PartyManager.party[this.currentNPCIndex];
    if (!currentPC) return;

    if (currentPC.getRace() == 6) {
      let implant = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.IMPLANT);
      if (implant) {
        let icon = 'i' + implant.baseItem.itemClass + '_' + ('000' + implant.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_IMPLANT.getFillTextureName() != icon) {
          this.LBL_INV_IMPLANT.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_IMPLANT.getFillTextureName() != 'iimplant') {
        this.LBL_INV_IMPLANT.setFillTextureName('iimplant');
      }

      let head = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.HEAD);
      if (head) {
        let icon = 'i' + head.baseItem.itemClass + '_' + ('000' + head.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_HEAD.getFillTextureName() != icon) {
          this.LBL_INV_HEAD.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_HEAD.getFillTextureName() != 'ihead') {
        this.LBL_INV_HEAD.setFillTextureName('ihead');
      }

      let hands = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.ARMS);
      if (hands) {
        let icon = 'i' + hands.baseItem.itemClass + '_' + ('000' + hands.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_HANDS.getFillTextureName() != icon) {
          this.LBL_INV_HANDS.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_HANDS.getFillTextureName() != 'ihands') {
        this.LBL_INV_HANDS.setFillTextureName('ihands');
      }

      let l_arm = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTARMBAND);
      if (l_arm) {
        let icon = 'i' + l_arm.baseItem.itemClass + '_' + ('000' + l_arm.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_ARM_L.getFillTextureName() != icon) {
          this.LBL_INV_ARM_L.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_ARM_L.getFillTextureName() != 'iforearm_l') {
        this.LBL_INV_ARM_L.setFillTextureName('iforearm_l');
      }

      let armor = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.ARMOR);
      if (armor) {
        let icon = 'i' + armor.baseItem.itemClass + '_' + ('000' + armor.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_BODY.getFillTextureName() != icon) {
          this.LBL_INV_BODY.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_BODY.getFillTextureName() != 'iarmor') {
        this.LBL_INV_BODY.setFillTextureName('iarmor');
      }

      let r_arm = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTARMBAND);
      if (r_arm) {
        let icon = 'i' + r_arm.baseItem.itemClass + '_' + ('000' + r_arm.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_ARM_R.getFillTextureName() != icon) {
          this.LBL_INV_ARM_R.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_ARM_R.getFillTextureName() != 'iforearm_r') {
        this.LBL_INV_ARM_R.setFillTextureName('iforearm_r');
      }

      let l_weap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
      if (l_weap) {
        let icon = 'i' + l_weap.baseItem.itemClass + '_' + ('000' + l_weap.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_WEAP_L.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_L.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_WEAP_L.getFillTextureName() != 'iweap_l') {
        this.LBL_INV_WEAP_L.setFillTextureName('iweap_l');
      }

      let belt = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.BELT);
      if (belt) {
        let icon = 'i' + belt.baseItem.itemClass + '_' + ('000' + belt.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_BELT.getFillTextureName() != icon) {
          this.LBL_INV_BELT.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_BELT.getFillTextureName() != 'ibelt') {
        this.LBL_INV_BELT.setFillTextureName('ibelt');
      }

      let r_weap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
      if (r_weap) {
        let icon = 'i' + r_weap.baseItem.itemClass + '_' + ('000' + r_weap.getModelVariation()).slice(-3);
        if (force || this.LBL_INV_WEAP_R.getFillTextureName() != icon) {
          this.LBL_INV_WEAP_R.setFillTextureName(icon);
        }
      } else if (force || this.LBL_INV_WEAP_R.getFillTextureName() != 'iweap_r') {
        this.LBL_INV_WEAP_R.setFillTextureName('iweap_r');
      }

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

  updateCharacterStats() {
    this.selectedControl = this.defaultControl;
    this.equipmentSelectionActive = false;
    const currentPC = GameState.PartyManager.party[this.currentNPCIndex];
    if (!currentPC) return;

    this.LB_DESC?.clearItems();
    this.LB_ITEMS?.clearItems();

    this.LBL_TITLE?.setText(currentPC.getName());
    this.LBL_DEF?.setText(String(currentPC.getAC()));

    const rWeap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    const lWeap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
    const bab = currentPC.getBaseAttackBonus();
    const babStr = bab >= 0 ? `+${bab}` : String(bab);

    this.LBL_TOHITR?.setText(rWeap ? babStr : '-');
    this.LBL_TOHITL?.setText(lWeap ? babStr : '-');
    this.LBL_ATTACKMOD?.setText(babStr);
    this.LBL_DAMAGE?.setText(
      rWeap && rWeap.baseItem?.numDice ? `${rWeap.baseItem.numDice}d${rWeap.baseItem.die}` : '-'
    );

    this.updateSlotIcons(true);
    this.updateList();
  }

  private isSlotLocked(slot: ModuleCreatureArmorSlot): boolean {
    const npc = GameState.PartyManager.party[this.currentNPCIndex];
    if (!npc) return false;
    const locked = npc.creatureAppearance?.equipslotslocked ?? 0;
    if (locked === -1) return false;
    return (locked & slot) !== 0;
  }

  private updateSlotLock() {
    const slots: [GUIButton, GUILabel, ModuleCreatureArmorSlot][] = [
      [this.BTN_INV_IMPLANT, this.LBL_INV_IMPLANT, ModuleCreatureArmorSlot.IMPLANT],
      [this.BTN_INV_HEAD, this.LBL_INV_HEAD, ModuleCreatureArmorSlot.HEAD],
      [this.BTN_INV_HANDS, this.LBL_INV_HANDS, ModuleCreatureArmorSlot.ARMS],
      [this.BTN_INV_ARM_L, this.LBL_INV_ARM_L, ModuleCreatureArmorSlot.LEFTARMBAND],
      [this.BTN_INV_BODY, this.LBL_INV_BODY, ModuleCreatureArmorSlot.ARMOR],
      [this.BTN_INV_ARM_R, this.LBL_INV_ARM_R, ModuleCreatureArmorSlot.RIGHTARMBAND],
      [this.BTN_INV_WEAP_L, this.LBL_INV_WEAP_L, ModuleCreatureArmorSlot.LEFTHAND],
      [this.BTN_INV_BELT, this.LBL_INV_BELT, ModuleCreatureArmorSlot.BELT],
      [this.BTN_INV_WEAP_R, this.LBL_INV_WEAP_R, ModuleCreatureArmorSlot.RIGHTHAND],
      [this.BTN_INV_WEAP_L2, this.LBL_INV_WEAP_L2, ModuleCreatureArmorSlot.LEFTHAND2],
      [this.BTN_INV_WEAP_R2, this.LBL_INV_WEAP_R2, ModuleCreatureArmorSlot.RIGHTHAND2],
    ];

    for (const [btn, lbl, slot] of slots) {
      if (this.isSlotLocked(slot)) {
        btn.setBorderColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
        btn.setHighlightColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
        lbl.setBorderColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
        lbl.setHighlightColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
      } else {
        btn.setBorderColor(btn.defaultColor.r, btn.defaultColor.g, btn.defaultColor.b);
        btn.setHighlightColor(btn.defaultHighlightColor.r, btn.defaultHighlightColor.g, btn.defaultHighlightColor.b);
        lbl.setBorderColor(btn.defaultColor.r, btn.defaultColor.g, btn.defaultColor.b);
        lbl.setHighlightColor(btn.defaultHighlightColor.r, btn.defaultHighlightColor.g, btn.defaultHighlightColor.b);
      }
    }
  }

  show() {
    this.currentNPCIndex = 0;
    super.show();
    this.LBL_BACK1.widget.position.z = 0;
  }

  triggerControllerAPress() {
    if (this.equipmentSelectionActive) {
      if (this.selectedControl) {
        this.selectedControl.click();
      }
    } else {
      this.BTN_EQUIP.click();
    }
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_OPT.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_INV.click();
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
      this.BTN_INV_WEAP_L2.onHoverOut();
      this.BTN_INV_WEAP_R2.onHoverOut();
      if (this.selectedControl == this.BTN_INV_IMPLANT) {
        // top row — no move
      } else if (this.selectedControl == this.BTN_INV_HEAD) {
        // top row — no move
      } else if (this.selectedControl == this.BTN_INV_HANDS) {
        // top row — no move
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
      } else if (this.selectedControl == this.BTN_INV_WEAP_L2) {
        this.selectedControl = this.BTN_INV_WEAP_L;
      } else if (this.selectedControl == this.BTN_INV_WEAP_R2) {
        this.selectedControl = this.BTN_INV_WEAP_R;
      }
      if (this.selectedControl) {
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
      this.BTN_INV_WEAP_L2.onHoverOut();
      this.BTN_INV_WEAP_R2.onHoverOut();
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
        this.selectedControl = this.BTN_INV_WEAP_L2;
      } else if (this.selectedControl == this.BTN_INV_BELT) {
        // bottom center — no move
      } else if (this.selectedControl == this.BTN_INV_WEAP_R) {
        this.selectedControl = this.BTN_INV_WEAP_R2;
      } else if (this.selectedControl == this.BTN_INV_WEAP_L2) {
        // bottom row — no move
      } else if (this.selectedControl == this.BTN_INV_WEAP_R2) {
        // bottom row — no move
      }
      if (this.selectedControl) {
        this.selectedControl.onHoverIn();
      }
    }
  }

  triggerControllerDLeftPress() {
    if (this.equipmentSelectionActive) {
      // no action in item list
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
      this.BTN_INV_WEAP_L2.onHoverOut();
      this.BTN_INV_WEAP_R2.onHoverOut();
      if (this.selectedControl == this.BTN_INV_IMPLANT) {
        // left column — no move
      } else if (this.selectedControl == this.BTN_INV_HEAD) {
        this.selectedControl = this.BTN_INV_IMPLANT;
      } else if (this.selectedControl == this.BTN_INV_HANDS) {
        this.selectedControl = this.BTN_INV_HEAD;
      } else if (this.selectedControl == this.BTN_INV_ARM_L) {
        // left column — no move
      } else if (this.selectedControl == this.BTN_INV_BODY) {
        this.selectedControl = this.BTN_INV_ARM_L;
      } else if (this.selectedControl == this.BTN_INV_ARM_R) {
        this.selectedControl = this.BTN_INV_BODY;
      } else if (this.selectedControl == this.BTN_INV_WEAP_L) {
        // left column — no move
      } else if (this.selectedControl == this.BTN_INV_BELT) {
        this.selectedControl = this.BTN_INV_WEAP_L;
      } else if (this.selectedControl == this.BTN_INV_WEAP_R) {
        this.selectedControl = this.BTN_INV_BELT;
      } else if (this.selectedControl == this.BTN_INV_WEAP_L2) {
        // left column — no move
      } else if (this.selectedControl == this.BTN_INV_WEAP_R2) {
        this.selectedControl = this.BTN_INV_WEAP_L2;
      }
      if (this.selectedControl) {
        this.selectedControl.onHoverIn();
      }
    }
  }

  triggerControllerDRightPress() {
    if (this.equipmentSelectionActive) {
      // no action in item list
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
      this.BTN_INV_WEAP_L2.onHoverOut();
      this.BTN_INV_WEAP_R2.onHoverOut();
      if (this.selectedControl == this.BTN_INV_IMPLANT) {
        this.selectedControl = this.BTN_INV_HEAD;
      } else if (this.selectedControl == this.BTN_INV_HEAD) {
        this.selectedControl = this.BTN_INV_HANDS;
      } else if (this.selectedControl == this.BTN_INV_HANDS) {
        // right column — no move
      } else if (this.selectedControl == this.BTN_INV_ARM_L) {
        this.selectedControl = this.BTN_INV_BODY;
      } else if (this.selectedControl == this.BTN_INV_BODY) {
        this.selectedControl = this.BTN_INV_ARM_R;
      } else if (this.selectedControl == this.BTN_INV_ARM_R) {
        // right column — no move
      } else if (this.selectedControl == this.BTN_INV_WEAP_L) {
        this.selectedControl = this.BTN_INV_BELT;
      } else if (this.selectedControl == this.BTN_INV_BELT) {
        this.selectedControl = this.BTN_INV_WEAP_R;
      } else if (this.selectedControl == this.BTN_INV_WEAP_R) {
        // right column — no move
      } else if (this.selectedControl == this.BTN_INV_WEAP_L2) {
        this.selectedControl = this.BTN_INV_WEAP_R2;
      } else if (this.selectedControl == this.BTN_INV_WEAP_R2) {
        // right column — no move
      }
      if (this.selectedControl) {
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
