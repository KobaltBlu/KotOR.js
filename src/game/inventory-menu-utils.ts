import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { BaseItemType } from "@/enums/combat/BaseItemType";
import { GameState } from "@/GameState";
import {
  ItemTypeCategory,
  RACE_DROID,
  isLeaderUsableItem,
  isSelfMedicalItemType,
  isSquadMedicalItemType,
} from "@/engine/menu/action-menu-usable";
import { GUIItemEquipped } from "@/gui/protoitem/GUIItemEquipped";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";

/**
 * Retail CSWGuiInGameInventory::CheckFilter / SetNextFilter filter indices.
 * K1 cycles 0–5 via BTN_QUESTITEMS. K2 category buttons set 0 / 6–11.
 */
export enum InventoryFilter {
  ALL = 0,
  NEW = 1,
  QUEST = 2,
  EQUIPABLE = 3,
  MISC = 4,
  USEABLE = 5,
  /** K2 BTN_DATAPADS */
  DATAPADS = 6,
  /** K2 BTN_WEAPONS */
  WEAPONS = 7,
  /** K2 BTN_ARMOR */
  ARMOR = 8,
  /** K2 BTN_USEABLE — baseitem ids 53–56 */
  USEABLE_K2 = 9,
  /** K2 BTN_QUESTS */
  QUESTS_K2 = 10,
  /** K2 BTN_MISC */
  MISC_K2 = 11,
}

/** Retail itemFilterStrRefs @ 0x756444 (K1). */
export const ITEM_FILTER_STR_REFS: readonly number[] = [
  41822, // All
  42165, // New
  41818, // Quest Items
  41821, // Equipable
  41819, // Misc
  41820, // Useable
];

/** TLK 0x7dab — "Inventory" title prefix for LBL_INV. */
export const STR_INVENTORY_TITLE = 0x7dab;
/** TLK 0xa577 — next-filter button prefix for BTN_QUESTITEMS. */
export const STR_FILTER_NEXT_PREFIX = 0xa577;
/** TLK 0xa5f5 — CantEquip */
export const STR_INV_CANT_EQUIP = 0xa5f5;
/** TLK 0xa5f6 — NotUseable */
export const STR_INV_NOT_USEABLE = 0xa5f6;
/** TLK 0xa603 — FullHealth */
export const STR_INV_FULL_HEALTH = 0xa603;
/** TLK 0xbd6e — SquadFullHealth */
export const STR_INV_SQUAD_FULL_HEALTH = 0xbd6e;

/** Retail datapad itemtype (CheckFilter case 6). */
export const ITEM_TYPE_DATAPAD = 0x18;

/** Hand slots for K2 weapons filter (equipableSlots & 0x30). */
export const INV_WEAPON_HAND_SLOTS =
  ModuleCreatureArmorSlot.RIGHTHAND | ModuleCreatureArmorSlot.LEFTHAND;
/** Armband slots (equipableSlots & 0x180). */
export const INV_ARMBAND_SLOTS =
  ModuleCreatureArmorSlot.LEFTARMBAND | ModuleCreatureArmorSlot.RIGHTARMBAND;
/**
 * Retail armor filter mask 0x78b:
 * HEAD|ARMOR|ARMS|LEFTARMBAND|RIGHTARMBAND|IMPLANT|BELT
 */
export const INV_ARMOR_SLOTS =
  ModuleCreatureArmorSlot.HEAD |
  ModuleCreatureArmorSlot.ARMOR |
  ModuleCreatureArmorSlot.ARMS |
  ModuleCreatureArmorSlot.LEFTARMBAND |
  ModuleCreatureArmorSlot.RIGHTARMBAND |
  ModuleCreatureArmorSlot.IMPLANT |
  ModuleCreatureArmorSlot.BELT;

/** K2 USEABLE filter: adrenaline … droid repair (baseitem 53–56). */
export const INV_K2_USEABLE_BASEITEM_MIN = BaseItemType.ADRENALINE;
export const INV_K2_USEABLE_BASEITEM_MAX = BaseItemType.DROID_REPAIR_EQUIPMENT;

/** Slots walked by K1 PopulateItemListBox (i = 0..13 → 1<<i). */
export const INV_K1_EQUIP_SLOT_BITS = 14;
/** Slots walked by K2 PopulateItemListBox (i = 0..19), skipping creature slots. */
export const INV_K2_EQUIP_SLOT_BITS = 20;

const CREATURE_SLOTS_SKIP =
  ModuleCreatureArmorSlot.CLAW1 |
  ModuleCreatureArmorSlot.CLAW2 |
  ModuleCreatureArmorSlot.CLAW3 |
  ModuleCreatureArmorSlot.HIDE;

export type InventoryListNode = (ModuleItem | GUIItemEquipped) & {
  inventoryCanUse?: number;
  inventoryDenyStrRef?: number;
};

/** Persistent filter (retail CGuiInGame::current_inventory_filter). */
let currentInventoryFilter: InventoryFilter = InventoryFilter.ALL;

export function getCurrentInventoryFilter(): InventoryFilter {
  return currentInventoryFilter;
}

export function setCurrentInventoryFilter(filter: InventoryFilter): void {
  currentInventoryFilter = filter;
}

/** Clamp to K1 cycle range 0–5 (K2 may leave filter at 6–11). */
export function getK1InventoryFilter(filter: InventoryFilter = currentInventoryFilter): InventoryFilter {
  if(filter < 0 || filter > InventoryFilter.USEABLE){
    return InventoryFilter.ALL;
  }
  return filter;
}

export function getNextK1InventoryFilter(filter: InventoryFilter = currentInventoryFilter): InventoryFilter {
  const base = getK1InventoryFilter(filter);
  return ((base + 1) % 6) as InventoryFilter;
}

export function cycleK1InventoryFilter(): InventoryFilter {
  currentInventoryFilter = getNextK1InventoryFilter(currentInventoryFilter);
  return currentInventoryFilter;
}

export function getInventoryFilterLabel(filter: InventoryFilter): string {
  const k1 = getK1InventoryFilter(filter);
  const strRef = ITEM_FILTER_STR_REFS[k1] ?? ITEM_FILTER_STR_REFS[0];
  return GameState.TLKManager.GetStringById(strRef)?.Value ?? '';
}

/** Retail LBL_INV: Inventory - &lt;filter&gt; */
export function formatInventoryTitle(filter: InventoryFilter = currentInventoryFilter): string {
  const inv = GameState.TLKManager.GetStringById(STR_INVENTORY_TITLE)?.Value ?? 'Inventory';
  const name = getInventoryFilterLabel(filter);
  return `${inv} - ${name}`;
}

/** Retail BTN_QUESTITEMS: &lt;prefix&gt; &lt;next filter&gt; */
export function formatQuestItemsButtonText(filter: InventoryFilter = currentInventoryFilter): string {
  const prefix = GameState.TLKManager.GetStringById(STR_FILTER_NEXT_PREFIX)?.Value ?? '';
  const nextName = getInventoryFilterLabel(getNextK1InventoryFilter(filter));
  return `${prefix} ${nextName}`.trim();
}

function getItemType(item: ModuleItem): number {
  const t = item.baseItem?.itemType;
  return typeof t === 'number' ? t : -1;
}

function getEquipableSlots(item: ModuleItem): number {
  return item.baseItem?.equipableSlots | 0;
}

function isWristWeaponItem(item: ModuleItem): boolean {
  const slots = getEquipableSlots(item);
  if((slots & INV_ARMBAND_SLOTS) === 0) return false;
  // Retail CheckFilter: baseitem field @ +0xb4 == 2 (weaponWield ONE_HANDED_SWORD).
  return (item.baseItem?.weaponWield | 0) === WeaponWield.ONE_HANDED_SWORD;
}

function isK2UseableBaseItem(item: ModuleItem): boolean {
  const id = item.getBaseItemId?.() ?? item.baseItemId;
  return id >= INV_K2_USEABLE_BASEITEM_MIN && id <= INV_K2_USEABLE_BASEITEM_MAX;
}

/**
 * Retail CSWGuiInGameInventory::CheckFilter.
 * @param fromEquipmentSlot armband/belt equipped-item usable-mask path
 */
export function checkInventoryFilter(
  item: ModuleItem,
  creature: ModuleCreature,
  filter: InventoryFilter,
  fromEquipmentSlot: boolean = false
): boolean {
  if(!item) return false;

  switch(filter){
    case InventoryFilter.ALL:
      return true;
    case InventoryFilter.NEW:
      return !!(item.newItem);
    case InventoryFilter.QUEST:
    case InventoryFilter.QUESTS_K2:
      return !!item.plot;
    case InventoryFilter.EQUIPABLE:
      return getEquipableSlots(item) !== 0;
    case InventoryFilter.MISC:
      return !item.plot && getEquipableSlots(item) === 0;
    case InventoryFilter.USEABLE: {
      // Retail mask 0xff; CanUseItem is applied inside isLeaderUsableItem success paths.
      return isLeaderUsableItem(creature, item, fromEquipmentSlot, 0xff);
    }
    case InventoryFilter.DATAPADS:
      return getItemType(item) === ITEM_TYPE_DATAPAD;
    case InventoryFilter.WEAPONS: {
      const slots = getEquipableSlots(item);
      if((slots & INV_WEAPON_HAND_SLOTS) !== 0) return true;
      return isWristWeaponItem(item);
    }
    case InventoryFilter.ARMOR: {
      const slots = getEquipableSlots(item);
      if((slots & INV_ARMOR_SLOTS) === 0) return false;
      if(isWristWeaponItem(item)) return false;
      return true;
    }
    case InventoryFilter.USEABLE_K2:
      return isK2UseableBaseItem(item);
    case InventoryFilter.MISC_K2: {
      if(getItemType(item) === ITEM_TYPE_DATAPAD) return false;
      if(getEquipableSlots(item) !== 0) return false;
      if(isK2UseableBaseItem(item)) return false;
      return true;
    }
    default:
      return true;
  }
}

/**
 * Retail CreateItemEntry canUse / deny message selection.
 * Returns canUse 1 when Accept/Use Item should InstantUseItem.
 */
export function getInventoryItemCanUse(
  creature: ModuleCreature,
  item: ModuleItem,
  fromEquipmentSlot: boolean,
  isK2: boolean = false
): { canUse: number; denyStrRef: number } {
  const mask = 0xff;
  const leaderUsable = isLeaderUsableItem(creature, item, fromEquipmentSlot, mask);

  if(!leaderUsable){
    if(getEquipableSlots(item) === 0){
      return { canUse: 0, denyStrRef: STR_INV_NOT_USEABLE };
    }
    return { canUse: 0, denyStrRef: STR_INV_CANT_EQUIP };
  }

  const itemType = getItemType(item);
  const race = creature.getRace?.() ?? 0;

  if(isSelfMedicalItemType(itemType)){
    if(creature.getHP() >= creature.getMaxHP()){
      return { canUse: 0, denyStrRef: STR_INV_FULL_HEALTH };
    }
  }

  if(isSquadMedicalItemType(itemType)){
    const members = GameState.PartyManager?.party?.length
      ? GameState.PartyManager.party
      : [creature];
    let anyInjured = false;
    for(let i = 0; i < members.length; i++){
      const m = members[i];
      if(m && m.getHP() < m.getMaxHP()){
        anyInjured = true;
        break;
      }
    }
    if(!anyInjured){
      return { canUse: 0, denyStrRef: STR_INV_SQUAD_FULL_HEALTH };
    }
  }

  // K2 CreateItemEntry race gates after usable check.
  if(isK2){
    if(itemType === ItemTypeCategory.MEDICAL_A && race === RACE_DROID){
      return { canUse: 0, denyStrRef: STR_INV_NOT_USEABLE };
    }
    if(itemType === ItemTypeCategory.MEDICAL_C && race !== RACE_DROID){
      return { canUse: 0, denyStrRef: STR_INV_NOT_USEABLE };
    }
  }

  return { canUse: 1, denyStrRef: 0 };
}

function isEquipmentUsableSlot(slot: number): boolean {
  return (
    slot === ModuleCreatureArmorSlot.LEFTARMBAND ||
    slot === ModuleCreatureArmorSlot.RIGHTARMBAND ||
    slot === ModuleCreatureArmorSlot.BELT
  );
}

function shouldSkipEquipSlot(slot: number, isK2: boolean): boolean {
  if(!slot) return true;
  if(isK2 && (slot & CREATURE_SLOTS_SKIP) !== 0) return true;
  return false;
}

/**
 * Retail PopulateItemListBox item order: equipped slots first, then bag.
 */
export function collectInventoryListNodes(
  creature: ModuleCreature,
  filter: InventoryFilter,
  isK2: boolean = false
): InventoryListNode[] {
  const nodes: InventoryListNode[] = [];
  const seen = new Set<ModuleItem>();
  const slotCount = isK2 ? INV_K2_EQUIP_SLOT_BITS : INV_K1_EQUIP_SLOT_BITS;

  for(let i = 0; i < slotCount; i++){
    const slot = 1 << i;
    if(shouldSkipEquipSlot(slot, isK2)) continue;

    const equipped = creature.GetItemInSlot?.(slot) || creature.getItemInSlot?.(slot);
    if(!equipped || seen.has(equipped)) continue;

    const fromEquip = isEquipmentUsableSlot(slot);
    if(!checkInventoryFilter(equipped, creature, filter, fromEquip)) continue;

    seen.add(equipped);
    const { canUse, denyStrRef } = getInventoryItemCanUse(creature, equipped, fromEquip, isK2);
    const row = new GUIItemEquipped(equipped) as InventoryListNode;
    row.inventoryCanUse = canUse;
    row.inventoryDenyStrRef = denyStrRef;
    nodes.push(row);
  }

  const bag = GameState.InventoryManager.getInventory() || [];
  for(let i = 0; i < bag.length; i++){
    const item = bag[i];
    if(!item || seen.has(item)) continue;
    if(!checkInventoryFilter(item, creature, filter, false)) continue;

    const { canUse, denyStrRef } = getInventoryItemCanUse(creature, item, false, isK2);
    const row = item as InventoryListNode;
    row.inventoryCanUse = canUse;
    row.inventoryDenyStrRef = denyStrRef;
    nodes.push(row);
  }

  return nodes;
}

export function unwrapInventoryListNode(node: InventoryListNode | undefined): ModuleItem | undefined {
  if(!node) return undefined;
  if(node instanceof GUIItemEquipped) return node.node;
  return node as ModuleItem;
}

export function clearInventoryItemNewFlag(item: ModuleItem | undefined): void {
  if(!item) return;
  if(item.newItem){
    item.newItem = 0;
  }
}
