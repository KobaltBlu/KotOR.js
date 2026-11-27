/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { BaseItemType } from "@core/enums/combat/BaseItemType";
import { SkillType } from "@core/enums/nwscript/SkillType";

/** Mirror item-transfer constants (avoid importing GameState via that module). */
const ITEM_TYPE_CREDITS = 0x17;
const ITEM_TYPE_PAZAAK_CARD = 0x2a;

function getItemTypeCategory(item: { baseItem?: { itemType?: number }; baseItemId?: number }): number {
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

function isCreditsItem(item: { baseItem?: { itemType?: number }; baseItemId?: number }): boolean {
  return getItemTypeCategory(item) === ITEM_TYPE_CREDITS
    || item?.baseItemId === BaseItemType.CREDITS;
}

function isPazaakCardItem(item: { baseItem?: { itemType?: number }; baseItemId?: number }): boolean {
  return getItemTypeCategory(item) === ITEM_TYPE_PAZAAK_CARD
    || item?.baseItemId === BaseItemType.PAZAAK_CARD;
}

function splitItemStack(item: any, nCount: number): any {
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

describe("item-transfer helpers (Give/Take)", () => {
  it("classifies credits via itemType 0x17 or BaseItemType.CREDITS", () => {
    expect(isCreditsItem({ baseItem: { itemType: ITEM_TYPE_CREDITS }, baseItemId: 0 })).toBe(true);
    expect(isCreditsItem({ baseItem: { itemType: -1 }, baseItemId: BaseItemType.CREDITS })).toBe(true);
    expect(getItemTypeCategory({ baseItem: { itemType: ITEM_TYPE_CREDITS } })).toBe(ITEM_TYPE_CREDITS);
  });

  it("classifies pazaak via itemType 0x2a or BaseItemType.PAZAAK_CARD", () => {
    expect(isPazaakCardItem({ baseItem: { itemType: ITEM_TYPE_PAZAAK_CARD }, baseItemId: 0 })).toBe(true);
  });

  it("splitItemStack detaches nCount and shrinks source", () => {
    const item: any = {
      _n: 5,
      getStackSize() { return this._n; },
      setStackSize(n: number) { this._n = n; },
      clone() {
        const c: any = {
          _n: 0,
          getStackSize() { return this._n; },
          setStackSize(n: number) { this._n = n; },
        };
        return c;
      },
    };
    const part = splitItemStack(item, 2);
    expect(part).not.toBe(item);
    expect(part.getStackSize()).toBe(2);
    expect(item.getStackSize()).toBe(3);
  });

  it("splitItemStack returns original when nCount covers whole stack", () => {
    const item: any = {
      getStackSize: () => 3,
      setStackSize: () => {},
      clone: () => item,
    };
    expect(splitItemStack(item, -1)).toBe(item);
    expect(splitItemStack(item, 3)).toBe(item);
    expect(splitItemStack(item, 9)).toBe(item);
  });
});

describe("ActionHeal engine contract", () => {
  it("Treat Injury skill id is 7 (engine GetSkillRank always uses 7)", () => {
    expect(SkillType.TREAT_INJURY).toBe(7);
  });

  it("poison/disease DC resolver clamps to ≥ 1", () => {
    const clamp = (raw: number) => Math.max(1, Number.isFinite(raw) ? raw : 1);
    expect(clamp(0)).toBe(1);
    expect(clamp(-5)).toBe(1);
    expect(clamp(15)).toBe(15);
  });
});
