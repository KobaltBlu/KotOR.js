import type { PadControlGlyph } from "@engine/gui/GameMenu";
import { GameState } from "@engine/runtime/GameState";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton, GUIControl } from "@engine/gui";
import { GUIItemEquipped } from "@engine/gui/protoitem/GUIItemEquipped";
import { GUIInventoryItem } from "@engine/gui/protoitem/GUIInventoryItem";
import { GUIItemNone } from "@engine/gui/protoitem/GUIItemNone";
import { ModuleCreatureArmorSlot } from "@core/enums/module/ModuleCreatureArmorSlot";
import { Item } from "@engine/module/Item";
import type { Creature } from "@engine/module/Creature";
import {
  EQUIP_COLOR_BLUE,
  EQUIP_COLOR_GREEN,
  STR_BACK,
  STR_CANCEL,
  STR_CANT_EQUIP,
  STR_EQUIP,
  STR_NOTHING_AVAILABLE,
  STR_OFFHAND_BLOCKED,
  STR_SELECT_TITLE,
  STR_WEAPON_CONFLICT,
  formatAttackBonus,
  formatDamageRange,
  getEmptySlotIcon,
  getEquipScreenAttackBonus,
  getEquipScreenDamageRange,
  getItemEquipCanUse,
  getMainWeaponForOffHandSlot,
  getOffHandSlotForMain,
  getOffWeaponForMainHandSlot,
  getSlotNameStrRef,
  isLargeWeapon,
  isMainHandSlot,
  isOffHandSlot,
  isTwoHandedWeapon,
} from "@engine/games/equipment-menu-utils";

type EquipListNode = Item | GUIItemEquipped | GUIItemNone;

type EquipCanUseNode = EquipListNode & { equipCanUse?: number };

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
  slot: ModuleCreatureArmorSlot = null;
  equipmentSelectionActive: boolean = false;
  selectedItem: EquipListNode = undefined;

  /** Snapshot of the item in `slot` when selection mode began (previously_equipped). */
  previouslyEquipped: Item = undefined;
  /** Off-hand item removed when previewing a LARGE main-hand weapon. */
  previouslyEquippedOffHand: Item = undefined;
  /** Slot for previouslyEquippedOffHand (LEFTHAND / LEFTHAND2). */
  previouslyEquippedOffHandSlot: ModuleCreatureArmorSlot = null;
  /** True while a preview change is outstanding (revert on Back). */
  previewActive: boolean = false;
  /** Suppress recursive preview while rebuilding the list selection. */
  private _suppressPreview: boolean = false;

  constructor(){
    super();
    this.gui_resref = 'equip';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  protected getActiveCreature(): Creature {
    return GameState.PartyManager.party[0];
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve) => {
      this.defaultControl = this.BTN_INV_BODY;

      this.LB_DESC.hide();
      this.LBL_CANTEQUIP.hide();

      this.LBL_INV_IMPLANT.chrome.material.alphaTest = 0.5;
      this.LBL_INV_HEAD.chrome.material.alphaTest = 0.5;
      this.LBL_INV_HANDS.chrome.material.alphaTest = 0.5;
      this.LBL_INV_ARM_L.chrome.material.alphaTest = 0.5;
      this.LBL_INV_BODY.chrome.material.alphaTest = 0.5;
      this.LBL_INV_ARM_R.chrome.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_L.chrome.material.alphaTest = 0.5;
      this.LBL_INV_BELT.chrome.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_R.chrome.material.alphaTest = 0.5;

      this.BTN_BACK = this.getControlByName('BTN_BACK');
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.equipmentSelectionActive){
          this.cancelEquipmentSelection();
        }else{
          this.close();
        }
      });
      this._button_b = this.BTN_BACK;

      this.bindSlotButton(this.BTN_INV_IMPLANT, ModuleCreatureArmorSlot.IMPLANT);
      this.bindSlotButton(this.BTN_INV_HEAD, ModuleCreatureArmorSlot.HEAD);
      this.bindSlotButton(this.BTN_INV_HANDS, ModuleCreatureArmorSlot.ARMS);
      this.bindSlotButton(this.BTN_INV_ARM_L, ModuleCreatureArmorSlot.LEFTARMBAND);
      this.bindSlotButton(this.BTN_INV_BODY, ModuleCreatureArmorSlot.ARMOR);
      this.bindSlotButton(this.BTN_INV_ARM_R, ModuleCreatureArmorSlot.RIGHTARMBAND);
      this.bindSlotButton(this.BTN_INV_WEAP_L, ModuleCreatureArmorSlot.LEFTHAND);
      this.bindSlotButton(this.BTN_INV_BELT, ModuleCreatureArmorSlot.BELT);
      this.bindSlotButton(this.BTN_INV_WEAP_R, ModuleCreatureArmorSlot.RIGHTHAND);

      this.BTN_EQUIP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.commitEquipmentSelection();
      });

      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      // leaves GFF PADDING (equip.gui LB_ITEMS = 0); do not force 5.
      this.LB_ITEMS.onSelected = (item: EquipListNode) => {
        this.updateSelected(item);
      };

      this.BTN_CHANGE1.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 0){
          GameState.PartyManager.SwitchLeaderAtIndex(1);
        }
      });
      this.BTN_CHANGE2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 1){
          GameState.PartyManager.SwitchLeaderAtIndex(2);
        }
      });

      GameState.PartyManager.AddEventListener('change', () => {
        if(!this.isVisible()) return;
        this.updateCharacterStats();
      });
      resolve();
    });
  }

  protected bindSlotButton(btn: GUIButton, slot: ModuleCreatureArmorSlot) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSelectSlot(slot);
    }).addEventListener('hover', () => {
      this.updateListHover(slot);
    });
  }

  /**
   * OnSelectSlot — enter item-selection mode for a slot.
   */
  onSelectSlot(slot: ModuleCreatureArmorSlot) {
    const currentPC = this.getActiveCreature();
    if(!currentPC) return;

    if(isOffHandSlot(slot)){
      const mainSlot = slot === ModuleCreatureArmorSlot.LEFTHAND2
        ? ModuleCreatureArmorSlot.RIGHTHAND2
        : ModuleCreatureArmorSlot.RIGHTHAND;
      const mainWeapon = currentPC.GetItemInSlot(mainSlot);
      if(isLargeWeapon(mainWeapon)){
        GameState.MenuManager.InGameConfirm.fromStringRef(STR_OFFHAND_BLOCKED);
        return;
      }
    }

    this.slot = slot;
    this.equipmentSelectionActive = true;
    this.previewActive = false;
    this.previouslyEquipped = currentPC.GetItemInSlot(slot);
    this.previouslyEquippedOffHand = undefined;
    this.previouslyEquippedOffHandSlot = null;
    this.updateList();

    // : if only the "None" row exists, show nothing-available message.
    if(this.LB_ITEMS.children.length <= 1){
      GameState.MenuManager.InGameConfirm.fromStringRef(STR_NOTHING_AVAILABLE);
      this.slot = null;
      this.equipmentSelectionActive = false;
      this.clearPreviewSnapshot();
      this.updateList();
      return;
    }

    this.LBL_SELECTTITLE?.setText(GameState.TLKManager.GetStringById(STR_SELECT_TITLE).Value);
  }

  /**
   * OnOKPressed — commit preview (clear revert snapshot) and leave selection mode.
   */
  commitEquipmentSelection() {
    if(!this.equipmentSelectionActive) return;
    this.clearPreviewSnapshot();
    this.slot = null;
    this.equipmentSelectionActive = false;
    this.previewActive = false;
    this.showCantEquipMessage(false);
    this.updateSelected(undefined);
    this.updateList();
    this.updateInventoryDisplay();
  }

  /**
   * Back while selecting — revert preview and leave selection mode.
   */
  async cancelEquipmentSelection() {
    if(this.previewActive){
      await this.revertPreview();
    }
    this.clearPreviewSnapshot();
    this.slot = null;
    this.equipmentSelectionActive = false;
    this.previewActive = false;
    this.showCantEquipMessage(false);
    this.updateSelected(undefined);
    this.updateList();
    this.updateInventoryDisplay();
  }

  protected clearPreviewSnapshot() {
    this.previouslyEquipped = undefined;
    this.previouslyEquippedOffHand = undefined;
    this.previouslyEquippedOffHandSlot = null;
  }

  protected async revertPreview() {
    const currentPC = this.getActiveCreature();
    if(!currentPC || !this.slot) return;

    const current = currentPC.GetItemInSlot(this.slot);
    if(this.previouslyEquipped){
      if(current !== this.previouslyEquipped){
        await currentPC.equipItem(this.slot, this.previouslyEquipped);
      }
    }else if(current){
      currentPC.unequipSlot(this.slot);
    }

    if(this.previouslyEquippedOffHandSlot){
      if(this.previouslyEquippedOffHand){
        await currentPC.equipItem(this.previouslyEquippedOffHandSlot, this.previouslyEquippedOffHand);
      }
    }
  }

  /**
   * OnItemSelected — preview-equip on list selection.
   */
  async previewEquipSelection(item: EquipListNode) {
    if(this._suppressPreview || !this.equipmentSelectionActive || !this.slot) return;

    const canUse = (item as EquipCanUseNode).equipCanUse ?? 1;
    if(canUse === 2){
      this.showCantEquipMessage(true, STR_CANT_EQUIP);
      return;
    }
    if(canUse === 3){
      this.showCantEquipMessage(true, STR_WEAPON_CONFLICT);
      return;
    }

    this.showCantEquipMessage(false);

    const currentPC = this.getActiveCreature();
    if(!currentPC) return;

    const currentEquipped = currentPC.GetItemInSlot(this.slot);

    if(item instanceof GUIItemNone){
      if(!currentEquipped) return;
      this.previewActive = true;
      // Unequipping main hand with offhand — also drops offhand.
      if(isMainHandSlot(this.slot)){
        const offSlot = getOffHandSlotForMain(this.slot);
        if(offSlot){
          const offItem = currentPC.GetItemInSlot(offSlot);
          if(offItem && !this.previouslyEquippedOffHand){
            this.previouslyEquippedOffHand = offItem;
            this.previouslyEquippedOffHandSlot = offSlot;
            currentPC.unequipSlot(offSlot);
          }
        }
      }
      currentPC.unequipSlot(this.slot);
      this.updateInventoryDisplay();
      return;
    }

    let targetItem: Item;
    if(item instanceof GUIItemEquipped){
      targetItem = item.node;
    }else if(item instanceof Item){
      targetItem = item;
    }else{
      return;
    }

    if(targetItem === currentEquipped) return;

    this.previewActive = true;

    // LARGE main-hand preview unequips offhand (weapon_size == 4).
    if(isMainHandSlot(this.slot) && isLargeWeapon(targetItem)){
      const offSlot = getOffHandSlotForMain(this.slot);
      if(offSlot){
        const offItem = currentPC.GetItemInSlot(offSlot);
        if(offItem){
          if(!this.previouslyEquippedOffHand){
            this.previouslyEquippedOffHand = offItem;
            this.previouslyEquippedOffHandSlot = offSlot;
          }
          currentPC.unequipSlot(offSlot);
        }
      }
    }else if(isMainHandSlot(this.slot) && this.previouslyEquippedOffHand && this.previouslyEquippedOffHandSlot){
      // Restoring a non-large main hand — put offhand back if still free.
      if(!currentPC.GetItemInSlot(this.previouslyEquippedOffHandSlot)){
        await currentPC.equipItem(this.previouslyEquippedOffHandSlot, this.previouslyEquippedOffHand);
      }
      this.previouslyEquippedOffHand = undefined;
      this.previouslyEquippedOffHandSlot = null;
    }

    await currentPC.equipItem(this.slot, targetItem);
    this.updateInventoryDisplay();
  }

  /**
   * ShowCantEquipMessage.
   */
  showCantEquipMessage(show: boolean, strRef: number = 0) {
    const combatLabels = [
      this.LBL_ATKL, this.LBL_ATKR, this.LBL_TOHITL, this.LBL_TOHITR,
      this.LBL_DEF, this.LBL_VITALITY, this.LBL_ATTACK_INFO, this.LBL_DEF_INFO,
      this.LBL_TOHIT, this.LBL_DAMAGE,
    ];

    if(show){
      for(const lbl of combatLabels){
        lbl?.hide();
      }
      if(strRef){
        this.LBL_CANTEQUIP?.setText(GameState.TLKManager.GetStringById(strRef).Value);
      }
      this.LBL_CANTEQUIP?.show();
      this.BTN_EQUIP.disableSelection = true;
      this.BTN_EQUIP?.setTextColor(0.5, 0.5, 0.5);
    }else{
      this.LBL_CANTEQUIP?.hide();
      this.BTN_EQUIP.disableSelection = false;
      this.BTN_EQUIP?.setTextColor(EQUIP_COLOR_BLUE.r, EQUIP_COLOR_BLUE.g, EQUIP_COLOR_BLUE.b);
      if(!this.equipmentSelectionActive){
        for(const lbl of combatLabels){
          lbl?.show();
        }
      }
    }
  }

  updateListHover(slot: number) {
    if(!slot || this.equipmentSelectionActive) return;
    this.setSlotName(slot);
    this.populateItemList(slot, false);
  }

  updateList() {
    if (!this.equipmentSelectionActive) {
      this.BTN_EQUIP?.hide();
      this.BTN_BACK?.setText(GameState.TLKManager.GetStringById(STR_BACK).Value);
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
      this.showCombatStatLabels(true);
    } else {
      this.BTN_EQUIP?.show();
      this.BTN_EQUIP?.setText(GameState.TLKManager.GetStringById(STR_EQUIP).Value);
      this.BTN_BACK?.setText(GameState.TLKManager.GetStringById(STR_CANCEL).Value);
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
      this.showCombatStatLabels(false);
    }

    this.selectedItem = undefined;
    if(!this.equipmentSelectionActive){
      this.updateSelected(undefined);
    }

    if (this.slot) {
      this.setSlotName(this.slot);
      this.populateItemList(this.slot, this.equipmentSelectionActive);
    }
  }

  protected showCombatStatLabels(show: boolean) {
    const labels = [
      this.LBL_ATKL, this.LBL_ATKR, this.LBL_TOHITL, this.LBL_TOHITR,
      this.LBL_DEF, this.LBL_VITALITY, this.LBL_ATTACK_INFO, this.LBL_DEF_INFO,
      this.LBL_TOHIT, this.LBL_DAMAGE,
    ];
    for(const lbl of labels){
      if(show) lbl?.show();
      else lbl?.hide();
    }
  }

  protected setSlotName(slot: ModuleCreatureArmorSlot) {
    const currentPC = this.getActiveCreature();
    if(!currentPC || !this.LBL_SLOTNAME) return;
    const strRef = getSlotNameStrRef(slot, currentPC.getRace());
    if(strRef){
      this.LBL_SLOTNAME.setText(GameState.TLKManager.GetStringById(strRef).Value);
    }
  }

  /**
   * Build LB_ITEMS for a slot (None, Equipped, inventory) — OnEnterSlot.
   */
  protected populateItemList(slot: ModuleCreatureArmorSlot, selectDefault: boolean) {
    const currentPC = this.getActiveCreature();
    if(!currentPC) return;

    const inv = GameState.InventoryManager.getInventory(slot, currentPC);
    const equipped = currentPC.GetItemInSlot(slot);
    const getInSlot = (s: ModuleCreatureArmorSlot) => currentPC.GetItemInSlot(s);
    const mainWeapon = getMainWeaponForOffHandSlot(slot, getInSlot);
    const offWeapon = getOffWeaponForMainHandSlot(slot, getInSlot);

    this._suppressPreview = true;
    this.LB_ITEMS.mutate(tx => {
      tx.clear();
      tx.add(new GUIItemNone());
      if(equipped){
        tx.add(new GUIItemEquipped(equipped));
      }
      for (let i = 0; i < inv.length; i++) {
        const item = inv[i] as Item & { equipCanUse?: number };
        item.equipCanUse = getItemEquipCanUse(item, slot, mainWeapon, offWeapon);
        tx.add(item);
      }
    });

    if(selectDefault){
      // OnSelectSlot: SetSelectedControl(1) only when the slot is occupied.
      // Empty slots leave selection cleared — user must click a row to preview-equip.
      const kids = this.LB_ITEMS.children;
      if(equipped && kids.length > 1){
        this.LB_ITEMS.select(kids[1]);
      }else{
        this.updateSelected(undefined);
      }
    }
    this._suppressPreview = false;
  }

  updateSelected(item: EquipListNode) {
    this.selectedItem = item;
    let description = '';
    if (item instanceof Item) {
      description = item.getPropertyDescription();
    } else if(item instanceof GUIItemEquipped) {
      description = item.node.getPropertyDescription();
    }
    this.LB_DESC?.setItem(description || null);

    if(this.equipmentSelectionActive && item){
      void this.previewEquipSelection(item);
    }
  }

  /**
   * UpdateInventory — slot icons + attack/damage/AC/HP.
   */
  updateInventoryDisplay(force: boolean = false) {
    const currentPC = this.getActiveCreature();
    if(!currentPC) return;

    this.updateSlotIcons(force);
    this.updateWeaponStatLabels(currentPC);
    this.LBL_DEF?.setText(String(currentPC.getAC()));
    this.LBL_VITALITY?.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
  }

  protected updateWeaponStatLabels(currentPC: Creature) {
    const rWeap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    const lWeap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
    const bab = currentPC.getBaseAttackBonus();
    const twoHand = isTwoHandedWeapon(rWeap);

    // Right hand (unarmed uses right-hand to-hit when no weapons — empty path)
    if(rWeap){
      const atk = getEquipScreenAttackBonus(currentPC, rWeap, false);
      const dmg = getEquipScreenDamageRange(rWeap);
      this.setStatLabel(this.LBL_ATKR, dmg.max > 0 ? formatDamageRange(dmg.min, dmg.max) : '', false);
      this.setStatLabel(this.LBL_TOHITR, formatAttackBonus(atk), atk > bab);
    }else if(!lWeap){
      const atk = getEquipScreenAttackBonus(currentPC, undefined, false);
      this.setStatLabel(this.LBL_ATKR, '', false);
      this.setStatLabel(this.LBL_TOHITR, formatAttackBonus(atk), atk > bab);
    }else{
      this.setStatLabel(this.LBL_ATKR, '', false);
      this.setStatLabel(this.LBL_TOHITR, '', false);
    }

    // Left hand / two-hand mirror
    if(twoHand && rWeap){
      const atk = getEquipScreenAttackBonus(currentPC, rWeap, true);
      const dmg = getEquipScreenDamageRange(rWeap);
      this.setStatLabel(this.LBL_ATKL, dmg.max > 0 ? formatDamageRange(dmg.min, dmg.max) : '', false);
      this.setStatLabel(this.LBL_TOHITL, formatAttackBonus(atk), atk > bab);
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L, 0.25);
    }else if(lWeap){
      const atk = getEquipScreenAttackBonus(currentPC, lWeap, true);
      const dmg = getEquipScreenDamageRange(lWeap);
      this.setStatLabel(this.LBL_ATKL, dmg.max > 0 ? formatDamageRange(dmg.min, dmg.max) : '', false);
      this.setStatLabel(this.LBL_TOHITL, formatAttackBonus(atk), atk > bab);
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L, 1);
    }else{
      this.setStatLabel(this.LBL_ATKL, '', false);
      this.setStatLabel(this.LBL_TOHITL, '', false);
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L, 1);
    }
  }

  protected setStatLabel(label: GUILabel | undefined, text: string, better: boolean) {
    if(!label) return;
    label.setText(text);
    const c = better ? EQUIP_COLOR_GREEN : EQUIP_COLOR_BLUE;
    label.setTextColor(c.r, c.g, c.b);
  }

  protected setSlotIconAlpha(label: GUILabel | undefined, alpha: number) {
    if(!label) return;
    label.setChromeOpacity(alpha);
  }

  updateSlotIcons(force: boolean = false) {
    const currentPC = this.getActiveCreature();
    if(!currentPC) return;

    const race = currentPC.getRace();
    // Humans (6) and droids (5) both use the paper-doll slot icons.
    if (race !== 6 && race !== 5) {
      return;
    }

    const slots: [ModuleCreatureArmorSlot, GUILabel][] = [
      [ModuleCreatureArmorSlot.IMPLANT, this.LBL_INV_IMPLANT],
      [ModuleCreatureArmorSlot.HEAD, this.LBL_INV_HEAD],
      [ModuleCreatureArmorSlot.ARMS, this.LBL_INV_HANDS],
      [ModuleCreatureArmorSlot.LEFTARMBAND, this.LBL_INV_ARM_L],
      [ModuleCreatureArmorSlot.ARMOR, this.LBL_INV_BODY],
      [ModuleCreatureArmorSlot.RIGHTARMBAND, this.LBL_INV_ARM_R],
      [ModuleCreatureArmorSlot.LEFTHAND, this.LBL_INV_WEAP_L],
      [ModuleCreatureArmorSlot.BELT, this.LBL_INV_BELT],
      [ModuleCreatureArmorSlot.RIGHTHAND, this.LBL_INV_WEAP_R],
    ];

    for(const [slot, lbl] of slots){
      if(!lbl) continue;
      const item = currentPC.GetItemInSlot(slot);
      let icon: string;
      if(item){
        icon = 'i' + item.baseItem.itemClass + '_' + ('000' + item.getModelVariation()).slice(-3);
      }else{
        icon = getEmptySlotIcon(slot, race);
      }
      if(force || lbl.getFillTextureName() != icon){
        lbl.setFillTextureName(icon);
      }
    }

    // Two-hand dimming applied in updateWeaponStatLabels
    if(!isTwoHandedWeapon(currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND))){
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L, 1);
    }
  }

  updateCharacterStats(){
    this.selectedControl = this.defaultControl;
    if(this.equipmentSelectionActive && this.previewActive){
      void this.revertPreview().then(() => {
        this.clearPreviewSnapshot();
        this.equipmentSelectionActive = false;
        this.previewActive = false;
        this.refreshCharacterPanel();
      });
      return;
    }
    this.equipmentSelectionActive = false;
    this.clearPreviewSnapshot();
    this.refreshCharacterPanel();
  }

  protected refreshCharacterPanel() {
    const currentPC = this.getActiveCreature();
    if (!currentPC) {
      return;
    }
    this.LB_DESC?.setItem(null);
    this.LB_ITEMS?.setItems([]);
    if(this.LBL_PORTRAIT && this.LBL_PORTRAIT.getFillTextureName() != currentPC.getPortraitResRef()){
      this.LBL_PORTRAIT.setFillTextureName(currentPC.getPortraitResRef());
    }
    this.updateInventoryDisplay(true);
    this.updateList();
    this.updatePartyMemberButtons();
  }

  updatePartyMemberButtons(){
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      if (i == 0) { continue; }
      
      const btn_change = this.getControlByName('BTN_CHANGE' + i);
      if(!btn_change){ continue; }

      const partyMember = GameState.PartyManager.party[i];
      if(!partyMember){ continue; }

      btn_change.show();
      const portraitResRef = partyMember.getPortraitResRef();
      if (btn_change.getFillTextureName() != portraitResRef) {
        btn_change.setFillTextureName(portraitResRef);
      }
    }
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_EQU.onHoverIn();
    this.equipmentSelectionActive = false;
    this.previewActive = false;
    this.clearPreviewSnapshot();
    this.selectedControl = this.defaultControl;
    this.showCantEquipMessage(false);
    this.updateList();
    this.updateCharacterStats();
    this.updatePartyMemberButtons();
  }

  triggerControllerAPress() {
    if (this.equipmentSelectionActive) {
      this.BTN_EQUIP.click();
    } else if (this.selectedControl) {
      this.selectedControl.click();
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
  

  /** Pad button symbols drawn on this menu's controls. */
  getPadButtonGlyphs(): PadControlGlyph[] {
    const glyphs = super.getPadButtonGlyphs();
    if(this.equipmentSelectionActive) this.addPadGlyph(glyphs, 'a', this.BTN_EQUIP);
    return glyphs;
  }

}
