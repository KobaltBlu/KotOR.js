import { BaseItemType } from "@/enums/combat/BaseItemType";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { TwoDAObject } from "@/resource/TwoDAObject";

/** / GUI category ids. */
export enum UpgradeCategory {
  NONE = 0,
  LIGHTSABER = 1,
  RANGED = 2,
  MELEE = 3,
  ARMOR = 4,
}

export type UpgradeCategoryKey = 'LIGHTSABER' | 'RANGED' | 'MELEE' | 'ARMOR' | 'NONE';

export interface UpgradeSlotInfo {
  upgradeType: number;
  emptyIcon: string;
  nameStrRef: number;
  /** True when the slot uses upcrystals.2da (LS middle / crystal slot). */
  isCrystal: boolean;
}

export interface UpgradeItemSource {
  item: ModuleItem;
  equipped: boolean;
  creature?: ModuleCreature;
  equipSlot?: number;
}

export interface UpgradeComponentChoice {
  /** Inventory item to install, or undefined for the empty/remove row. */
  item?: ModuleItem;
  /** upgrade.2da / upcrystals.2da row index, or -1 for remove. */
  rowIndex: number;
  isRemove: boolean;
  label: string;
}

export interface UpgradeSessionSlot {
  info: UpgradeSlotInfo;
  /** Installed component item (live or reserved), if any. */
  component?: ModuleItem;
  /** upgrade.2da row currently assigned to this slot, or -1. */
  upgradeRow: number;
  /** Template tag expected by this slot when empty (lowercase). */
  templateTag: string;
}

/** K1 SLOT_INFO — indexed by (slotIndex-4)+category*4. */
const K1_SLOT_INFO: Record<UpgradeCategory, UpgradeSlotInfo[]> = {
  [UpgradeCategory.NONE]: [],
  [UpgradeCategory.LIGHTSABER]: [
    { upgradeType: 0, emptyIcon: 'i_powerc', nameStrRef: 0x9071, isCrystal: false },
    { upgradeType: -1, emptyIcon: 'i_colorc', nameStrRef: 0x9072, isCrystal: true },
    { upgradeType: 0, emptyIcon: 'i_powerc', nameStrRef: 0x9071, isCrystal: false },
  ],
  [UpgradeCategory.RANGED]: [
    { upgradeType: 4, emptyIcon: 'i_scope', nameStrRef: 0x7ee7, isCrystal: false },
    { upgradeType: 5, emptyIcon: 'i_energy', nameStrRef: 0x7ee8, isCrystal: false },
    { upgradeType: 6, emptyIcon: 'i_beam', nameStrRef: 0x7ee9, isCrystal: false },
    { upgradeType: 7, emptyIcon: 'i_hair', nameStrRef: 0x7eea, isCrystal: false },
  ],
  [UpgradeCategory.MELEE]: [
    { upgradeType: 1, emptyIcon: 'i_vcell', nameStrRef: 0x7eed, isCrystal: false },
    { upgradeType: 2, emptyIcon: 'i_durasteel', nameStrRef: 0x7eee, isCrystal: false },
    { upgradeType: 3, emptyIcon: 'i_imp_eng', nameStrRef: 0x7eef, isCrystal: false },
  ],
  [UpgradeCategory.ARMOR]: [
    { upgradeType: 8, emptyIcon: 'i_armorrein', nameStrRef: 0x7eeb, isCrystal: false },
    { upgradeType: 9, emptyIcon: 'i_armorrein', nameStrRef: 0x7eec, isCrystal: false },
  ],
};

/** K2 SLOT_INFO — 6 entries per category. */
const K2_SLOT_INFO: Record<UpgradeCategory, UpgradeSlotInfo[]> = {
  [UpgradeCategory.NONE]: [],
  [UpgradeCategory.LIGHTSABER]: [
    { upgradeType: 0, emptyIcon: 'i_lsenergy', nameStrRef: 0xbd59, isCrystal: false },
    { upgradeType: -1, emptyIcon: 'i_lsenergy', nameStrRef: 0xbd58, isCrystal: true },
    { upgradeType: 0, emptyIcon: 'i_lsenergy', nameStrRef: 0xbd59, isCrystal: false },
    { upgradeType: 1, emptyIcon: 'i_lens', nameStrRef: 0xbd50, isCrystal: false },
    { upgradeType: 2, emptyIcon: 'i_emitter', nameStrRef: 0xbd51, isCrystal: false },
    { upgradeType: 3, emptyIcon: 'i_lsenergy', nameStrRef: 0xbd52, isCrystal: false },
  ],
  [UpgradeCategory.RANGED]: [
    { upgradeType: 4, emptyIcon: 'i_scope', nameStrRef: 0xbd57, isCrystal: false },
    { upgradeType: 5, emptyIcon: 'i_energy', nameStrRef: 0xbd56, isCrystal: false },
    { upgradeType: 6, emptyIcon: 'i_imp_eng', nameStrRef: 0xbd55, isCrystal: false },
  ],
  [UpgradeCategory.MELEE]: [
    { upgradeType: 7, emptyIcon: 'i_grip', nameStrRef: 0xbd53, isCrystal: false },
    { upgradeType: 8, emptyIcon: 'i_edge', nameStrRef: 0xbd54, isCrystal: false },
    { upgradeType: 9, emptyIcon: 'i_vcell', nameStrRef: 0xbd52, isCrystal: false },
  ],
  [UpgradeCategory.ARMOR]: [
    { upgradeType: 10, emptyIcon: 'i_armorrein', nameStrRef: 0xbd5b, isCrystal: false },
    { upgradeType: 11, emptyIcon: 'i_armorrein', nameStrRef: 0xbd5a, isCrystal: false },
  ],
};

const LIGHTSABER_BASE_ITEMS = [
  BaseItemType.LIGHTSABER,
  BaseItemType.DOUBLE_BLADED_LIGHTSABER,
  BaseItemType.SHORT_LIGHTSABER,
];

/** TLK 0xa42a — "Upgrades" label used by OnEnterSlot. */
export const TLK_UPGRADES_LABEL = 0xa42a;
/** TLK 0xa5f9 — CantEquip confirmation used when verifying upgrades. */
export const TLK_UPGRADE_CANT_EQUIP = 0xa5f9;

export function categoryToKey(category: UpgradeCategory): UpgradeCategoryKey {
  switch(category){
    case UpgradeCategory.LIGHTSABER: return 'LIGHTSABER';
    case UpgradeCategory.RANGED: return 'RANGED';
    case UpgradeCategory.MELEE: return 'MELEE';
    case UpgradeCategory.ARMOR: return 'ARMOR';
    default: return 'NONE';
  }
}

export function keyToCategory(key: UpgradeCategoryKey): UpgradeCategory {
  switch(key){
    case 'LIGHTSABER': return UpgradeCategory.LIGHTSABER;
    case 'RANGED': return UpgradeCategory.RANGED;
    case 'MELEE': return UpgradeCategory.MELEE;
    case 'ARMOR': return UpgradeCategory.ARMOR;
    default: return UpgradeCategory.NONE;
  }
}

export function getUpgradeTable(): TwoDAObject | undefined {
  return GameState.TwoDAManager?.datatables?.get('upgrade');
}

export function getUpcrystalsTable(): TwoDAObject | undefined {
  return GameState.TwoDAManager?.datatables?.get('upcrystals');
}

export function getSlotInfos(category: UpgradeCategory): UpgradeSlotInfo[] {
  const table = GameState.GameKey === GameEngineType.TSL ? K2_SLOT_INFO : K1_SLOT_INFO;
  return table[category] || [];
}

export function getSlotCount(category: UpgradeCategory): number {
  return getSlotInfos(category).length;
}

/**
 * GetUpgradableType.
 * K1 maps item-property UpgradeType rows through upgrade.2da.
 * K2 uses baseitems.itemtype plus UpgradeLevel > 0.
 */
export function getUpgradableType(item: ModuleItem, upgradeTable?: TwoDAObject): UpgradeCategory {
  if(!item) return UpgradeCategory.NONE;

  if(GameState.GameKey === GameEngineType.TSL){
    if(!(item.upgradeLevel > 0)) return UpgradeCategory.NONE;
    const itemType = item.baseItem?.itemType ?? -1;
    if(itemType === 0 || itemType === 1 || itemType === 2) return UpgradeCategory.MELEE;
    if(itemType === 0x27 || itemType === 0x28 || itemType === 0x29) return UpgradeCategory.LIGHTSABER;
    if(itemType === 3 || itemType === 4 || itemType === 5) return UpgradeCategory.RANGED;
    if(itemType > 0x1e && itemType < 0x27) return UpgradeCategory.ARMOR;
    // Fallback for engines where itemtype is unset but baseitem id is known.
    if(LIGHTSABER_BASE_ITEMS.includes(item.baseItemId)) return UpgradeCategory.LIGHTSABER;
    return UpgradeCategory.NONE;
  }

  const table = upgradeTable || getUpgradeTable();
  if(!table) return UpgradeCategory.NONE;

  let category = UpgradeCategory.NONE;
  const props = item.properties || [];
  for(let i = 0; i < props.length; i++){
    const upgradeType = props[i]?.upgradeType;
    if(typeof upgradeType !== 'number' || upgradeType < 0 || upgradeType === 255) continue;
    const row = table.getRowByIndex(upgradeType) || table.rows[upgradeType];
    if(!row) continue;
    const mapped = TwoDAObject.normalizeValue(row.upgradetype ?? row.UpgradeType, 'number', -1) as number;
    switch(mapped){
      case 0:
        category = UpgradeCategory.LIGHTSABER;
        break;
      case 1: case 2: case 3:
        category = UpgradeCategory.MELEE;
        break;
      case 4: case 5: case 6: case 7:
        category = UpgradeCategory.RANGED;
        break;
      case 8: case 9:
        category = UpgradeCategory.ARMOR;
        break;
    }
  }
  return category;
}

export function isItemUpgradable(item: ModuleItem): boolean {
  return getUpgradableType(item) !== UpgradeCategory.NONE;
}

/** Collect upgradable items from party bag + equipped party members. */
export function collectUpgradableItems(filterCategory: UpgradeCategory = UpgradeCategory.NONE): UpgradeItemSource[] {
  const table = getUpgradeTable();
  const results: UpgradeItemSource[] = [];
  const seen = new Set<ModuleItem>();

  const consider = (item: ModuleItem, equipped: boolean, creature?: ModuleCreature, equipSlot?: number) => {
    if(!item || seen.has(item)) return;
    const category = getUpgradableType(item, table);
    if(category === UpgradeCategory.NONE) return;
    if(filterCategory !== UpgradeCategory.NONE && category !== filterCategory) return;
    seen.add(item);
    results.push({ item, equipped, creature, equipSlot });
  };

  const inventory = GameState.InventoryManager?.getInventory?.() || [];
  for(let i = 0; i < inventory.length; i++){
    consider(inventory[i], false);
  }

  const party = GameState.PartyManager?.party || [];
  for(let p = 0; p < party.length; p++){
    const creature = party[p];
    if(!creature) continue;
    for(let slotBit = 0; slotBit < 20; slotBit++){
      const slot = 1 << slotBit;
      const equipped = creature.GetItemInSlot?.(slot) || creature.getItemInSlot?.(slot);
      if(equipped) consider(equipped, true, creature, slot);
    }
  }

  return results;
}

export function getCategoryAvailability(): Record<UpgradeCategory, boolean> {
  const availability: Record<UpgradeCategory, boolean> = {
    [UpgradeCategory.NONE]: false,
    [UpgradeCategory.LIGHTSABER]: false,
    [UpgradeCategory.RANGED]: false,
    [UpgradeCategory.MELEE]: false,
    [UpgradeCategory.ARMOR]: false,
  };
  const items = collectUpgradableItems();
  for(let i = 0; i < items.length; i++){
    const category = getUpgradableType(items[i].item);
    if(category !== UpgradeCategory.NONE) availability[category] = true;
  }
  return availability;
}

export function getFirstAvailableCategory(availability?: Record<UpgradeCategory, boolean>): UpgradeCategory {
  const avail = availability || getCategoryAvailability();
  const order = [
    UpgradeCategory.LIGHTSABER,
    UpgradeCategory.RANGED,
    UpgradeCategory.MELEE,
    UpgradeCategory.ARMOR,
  ];
  for(let i = 0; i < order.length; i++){
    if(avail[order[i]]) return order[i];
  }
  return UpgradeCategory.NONE;
}

function saberModelColumn(item: ModuleItem): string {
  switch(item.baseItemId){
    case BaseItemType.DOUBLE_BLADED_LIGHTSABER:
      return 'doublemdlvar';
    case BaseItemType.SHORT_LIGHTSABER:
      return 'shortmdlvar';
    default:
      return 'longmdlvar';
  }
}

/** Find upcrystals row whose model variation matches the current saber template. */
export function findCrystalRowForItem(item: ModuleItem): number {
  const table = getUpcrystalsTable();
  if(!table || !item) return -1;
  const column = saberModelColumn(item);
  const tag = (item.getTag?.() || item.inventoryRes || '').toLowerCase();
  const keys = Object.keys(table.rows);
  for(let i = 0; i < keys.length; i++){
    const row = table.rows[keys[i]];
    const model = String(TwoDAObject.normalizeValue(row[column], 'string', '')).toLowerCase();
    if(model && model === tag){
      return TwoDAObject.normalizeValue(row.__index, 'number', parseInt(keys[i], 10)) as number;
    }
  }
  return -1;
}

export function getCrystalTemplate(rowIndex: number, item: ModuleItem): string {
  const table = getUpcrystalsTable();
  if(!table) return '';
  const row = table.getRowByIndex(rowIndex) || table.rows[rowIndex];
  if(!row) return '';
  const column = saberModelColumn(item);
  return String(TwoDAObject.normalizeValue(row[column], 'string', '')).toLowerCase();
}

export function getUpgradeRowTemplate(rowIndex: number): string {
  const table = getUpgradeTable();
  if(!table) return '';
  const row = table.getRowByIndex(rowIndex) || table.rows[rowIndex];
  if(!row) return '';
  return String(TwoDAObject.normalizeValue(row.template, 'string', '')).toLowerCase();
}

export function getUpgradeRowType(rowIndex: number): number {
  const table = getUpgradeTable();
  if(!table) return -1;
  const row = table.getRowByIndex(rowIndex) || table.rows[rowIndex];
  if(!row) return -1;
  return TwoDAObject.normalizeValue(row.upgradetype ?? row.UpgradeType, 'number', -1) as number;
}

export function findInventoryItemByTag(tag: string): ModuleItem | undefined {
  if(!tag) return undefined;
  const lower = tag.toLowerCase();
  const inventory = GameState.InventoryManager?.getInventory?.() || [];
  for(let i = 0; i < inventory.length; i++){
    if((inventory[i].getTag?.() || '').toLowerCase() === lower){
      return inventory[i];
    }
  }
  return undefined;
}

/**
 * Split one unit from a stacked inventory item (SplitItem).
 * Returns the reserved unit; mutates/removes the source stack.
 */
export function reserveInventoryUnit(item: ModuleItem): ModuleItem | undefined {
  if(!item) return undefined;
  const stack = item.getStackSize?.() ?? 1;
  if(stack > 1){
    const clone = item.clone();
    item.setStackSize(stack - 1);
    return clone;
  }
  GameState.InventoryManager.removeItem(item, stack);
  return item;
}

export function returnInventoryUnit(item: ModuleItem): void {
  if(!item) return;
  // Avoid merge of differently upgraded items.
  const existing = GameState.InventoryManager.getItemByTag(item.getTag?.() || '');
  if(existing && existing !== false && !canStackUpgradeItems(existing as ModuleItem, item)){
    item.setStackSize(item.getStackSize?.() || 1);
    GameState.InventoryManager.inventory.push(item);
    item.setPossessor(GameState.PartyManager.Player);
    return;
  }
  GameState.InventoryManager.addItem(item);
}

export function canStackUpgradeItems(a: ModuleItem, b: ModuleItem): boolean {
  if(!a || !b) return false;
  if((a.getTag?.() || '').toLowerCase() !== (b.getTag?.() || '').toLowerCase()) return false;
  if((a.upgrades || 0) !== (b.upgrades || 0)) return false;
  if((a.upgradeLevel || 0) !== (b.upgradeLevel || 0)) return false;
  for(let i = 0; i < 6; i++){
    if(a.getUpgradeSlot(i) !== b.getUpgradeSlot(i)) return false;
  }
  return true;
}

export function buildSessionSlots(item: ModuleItem, category: UpgradeCategory): UpgradeSessionSlot[] {
  const infos = getSlotInfos(category);
  const slots: UpgradeSessionSlot[] = [];
  const table = getUpgradeTable();

  for(let i = 0; i < infos.length; i++){
    const info = infos[i];
    let upgradeRow = -1;
    let templateTag = '';
    let component: ModuleItem | undefined;

    if(info.isCrystal){
      upgradeRow = findCrystalRowForItem(item);
    }else if(GameState.GameKey === GameEngineType.TSL){
      upgradeRow = item.getUpgradeSlot(i);
      if(upgradeRow >= 0){
        templateTag = getUpgradeRowTemplate(upgradeRow);
        component = ModuleItemFromTemplate(templateTag);
        if(component){
          // Mirror installed row onto temporary component for UI.
          component.setUpgradeSlot(i, upgradeRow);
        }
      }else if(table){
        // Prefill expected template tag for this slot type.
        templateTag = findTemplateForSlotType(info.upgradeType);
      }
    }else{
      // K1: find upgrade.2da row whose UpgradeType matches the slot and whose bit is set.
      if(table){
        const keys = Object.keys(table.rows);
        for(let r = 0; r < keys.length; r++){
          const rowIndex = TwoDAObject.normalizeValue(table.rows[keys[r]].__index, 'number', parseInt(keys[r], 10)) as number;
          const rowType = getUpgradeRowType(rowIndex);
          if(rowType !== info.upgradeType) continue;
          templateTag = getUpgradeRowTemplate(rowIndex);
          if(item.hasUpgradeBit(rowIndex)){
            upgradeRow = rowIndex;
            component = ModuleItemFromTemplate(templateTag);
            break;
          }
          if(!templateTag){
            // keep first matching template as expected tag
          }
        }
        if(upgradeRow < 0){
          templateTag = findTemplateForSlotType(info.upgradeType);
        }
      }
    }

    slots.push({
      info,
      component,
      upgradeRow,
      templateTag,
    });
  }

  return slots;
}

function findTemplateForSlotType(upgradeType: number): string {
  const table = getUpgradeTable();
  if(!table || upgradeType < 0) return '';
  const keys = Object.keys(table.rows);
  for(let i = 0; i < keys.length; i++){
    const rowIndex = TwoDAObject.normalizeValue(table.rows[keys[i]].__index, 'number', parseInt(keys[i], 10)) as number;
    if(getUpgradeRowType(rowIndex) === upgradeType){
      return getUpgradeRowTemplate(rowIndex);
    }
  }
  return '';
}

function ModuleItemFromTemplate(tag: string): ModuleItem | undefined {
  if(!tag) return undefined;
  try{
    const ModuleItemClass = GameState.Module?.ModuleArea?.ModuleItem;
    if(ModuleItemClass?.FromResRef){
      return ModuleItemClass.FromResRef(tag);
    }
  }catch(e){
    // fall through
  }
  return undefined;
}

export function listCompatibleComponents(
  item: ModuleItem,
  category: UpgradeCategory,
  slotIndex: number,
  sessionSlots: UpgradeSessionSlot[]
): UpgradeComponentChoice[] {
  const infos = getSlotInfos(category);
  const info = infos[slotIndex];
  if(!info) return [];

  const choices: UpgradeComponentChoice[] = [];
  choices.push({
    rowIndex: -1,
    isRemove: true,
    label: '',
  });

  if(info.isCrystal){
    const table = getUpcrystalsTable();
    if(!table) return choices;
    const currentTag = (item.getTag?.() || '').toLowerCase();
    const keys = Object.keys(table.rows);
    // Currently installed crystal first (CreateItemEntry with current).
    choices.push({
      item: undefined,
      rowIndex: findCrystalRowForItem(item),
      isRemove: false,
      label: item.getName?.() || currentTag,
    });
    for(let i = 0; i < keys.length; i++){
      const rowIndex = TwoDAObject.normalizeValue(table.rows[keys[i]].__index, 'number', parseInt(keys[i], 10)) as number;
      const template = String(TwoDAObject.normalizeValue(table.rows[keys[i]].template, 'string', '')).toLowerCase();
      if(!template || template === currentTag) continue;
      const inv = findInventoryItemByTag(template);
      if(!inv) continue;
      choices.push({
        item: inv,
        rowIndex,
        isRemove: false,
        label: inv.getName?.() || template,
      });
    }
    return choices;
  }

  const usedRows = new Set<number>();
  for(let i = 0; i < sessionSlots.length; i++){
    if(i === slotIndex) continue;
    if(sessionSlots[i].upgradeRow >= 0) usedRows.add(sessionSlots[i].upgradeRow);
  }

  // Currently installed component for this slot.
  if(sessionSlots[slotIndex]?.component && sessionSlots[slotIndex].upgradeRow >= 0){
    choices.push({
      item: sessionSlots[slotIndex].component,
      rowIndex: sessionSlots[slotIndex].upgradeRow,
      isRemove: false,
      label: sessionSlots[slotIndex].component.getName?.() || '',
    });
  }

  const table = getUpgradeTable();
  if(!table) return choices;
  const keys = Object.keys(table.rows);
  for(let i = 0; i < keys.length; i++){
    const rowIndex = TwoDAObject.normalizeValue(table.rows[keys[i]].__index, 'number', parseInt(keys[i], 10)) as number;
    if(getUpgradeRowType(rowIndex) !== info.upgradeType) continue;
    if(usedRows.has(rowIndex)) continue;
    if(sessionSlots[slotIndex]?.upgradeRow === rowIndex) continue;
    const template = getUpgradeRowTemplate(rowIndex);
    if(!template) continue;
    const inv = findInventoryItemByTag(template);
    if(!inv) continue;
    if(GameState.GameKey === GameEngineType.TSL){
      const componentLevel = inv.upgradeLevel || 0;
      if(componentLevel > (item.upgradeLevel || 0)) continue;
    }
    choices.push({
      item: inv,
      rowIndex,
      isRemove: false,
      label: inv.getName?.() || template,
    });
  }

  return choices;
}

export function applyUpgradeBit(item: ModuleItem, rowIndex: number, enabled: boolean): void {
  if(!item || rowIndex < 0 || rowIndex > 31) return;
  const flag = 1 << rowIndex;
  if(enabled){
    item.upgrades = (item.upgrades || 0) | flag;
  }else{
    item.upgrades = (item.upgrades || 0) & ~flag;
  }
}

export function tlk(strRef: number): string {
  if(!(strRef >= 0)) return '';
  return GameState.TLKManager?.GetStringById?.(strRef)?.Value
    || GameState.TLKManager?.TLKStrings?.[strRef]?.Value
    || '';
}
