import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUIControl } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { GUIItemEquipped } from "../../../gui/protoitem/GUIItemEquipped";
import { GUIInventoryItem } from "../../../gui/protoitem/GUIInventoryItem";
import { GUIItemNone } from "../../../gui/protoitem/GUIItemNone";
import { ModuleCreatureArmorSlot } from "../../../enums/module/ModuleCreatureArmorSlot";
import { ModuleItem } from "../../../module";

/**
 * MenuEquipment class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuEquipment.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      this.defaultControl = this.BTN_INV_BODY;

      // this.LB_ITEMS.offset.x = 0;
      
      this.LB_DESC.hide();
      this.LBL_CANTEQUIP.hide();

      this.BTN_BACK = this.getControlByName('BTN_BACK');
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

      this.BTN_EQUIP.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selectedItem instanceof ModuleItem){
          //console.log('selectedItem', this.selectedItem, this.slot, );
          let currentPC = GameState.PartyManager.party[0];
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

      this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
      this.LB_ITEMS.onSelected = (item: ModuleItem|GUIItemEquipped|GUIItemNone) => {
        this.UpdateSelected(item);
      }
      resolve();
    });
  }

  UpdateListHover(slot: number) {
    if (slot) {
      this.LB_ITEMS.clearItems();
      let inv = GameState.InventoryManager.getInventory(slot, GameState.getCurrentPlayer());
      let currentPC = GameState.PartyManager.party[0];
      this.LB_ITEMS.addItem(new GUIItemNone());
      if(currentPC.GetItemInSlot(slot)){
        this.LB_ITEMS.addItem(new GUIItemEquipped(currentPC.GetItemInSlot(slot)));
      }
      this.LB_ITEMS.select(this.LB_ITEMS.children[this.LB_ITEMS.children.length-1]);
      for (let i = 0; i < inv.length; i++) {
        this.LB_ITEMS.addItem(inv[i]);
        TextureLoader.LoadQueue();
      }
    }
  }

  UpdateList() {
    if (!this.equipmentSelectionActive) {
      this.BTN_EQUIP?.hide();
      this.BTN_BACK?.setText(GameState.TLKManager.GetStringById(1582).Value);
      this.LB_DESC?.hide();
      this.BTN_INV_IMPLANT?.show();
      this.BTN_INV_HEAD?.show();
      this.BTN_INV_HANDS?.show();
      this.BTN_INV_ARM_L?.show();
      this.BTN_INV_BODY?.show();
      this.BTN_INV_ARM_R?.show();
      this.BTN_INV_WEAP_L?.show();
      this.BTN_INV_BELT?.show();
      this.BTN_INV_WEAP_R?.show();
      this.LBL_INV_IMPLANT?.show();
      this.LBL_INV_HEAD?.show();
      this.LBL_INV_HANDS?.show();
      this.LBL_INV_ARM_L?.show();
      this.LBL_INV_BODY?.show();
      this.LBL_INV_ARM_R?.show();
      this.LBL_INV_WEAP_L?.show();
      this.LBL_INV_BELT?.show();
      this.LBL_INV_WEAP_R?.show();
      this.LBL_PORTRAIT?.show();
      this.LBL_PORT_BORD?.show();
      this.LBL_SLOTNAME?.show();
      this.LBL_TXTBAR?.show();
      this.LBL_SELECTTITLE?.setText('');
    } else {
      this.BTN_EQUIP?.show();
      this.BTN_EQUIP?.setText(GameState.TLKManager.GetStringById(31387).Value);
      this.BTN_BACK?.setText(GameState.TLKManager.GetStringById(1581).Value);
      this.LB_DESC?.show();
      this.BTN_INV_IMPLANT?.hide();
      this.BTN_INV_HEAD?.hide();
      this.BTN_INV_HANDS?.hide();
      this.BTN_INV_ARM_L?.hide();
      this.BTN_INV_BODY?.hide();
      this.BTN_INV_ARM_R?.hide();
      this.BTN_INV_WEAP_L?.hide();
      this.BTN_INV_BELT?.hide();
      this.BTN_INV_WEAP_R?.hide();
      this.LBL_INV_IMPLANT?.hide();
      this.LBL_INV_HEAD?.hide();
      this.LBL_INV_HANDS?.hide();
      this.LBL_INV_ARM_L?.hide();
      this.LBL_INV_BODY?.hide();
      this.LBL_INV_ARM_R?.hide();
      this.LBL_INV_WEAP_L?.hide();
      this.LBL_INV_BELT?.hide();
      this.LBL_INV_WEAP_R?.hide();
      this.LBL_PORTRAIT?.hide();
      this.LBL_PORT_BORD?.hide();
      this.LBL_SLOTNAME?.hide();
      this.LBL_TXTBAR?.hide();
      this.LBL_SELECTTITLE?.setText('');
    }
    this.LB_ITEMS.clearItems();
    this.selectedItem = null;
    this.UpdateSelected(null);
    let currentPC = GameState.PartyManager.party[0];
    if (this.slot) {
      let inv = GameState.InventoryManager.getInventory(this.slot, currentPC);
      this.LB_ITEMS.addItem(new GUIItemNone());
      if(currentPC.GetItemInSlot(this.slot)){
        this.LB_ITEMS.addItem(new GUIItemEquipped(currentPC.GetItemInSlot(this.slot)))
      }
      this.LB_ITEMS.select(this.LB_ITEMS.children[this.LB_ITEMS.children.length-1]);
      for (let i = 0; i < inv.length; i++) {
        this.LB_ITEMS.addItem(inv[i]);
        TextureLoader.LoadQueue();
      }
    }
  }

  UpdateSelected(item: ModuleItem|GUIItemEquipped|GUIItemNone) {
    this.LB_DESC.clearItems();
    this.selectedItem = undefined;
    if (item instanceof ModuleItem) {
      this.selectedItem = item;
      this.LB_DESC.addItem(this.selectedItem.getDescription());
    } else if(item instanceof GUIItemEquipped) {
      this.LB_DESC.addItem(item.node.getDescription());
    }
  }

  UpdateSlotIcons(force: boolean = false) {
    let currentPC = GameState.PartyManager.party[0];
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
    } else {

    }
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_EQU.onHoverIn();
    this.equipmentSelectionActive = false;
    this.selectedControl = this.defaultControl;
    this.UpdateList();
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    this.UpdateSlotIcons(true);
    let currentPC = GameState.PartyManager.party[0];
    if (currentPC) {
      this.LBL_VITALITY?.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
      this.LBL_DEF?.setText(currentPC.getAC());
    }
    let btn_change: GUIControl;
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      btn_change = this.getControlByName('BTN_CHANGE' + i);
      if(btn_change){
        let partyMember = GameState.PartyManager.party[i];
        let portraitId = partyMember.getPortraitId();
        let portrait = GameState.TwoDAManager.datatables.get('portraits').rows[portraitId];
        if (!i) {
          if (this.LBL_PORTRAIT.getFillTextureName() != portrait.baseresref) {
            this.LBL_PORTRAIT.setFillTextureName(portrait.baseresref);
          }
        } else {
          btn_change.show();
          if (btn_change.getFillTextureName() != portrait.baseresref) {
            btn_change.setFillTextureName(portrait.baseresref);
          }
        }
      }
    }
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
      if (this.selectedControl) {
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
      if (this.selectedControl) {
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
