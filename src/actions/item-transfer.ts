import { BaseItemType } from "@/enums/combat/BaseItemType";
import { UIIconTimerType } from "@/enums/engine/UIIconTimerType";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";

/**
 * baseitems.2da itemtype values used by give-item action.
 * CREDITS → RemoveGold path; PAZAAK_CARD → RemovePazaakCard.
 */
export const ITEM_TYPE_CREDITS = 0x17;
export const ITEM_TYPE_PAZAAK_CARD = 0x2a;

/** UpdateStatus ids from Give/Take. */
export const UPDATE_STATUS_ITEM_GIVEN = 7;
export const UPDATE_STATUS_ITEM_TAKEN = 8;

export function getItemTypeCategory(item: ModuleItem): number {
  const from2da = item?.baseItem?.itemType;
  if (typeof from2da === "number" && from2da >= 0) {
    return from2da | 0;
  }
  if (item?.baseItemId === BaseItemType.CREDITS) {
    return ITEM_TYPE_CREDITS;
  }
  if (item?.baseItemId === BaseItemType.PAZAAK_CARD) {
    return ITEM_TYPE_PAZAAK_CARD;
  }
  return -1;
}

export function isCreditsItem(item: ModuleItem): boolean {
  return getItemTypeCategory(item) === ITEM_TYPE_CREDITS
    || item?.baseItemId === BaseItemType.CREDITS;
}

export function isPazaakCardItem(item: ModuleItem): boolean {
  return getItemTypeCategory(item) === ITEM_TYPE_PAZAAK_CARD
    || item?.baseItemId === BaseItemType.PAZAAK_CARD;
}

export function isPartyCreature(obj: ModuleObject | undefined): boolean {
  if (!BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)) {
    return false;
  }
  const cre = obj as ModuleCreature;
  return !!(cre.isPartyMember?.() || cre.isPC || GameState.PartyManager.party.indexOf(cre) >= 0);
}

/**
 * SplitItem — detach nCount from a stack.
 * nCount ≤ 0 or ≥ stack → returns the original item (no split).
 */
export function splitItemStack(item: ModuleItem, nCount: number): ModuleItem {
  if (!item) {
    return item;
  }
  const stack = item.getStackSize?.() ?? 1;
  const count = nCount | 0;
  if (count <= 0 || count >= stack) {
    return item;
  }
  const clone = item.clone();
  clone.setStackSize(count);
  item.setStackSize(stack - count);
  return clone;
}

function removeGoldFromOwner(owner: ModuleObject, amount: number): void {
  const n = Math.max(0, amount | 0);
  if (!n) {
    return;
  }
  if (isPartyCreature(owner)) {
    GameState.PartyManager.AddGold(-n);
  }
}

function addGoldToOwner(owner: ModuleObject, amount: number): void {
  const n = Math.max(0, amount | 0);
  if (!n) {
    return;
  }
  if (isPartyCreature(owner)) {
    GameState.PartyManager.AddGold(n);
  }
}

/**
 * Best-effort RemovePazaakCard — decrement first matching deck count > 0.
 */
export function removePazaakCardFromParty(): void {
  const cards = GameState.PazaakManager?.Cards;
  if (!cards) {
    return;
  }
  for (const [key, entry] of cards) {
    if (entry && (entry.count | 0) > 0) {
      entry.count = (entry.count | 0) - 1;
      cards.set(key, entry);
      return;
    }
  }
}

export function showGiveTakeStatus(updateStatusId: number): void {
  const mgr = GameState.UINotificationManager;
  if (!mgr?.EnableUINotificationIconType) {
    return;
  }
  if (updateStatusId === UPDATE_STATUS_ITEM_GIVEN) {
    mgr.EnableUINotificationIconType(UIIconTimerType.ITEM_RECEIVED);
  } else if (updateStatusId === UPDATE_STATUS_ITEM_TAKEN) {
    mgr.EnableUINotificationIconType(UIIconTimerType.ITEM_LOST);
  }
}

/**
 * Move possession of `item` onto `target` (creature / placeable / container item).
 * Mirrors AcquireItem success path used by Give/Take.
 */
export function acquireItem(
  target: ModuleObject,
  item: ModuleItem,
  options: {
    addAsItem?: boolean;
    displayStatus?: boolean;
    statusId?: number;
    /** Previous possessor (GetModuleItemAcquiredFrom). */
    from?: ModuleObject;
  } = {},
): boolean {
  if (!target || !item) {
    return false;
  }

  const addAsItem = options.addAsItem !== false;
  const from = options.from;

  if (!addAsItem && isCreditsItem(item)) {
    const amount = item.getStackSize?.() ?? 1;
    addGoldToOwner(target, amount);
    if (options.displayStatus && isPartyCreature(target)) {
      showGiveTakeStatus(options.statusId ?? UPDATE_STATUS_ITEM_GIVEN);
      GameState.UINotificationManager?.EnableUINotificationIconType?.(
        UIIconTimerType.CREDITS_RECEIVED,
      );
    }
    notifyModuleItemAcquired(item, from);
    return true;
  }

  if (isPartyCreature(target)) {
    GameState.InventoryManager.addItem(item);
  } else if (
    BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature) ||
    BitWise.InstanceOfObject(target, ModuleObjectType.ModulePlaceable) ||
    BitWise.InstanceOfObject(target, ModuleObjectType.ModuleStore)
  ) {
    target.addItem(item);
  } else if (
    BitWise.InstanceOfObject(target, ModuleObjectType.ModuleItem) &&
    (target as ModuleItem).baseItem?.container
  ) {
    (target as ModuleObject).addItem(item);
  } else {
    return false;
  }

  if (options.displayStatus && isPartyCreature(target)) {
    showGiveTakeStatus(options.statusId ?? UPDATE_STATUS_ITEM_GIVEN);
  }
  notifyModuleItemAcquired(item, from);
  return true;
}

function notifyModuleItemAcquired(item: ModuleItem, from?: ModuleObject){
  const mod = GameState.module;
  if(!mod) return;
  mod.lastItemAcquired = item;
  mod.lastItemAcquiredFrom = from;
  const script = mod.scripts?.[ModuleObjectScript.ModuleOnPlayerAcquireItem];
  if(script){
    const instance = script.newInstance?.() ?? script;
    instance.run(mod.area ?? mod, 0);
  }
}

function notifyModuleItemLost(item: ModuleItem, owner: ModuleObject){
  const mod = GameState.module;
  if(!mod) return;
  mod.lastItemLost = item;
  mod.lastItemLostBy = BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature)
    ? (owner as ModuleCreature)
    : undefined;
  const script = mod.scripts?.[ModuleObjectScript.ModuleOnUnAcquireItem];
  if(script){
    const instance = script.newInstance?.() ?? script;
    instance.run(mod.area ?? mod, 0);
  }
}

/**
 * Detach item from current possessor / party inventory before AcquireItem.
 * Credits: RemoveGold. Pazaak: RemovePazaakCard. Else removeItem / InventoryManager.
 */
export function releaseItemFromOwner(
  owner: ModuleObject,
  item: ModuleItem,
  nCount: number = -1,
): ModuleItem | undefined {
  if (!owner || !item) {
    return undefined;
  }

  if (isCreditsItem(item)) {
    const amount = nCount > 0 ? nCount : (item.getStackSize?.() ?? 1);
    removeGoldFromOwner(owner, amount);
    const payload = item.clone?.() ?? item;
    payload.setStackSize?.(amount);
    notifyModuleItemLost(payload, owner);
    return payload;
  }

  if (isPazaakCardItem(item) && isPartyCreature(owner)) {
    removePazaakCardFromParty();
  }

  const count = nCount > 0 ? nCount : (item.getStackSize?.() ?? 1);

  if (isPartyCreature(owner)) {
    const split = nCount > 0 ? splitItemStack(item, nCount) : item;
    if (split === item) {
      GameState.InventoryManager.removeItem(item, count);
      notifyModuleItemLost(item, owner);
      return item;
    }
    notifyModuleItemLost(split, owner);
    return split;
  }

  if (nCount > 0 && nCount < (item.getStackSize?.() ?? 1)) {
    const split = splitItemStack(item, nCount);
    notifyModuleItemLost(split, owner);
    return split;
  }

  const removed = owner.removeItem(item, count);
  const lost = removed ?? item;
  notifyModuleItemLost(lost, owner);
  return lost;
}
