import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import type { GUILabel, GUIButton, GUIListBox } from "@/gui";
import { ModuleCreature, ModuleItem } from "@/module";
import { MenuEquipment as K1_MenuEquipment } from "@/game/kotor/KOTOR";
import { GameState } from "@/GameState";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import {
  EQUIP_COLOR_BLUE,
  formatAttackBonus,
  formatDamageRange,
  getEmptySlotIcon,
  getEquipScreenAttackBonus,
  getEquipScreenDamageRange,
  isTwoHandedWeapon,
} from "@/game/equipment-menu-utils";

const STR_SLOT_DISABLED = 125554; // You cannot equip or remove an item from this slot.

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

  constructor(){
    super();
    this.gui_resref = 'equip_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  protected getActiveCreature(): ModuleCreature {
    return GameState.PartyManager.party[this.currentNPCIndex];
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;

    this.childMenu = this.manager.MenuTop;

    return new Promise<void>((resolve) => {
      this.defaultControl = this.BTN_INV_BODY;

      this.LBL_INV_IMPLANT.chrome.material.alphaTest = 0.5;
      this.LBL_INV_HEAD.chrome.material.alphaTest = 0.5;
      this.LBL_INV_HANDS.chrome.material.alphaTest = 0.5;
      this.LBL_INV_ARM_L.chrome.material.alphaTest = 0.5;
      this.LBL_INV_BODY.chrome.material.alphaTest = 0.5;
      this.LBL_INV_ARM_R.chrome.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_L.chrome.material.alphaTest = 0.5;
      this.LBL_INV_BELT.chrome.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_R.chrome.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_L2.chrome.material.alphaTest = 0.5;
      this.LBL_INV_WEAP_R2.chrome.material.alphaTest = 0.5;

      this.LB_DESC.hide();
      this.LBL_CANTEQUIP.hide();

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.equipmentSelectionActive){
          this.cancelEquipmentSelection();
        }else{
          this.close();
        }
      });
      this._button_b = this.BTN_BACK;

      this.bindLockedSlotButton(this.BTN_INV_IMPLANT, ModuleCreatureArmorSlot.IMPLANT);
      this.bindLockedSlotButton(this.BTN_INV_HEAD, ModuleCreatureArmorSlot.HEAD);
      this.bindLockedSlotButton(this.BTN_INV_HANDS, ModuleCreatureArmorSlot.ARMS);
      this.bindLockedSlotButton(this.BTN_INV_ARM_L, ModuleCreatureArmorSlot.LEFTARMBAND);
      this.bindLockedSlotButton(this.BTN_INV_BODY, ModuleCreatureArmorSlot.ARMOR);
      this.bindLockedSlotButton(this.BTN_INV_ARM_R, ModuleCreatureArmorSlot.RIGHTARMBAND);
      this.bindLockedSlotButton(this.BTN_INV_WEAP_L, ModuleCreatureArmorSlot.LEFTHAND);
      this.bindLockedSlotButton(this.BTN_INV_BELT, ModuleCreatureArmorSlot.BELT);
      this.bindLockedSlotButton(this.BTN_INV_WEAP_R, ModuleCreatureArmorSlot.RIGHTHAND);
      this.bindLockedSlotButton(this.BTN_INV_WEAP_L2, ModuleCreatureArmorSlot.LEFTHAND2);
      this.bindLockedSlotButton(this.BTN_INV_WEAP_R2, ModuleCreatureArmorSlot.RIGHTHAND2);

      this.BTN_EQUIP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.commitEquipmentSelection();
      });

      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      // Retail leaves GFF PADDING (equip_p.gui LB_ITEMS); do not force 2.
      this.LB_ITEMS.onSelected = (item: ModuleItem | any) => {
        this.updateSelected(item);
      };

      this.BTN_PREVNPC.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 1){
          GameState.PartyManager.SwitchLeaderAtIndex(GameState.PartyManager.party.length - 1);
        }
      });

      this.BTN_NEXTNPC.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 1){
          GameState.PartyManager.SwitchLeaderAtIndex(1);
        }
      });

      this.BTN_SWAPWEAPONS.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.swapWeaponConfigs();
      });

      GameState.PartyManager.AddEventListener('change', () => {
        if(!this.isVisible()) return;
        this.currentNPCIndex = 0;
        this.updateCharacterStats();
      });

      resolve();
    });
  }

  private bindLockedSlotButton(btn: GUIButton, slot: ModuleCreatureArmorSlot) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(this.isSlotLocked(slot)){
        GameState.MenuManager.InGameConfirm.fromStringRef(STR_SLOT_DISABLED);
        return;
      }
      this.onSelectSlot(slot);
    }).addEventListener('hover', () => {
      this.updateListHover(slot);
    });
  }

  /**
   * Retail PerformToggleEquip / BTN_SWAPWEAPONS — swap config 1 ↔ 2 without destroying items.
   */
  private async swapWeaponConfigs() {
    const currentPC = this.getActiveCreature();
    if(!currentPC) return;

    const right1 = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    const right2 = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    const left1 = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
    const left2 = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND2);

    currentPC.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    currentPC.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    currentPC.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    currentPC.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND2);

    if(right2) await currentPC.equipItem(ModuleCreatureArmorSlot.RIGHTHAND, right2);
    if(right1) await currentPC.equipItem(ModuleCreatureArmorSlot.RIGHTHAND2, right1);
    if(left2) await currentPC.equipItem(ModuleCreatureArmorSlot.LEFTHAND, left2);
    if(left1) await currentPC.equipItem(ModuleCreatureArmorSlot.LEFTHAND2, left1);

    this.updateInventoryDisplay(true);
  }

  updateList() {
    super.updateList();
    if (!this.equipmentSelectionActive) {
      this.LBL_BACK1?.show();
      this.LBL_ATKL?.show();
      this.LBL_ATKR?.show();
      this.LBL_ATTACKMOD?.show();

      this.LBL_DEF_TEXT?.show();
      this.LBL_DEF_BACK?.show();
      this.LBL_DEF?.show();

      this.LBL_DAMTEXT?.show();
      this.LBL_DAMAGE?.show();

      this.LBL_TOHIT?.show();
      this.LBL_TOHITL?.show();
      this.LBL_TOHITR?.show();

      this.LBL_INV_WEAP_L2?.show();
      this.LBL_INV_WEAP_R2?.show();
      this.BTN_INV_WEAP_L2?.show();
      this.BTN_INV_WEAP_R2?.show();
      this.BTN_SWAPWEAPONS?.show();
      this.updateSlotLock();
    }else{
      this.LBL_BACK1?.hide();
      this.LBL_ATKL?.hide();
      this.LBL_ATKR?.hide();
      this.LBL_ATTACKMOD?.hide();

      this.LBL_DEF_TEXT?.hide();
      this.LBL_DEF_BACK?.hide();
      this.LBL_DEF?.hide();

      this.LBL_DAMTEXT?.hide();
      this.LBL_DAMAGE?.hide();

      this.LBL_TOHIT?.hide();
      this.LBL_TOHITL?.hide();
      this.LBL_TOHITR?.hide();
      
      this.LBL_INV_WEAP_L2?.hide();
      this.LBL_INV_WEAP_R2?.hide();
      this.BTN_INV_WEAP_L2?.hide();
      this.BTN_INV_WEAP_R2?.hide();
      this.BTN_SWAPWEAPONS?.hide();
    }
  }

  protected showCombatStatLabels(show: boolean) {
    // K2 selection mode hides a different set via updateList override.
    if(!show) return;
    this.LBL_ATKL?.show();
    this.LBL_ATKR?.show();
    this.LBL_TOHITL?.show();
    this.LBL_TOHITR?.show();
    this.LBL_DEF?.show();
    this.LBL_TOHIT?.show();
    this.LBL_DAMAGE?.show();
    this.LBL_ATTACKMOD?.show();
    this.LBL_DAMTEXT?.show();
    this.LBL_DEF_TEXT?.show();
  }

  showCantEquipMessage(show: boolean, strRef: number = 0) {
    const combatLabels = [
      this.LBL_ATKL, this.LBL_ATKR, this.LBL_TOHITL, this.LBL_TOHITR,
      this.LBL_DEF, this.LBL_ATTACK_INFO, this.LBL_DEF_INFO,
      this.LBL_TOHIT, this.LBL_DAMAGE, this.LBL_ATTACKMOD, this.LBL_DAMTEXT, this.LBL_DEF_TEXT, this.LBL_DEF_BACK,
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

  updateSlotIcons(force: boolean = false) {
    const currentPC = this.getActiveCreature();
    if(!currentPC) return;

    const race = currentPC.getRace();
    if(race !== 6 && race !== 5) return;

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
      [ModuleCreatureArmorSlot.LEFTHAND2, this.LBL_INV_WEAP_L2],
      [ModuleCreatureArmorSlot.RIGHTHAND2, this.LBL_INV_WEAP_R2],
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

    if(!isTwoHandedWeapon(currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND))){
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L, 1);
    }
    if(!isTwoHandedWeapon(currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND2))){
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L2, 1);
    }
  }

  protected updateWeaponStatLabels(currentPC: ModuleCreature) {
    const rWeap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    const lWeap = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
    const bab = currentPC.getBaseAttackBonus();
    const twoHand = isTwoHandedWeapon(rWeap);

    this.LBL_ATTACKMOD?.setText(formatAttackBonus(bab));

    if(rWeap){
      const atk = getEquipScreenAttackBonus(currentPC, rWeap, false);
      const dmg = getEquipScreenDamageRange(rWeap);
      const dmgStr = dmg.max > 0 ? formatDamageRange(dmg.min, dmg.max) : '-';
      this.setStatLabel(this.LBL_ATKR, dmgStr === '-' ? '' : dmgStr, false);
      this.setStatLabel(this.LBL_TOHITR, formatAttackBonus(atk), atk > bab);
      this.LBL_DAMAGE?.setText(dmgStr);
    }else if(!lWeap){
      const atk = getEquipScreenAttackBonus(currentPC, undefined, false);
      this.setStatLabel(this.LBL_ATKR, '', false);
      this.setStatLabel(this.LBL_TOHITR, formatAttackBonus(atk), atk > bab);
      this.LBL_DAMAGE?.setText('-');
    }else{
      this.setStatLabel(this.LBL_ATKR, '', false);
      this.setStatLabel(this.LBL_TOHITR, '-', false);
      this.LBL_DAMAGE?.setText('-');
    }

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
      this.setStatLabel(this.LBL_TOHITL, '-', false);
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L, 1);
    }

    // Config-2 two-hand dimming
    const rWeap2 = currentPC.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    if(isTwoHandedWeapon(rWeap2)){
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L2, 0.25);
    }else{
      this.setSlotIconAlpha(this.LBL_INV_WEAP_L2, 1);
    }
  }

  updateCharacterStats() {
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
    if(!currentPC) return;

    this.LB_DESC?.setItem(null);
    this.LB_ITEMS?.setItems([]);
    this.LBL_TITLE?.setText(currentPC.getName());
    this.updateInventoryDisplay(true);
    this.updateList();
  }

  private isSlotLocked(slot: ModuleCreatureArmorSlot): boolean {
    const npc = this.getActiveCreature();
    if(!npc) return false;
    let locked = npc.creatureAppearance?.equipslotslocked ?? 0;
    if(locked === -1) return false;

    // Retail UpdateSlotLocks: locking primary hand also locks secondary config.
    if(slot === ModuleCreatureArmorSlot.LEFTHAND2 && (locked & ModuleCreatureArmorSlot.LEFTHAND)){
      return true;
    }
    if(slot === ModuleCreatureArmorSlot.RIGHTHAND2 && (locked & ModuleCreatureArmorSlot.RIGHTHAND)){
      return true;
    }
    return (locked & slot) !== 0;
  }

  private updateSlotLock() {
    const slots: [GUIButton, GUILabel, ModuleCreatureArmorSlot][] = [
      [this.BTN_INV_IMPLANT, this.LBL_INV_IMPLANT, ModuleCreatureArmorSlot.IMPLANT],
      [this.BTN_INV_HEAD,    this.LBL_INV_HEAD,    ModuleCreatureArmorSlot.HEAD],
      [this.BTN_INV_HANDS,   this.LBL_INV_HANDS,   ModuleCreatureArmorSlot.ARMS],
      [this.BTN_INV_ARM_L,   this.LBL_INV_ARM_L,   ModuleCreatureArmorSlot.LEFTARMBAND],
      [this.BTN_INV_BODY,    this.LBL_INV_BODY,     ModuleCreatureArmorSlot.ARMOR],
      [this.BTN_INV_ARM_R,   this.LBL_INV_ARM_R,   ModuleCreatureArmorSlot.RIGHTARMBAND],
      [this.BTN_INV_WEAP_L,  this.LBL_INV_WEAP_L,  ModuleCreatureArmorSlot.LEFTHAND],
      [this.BTN_INV_BELT,    this.LBL_INV_BELT,    ModuleCreatureArmorSlot.BELT],
      [this.BTN_INV_WEAP_R,  this.LBL_INV_WEAP_R,  ModuleCreatureArmorSlot.RIGHTHAND],
      [this.BTN_INV_WEAP_L2, this.LBL_INV_WEAP_L2, ModuleCreatureArmorSlot.LEFTHAND2],
      [this.BTN_INV_WEAP_R2, this.LBL_INV_WEAP_R2, ModuleCreatureArmorSlot.RIGHTHAND2],
    ];

    for(const [btn, lbl, slot] of slots){
      if(!btn || !lbl) continue;
      if(this.isSlotLocked(slot)){
        btn.setBorderColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
        btn.setHighlightColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
        lbl.setBorderColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
        lbl.setHighlightColor(btn.defaultLockedColor.r, btn.defaultLockedColor.g, btn.defaultLockedColor.b);
      }else{
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
  }

  triggerControllerAPress() {
    if(this.equipmentSelectionActive){
      this.BTN_EQUIP.click();
    }else if(this.selectedControl){
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
    if(this.equipmentSelectionActive){
      this.LB_ITEMS.directionalNavigate('up');
    }else{
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
      if(this.selectedControl == this.BTN_INV_IMPLANT){
      }else if(this.selectedControl == this.BTN_INV_HEAD){
      }else if(this.selectedControl == this.BTN_INV_HANDS){
      }else if(this.selectedControl == this.BTN_INV_ARM_L){
        this.selectedControl = this.BTN_INV_IMPLANT;
      }else if(this.selectedControl == this.BTN_INV_BODY){
        this.selectedControl = this.BTN_INV_HEAD;
      }else if(this.selectedControl == this.BTN_INV_ARM_R){
        this.selectedControl = this.BTN_INV_HANDS;
      }else if(this.selectedControl == this.BTN_INV_WEAP_L){
        this.selectedControl = this.BTN_INV_ARM_L;
      }else if(this.selectedControl == this.BTN_INV_BELT){
        this.selectedControl = this.BTN_INV_BODY;
      }else if(this.selectedControl == this.BTN_INV_WEAP_R){
        this.selectedControl = this.BTN_INV_ARM_R;
      }else if(this.selectedControl == this.BTN_INV_WEAP_L2){
        this.selectedControl = this.BTN_INV_WEAP_L;
      }else if(this.selectedControl == this.BTN_INV_WEAP_R2){
        this.selectedControl = this.BTN_INV_WEAP_R;
      }
      if(this.selectedControl){
        this.selectedControl.onHoverIn();
      }
    }
  }

  triggerControllerDDownPress() {
    if(this.equipmentSelectionActive){
      this.LB_ITEMS.directionalNavigate('down');
    }else{
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
      if(this.selectedControl == this.BTN_INV_IMPLANT){
        this.selectedControl = this.BTN_INV_ARM_L;
      }else if(this.selectedControl == this.BTN_INV_HEAD){
        this.selectedControl = this.BTN_INV_BODY;
      }else if(this.selectedControl == this.BTN_INV_HANDS){
        this.selectedControl = this.BTN_INV_BODY;
      }else if(this.selectedControl == this.BTN_INV_ARM_L){
        this.selectedControl = this.BTN_INV_WEAP_L;
      }else if(this.selectedControl == this.BTN_INV_BODY){
        this.selectedControl = this.BTN_INV_BELT;
      }else if(this.selectedControl == this.BTN_INV_ARM_R){
        this.selectedControl = this.BTN_INV_WEAP_R;
      }else if(this.selectedControl == this.BTN_INV_WEAP_L){
        this.selectedControl = this.BTN_INV_WEAP_L2;
      }else if(this.selectedControl == this.BTN_INV_BELT){
      }else if(this.selectedControl == this.BTN_INV_WEAP_R){
        this.selectedControl = this.BTN_INV_WEAP_R2;
      }else if(this.selectedControl == this.BTN_INV_WEAP_L2){
      }else if(this.selectedControl == this.BTN_INV_WEAP_R2){
      }
      if(this.selectedControl){
        this.selectedControl.onHoverIn();
      }
    }
  }

  triggerControllerDLeftPress() {
    if(this.equipmentSelectionActive){
    }else{
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
      if(this.selectedControl == this.BTN_INV_IMPLANT){
      }else if(this.selectedControl == this.BTN_INV_HEAD){
        this.selectedControl = this.BTN_INV_IMPLANT;
      }else if(this.selectedControl == this.BTN_INV_HANDS){
        this.selectedControl = this.BTN_INV_HEAD;
      }else if(this.selectedControl == this.BTN_INV_ARM_L){
      }else if(this.selectedControl == this.BTN_INV_BODY){
        this.selectedControl = this.BTN_INV_ARM_L;
      }else if(this.selectedControl == this.BTN_INV_ARM_R){
        this.selectedControl = this.BTN_INV_BODY;
      }else if(this.selectedControl == this.BTN_INV_WEAP_L){
      }else if(this.selectedControl == this.BTN_INV_BELT){
        this.selectedControl = this.BTN_INV_WEAP_L;
      }else if(this.selectedControl == this.BTN_INV_WEAP_R){
        this.selectedControl = this.BTN_INV_BELT;
      }else if(this.selectedControl == this.BTN_INV_WEAP_L2){
      }else if(this.selectedControl == this.BTN_INV_WEAP_R2){
        this.selectedControl = this.BTN_INV_WEAP_L2;
      }
      if(this.selectedControl){
        this.selectedControl.onHoverIn();
      }
    }
  }

  triggerControllerDRightPress() {
    if(this.equipmentSelectionActive){
    }else{
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
      if(this.selectedControl == this.BTN_INV_IMPLANT){
        this.selectedControl = this.BTN_INV_HEAD;
      }else if(this.selectedControl == this.BTN_INV_HEAD){
        this.selectedControl = this.BTN_INV_HANDS;
      }else if(this.selectedControl == this.BTN_INV_HANDS){
      }else if(this.selectedControl == this.BTN_INV_ARM_L){
        this.selectedControl = this.BTN_INV_BODY;
      }else if(this.selectedControl == this.BTN_INV_BODY){
        this.selectedControl = this.BTN_INV_ARM_R;
      }else if(this.selectedControl == this.BTN_INV_ARM_R){
      }else if(this.selectedControl == this.BTN_INV_WEAP_L){
        this.selectedControl = this.BTN_INV_BELT;
      }else if(this.selectedControl == this.BTN_INV_BELT){
        this.selectedControl = this.BTN_INV_WEAP_R;
      }else if(this.selectedControl == this.BTN_INV_WEAP_R){
      }else if(this.selectedControl == this.BTN_INV_WEAP_L2){
        this.selectedControl = this.BTN_INV_WEAP_R2;
      }else if(this.selectedControl == this.BTN_INV_WEAP_R2){
      }
      if(this.selectedControl){
        this.selectedControl.onHoverIn();
      }
    }
  }

  triggerControllerLStickYPress(positive = false) {
    if(positive){
      this.LB_DESC.scrollUp();
    }else{
      this.LB_DESC.scrollDown();
    }
  }

}
