import type { ItemProperty } from "@engine/items/ItemProperty";
import { ModuleItemProperty } from "@core/enums/module/ModuleItemProperty";

/**
 * GetUsedActivePropertyUsesLeft
 * DecrementUses.
 *
 * @file item-property-uses.ts
 */

/** Cost values that never fail the item-cast action uses gate (7 / 0xD). */
export const ITEM_CAST_UNLIMITED_COST_VALUES = new Set([7, 0xd]);

/** Charge burn amounts for cost_value 2–6. */
const CHARGE_COST_BURN: Record<number, number> = {
  2: 5,
  3: 4,
  4: 3,
  5: 2,
  6: 1,
};

export function isUnlimitedCastSpellCostValue(costValue: number | undefined): boolean {
  return ITEM_CAST_UNLIMITED_COST_VALUES.has(costValue | 0);
}

/**
 * Remaining uses for a CastSpell active property, or 0 when unusable / empty.
 */
export function getUsedActivePropertyUsesLeft(
  property: ItemProperty | undefined,
  charges: number,
  stackSize: number
): number {
  if(!property || property.propertyName !== ModuleItemProperty.CastSpell){
    return 0;
  }
  if(!property.isUseable?.()){
    return 0;
  }

  const cost = property.costValue | 0;
  const ch = charges | 0;
  const stack = stackSize | 0;

  switch(cost){
    case 1:
      return stack & 0xff;
    case 2:
      return ch > 0 ? Math.floor(ch / 5) : 0;
    case 3:
      return ch > 0 ? Math.floor(ch / 4) : 0;
    case 4:
      return ch > 0 ? Math.floor(ch / 3) : 0;
    case 5:
      return ch > 0 ? Math.floor(ch / 2) : 0;
    case 6:
      return ch > 0 ? ch : 0;
    case 7:
    case 0xd:
      return 0;
    case 8:
    case 9:
    case 10:
    case 0xb:
    case 0xc:
      return (property.usesPerDay | 0) !== 0 ? (property.usesPerDay | 0) : 0;
    case 0xe:
    case 0xf:
    case 0x10:
    case 0x11:
    case 0x12:
      return 1;
    default:
      return 0;
  }
}

/**
 * Whether item-cast action should abort with SendFeedbackMessage(0x17).
 */
export function shouldFailItemCastForNoUses(
  property: ItemProperty | undefined,
  charges: number,
  stackSize: number
): boolean {
  if(!property) return true;
  if(isUnlimitedCastSpellCostValue(property.costValue)){
    return false;
  }
  return getUsedActivePropertyUsesLeft(property, charges, stackSize) === 0;
}

export type DecrementUsesInput = {
  costValue: number;
  charges: number;
  stackSize: number;
  usesPerDay: number;
  useable: number;
  itemType?: number;
};

export type DecrementUsesResult = {
  charges: number;
  stackSize: number;
  usesPerDay: number;
  useable: number;
  /** Remove the item from inventory (stack emptied / exhausted). */
  destroyItem: boolean;
};

/**
 * DecrementUses cost_value switch — pure state transform.
 */
export function applyDecrementUses(input: DecrementUsesInput): DecrementUsesResult {
  let charges = input.charges | 0;
  let stackSize = input.stackSize | 0;
  let usesPerDay = input.usesPerDay | 0;
  let useable = input.useable;
  // Missing Useable field → treat as useable (1)
  if(useable == null || (useable as any) === undefined){
    useable = 1;
  }else{
    useable = useable | 0;
  }
  const cost = input.costValue | 0;
  let destroyItem = false;
  let chargeBurn = false;
  let skipDestroy = false;

  switch(cost){
    case 1:
      if(stackSize < 2){
        useable = 0;
        destroyItem = true;
      }else{
        stackSize -= 1;
      }
      break;
    case 2:
    case 3:
    case 4:
    case 5:
    case 6: {
      const burn = CHARGE_COST_BURN[cost] || 1;
      chargeBurn = true;
      if(charges >= burn){
        charges -= burn;
      }
      if(charges < burn){
        useable = 0;
      }
      break;
    }
    case 8:
    case 9:
    case 10:
    case 0xb:
    case 0xc:
      skipDestroy = true;
      if(usesPerDay !== 0){
        usesPerDay -= 1;
      }
      if(usesPerDay === 0){
        useable = 0;
      }
      break;
    case 0xe:
    case 0xf:
    case 0x10:
    case 0x11:
    case 0x12:
      skipDestroy = true;
      useable = 0;
      break;
    default:
      break;
  }

  // destroy path: stack-empty (bVar4) or charge-exhausted with
  // usable==0 (and not uses-per-day / timed props which set skipDestroy).
  // Medical item types only skip the "scan remaining charge props" branch —
  // they still destroy when usable==0 and !bVar5.
  if(!skipDestroy && (destroyItem || (useable === 0 && chargeBurn))){
    destroyItem = true;
  }

  return { charges, stackSize, usesPerDay, useable, destroyItem };
}

/**
 * AddItemCastSpellActions visibility gate (non-party creatures).
 * Fail when no perception entry, HEARD-only (flags&0xC)==4, or invisible & !SEEN.
 */
export function canTargetItemCastByPerception(
  perceptionFlags: number | undefined,
  opts: { isPartyOrPlayerUI?: boolean; isSelf?: boolean } = {}
): boolean {
  if(opts.isSelf) return true;
  if(opts.isPartyOrPlayerUI) return true;
  if(perceptionFlags == null) return false;
  const flags = perceptionFlags | 0;
  if((flags & 0xc) === 4) return false;
  if((flags & 0x10) !== 0 && (flags & 1) === 0) return false;
  return true;
}
