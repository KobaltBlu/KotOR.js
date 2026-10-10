import type { GFFStruct } from '@core/resource/GFFStruct';
import type { GffRoot } from '@engine/module/serialization/types';

export interface NestedItemEntry {
  /** Nested item GFF struct (UTI-shaped). */
  struct: GFFStruct;
  /** Equipment list only: armor-slot bitmask from struct.type. */
  slotType: number;
  /** Saved runtime object id, when the nested struct supplies one. */
  objectId?: number;
}

/**
 * Read nested ItemList / Equip_ItemList child structs without constructing Items.
 */
export class NestedItemListSerializer {
  static read(root: GffRoot, label: string): NestedItemEntry[] {
    if (!root.hasField(label)) return [];
    const structs = root.getFieldByLabel(label).getChildStructs?.() || [];
    const out: NestedItemEntry[] = [];
    for (let i = 0; i < structs.length; i++) {
      const struct = structs[i];
      out.push({
        struct,
        slotType: typeof struct.type === 'number' ? struct.type : 0,
        objectId: struct.hasField('ObjectId')
          ? struct.getFieldByLabel('ObjectId').getValue() >>> 0
          : undefined,
      });
    }
    return out;
  }

  static readInventory(root: GffRoot): NestedItemEntry[] {
    return NestedItemListSerializer.read(root, 'ItemList');
  }

  static readEquipment(root: GffRoot): NestedItemEntry[] {
    return NestedItemListSerializer.read(root, 'Equip_ItemList');
  }
}
