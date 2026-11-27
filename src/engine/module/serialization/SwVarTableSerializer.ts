import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import type { GffRoot } from '@engine/module/serialization/types';

/** Minimal surface needed to hydrate / emit SWVarTable locals. */
export interface SwVarTableHost {
  getLocalBoolean: (index: number) => boolean;
  setLocalBoolean?: (index: number, value: boolean) => void;
  getLocalNumber: (index: number) => number;
  setLocalNumber: (index: number, value: number) => void;
  _locals?: { Booleans: any[]; Numbers: Record<number, number> };
}

/**
 * SWVarTable BitArray (3×DWORD) + ByteArray (8×BYTE) — shared by most GIT objects.
 */
export class SwVarTableSerializer {
  static deserialize(target: SwVarTableHost, root: GffRoot, options?: { loadByteArray?: boolean }): void {
    if (!root.hasField('SWVarTable')) return;
    const swVarTableStruct = root.getFieldByLabel('SWVarTable').getChildStructs?.()?.[0];
    if (!swVarTableStruct) return;

    if (swVarTableStruct.hasField('BitArray')) {
      const localBools = swVarTableStruct.getFieldByLabel('BitArray').getChildStructs();
      for (let i = 0; i < localBools.length; i++) {
        const data = localBools[i].getFieldByLabel('Variable').getValue();
        for (let bit = 0; bit < 32; bit++) {
          const value = (data >> bit) % 2 !== 0;
          if (typeof target.setLocalBoolean === 'function') {
            target.setLocalBoolean(bit + i * 32, value);
          } else if (target._locals) {
            target._locals.Booleans[bit + i * 32] = value;
          }
        }
      }
    }

    const loadByteArray = options?.loadByteArray !== false;
    if (loadByteArray && swVarTableStruct.hasField('ByteArray')) {
      const localNumbers = swVarTableStruct.getFieldByLabel('ByteArray').getChildStructs();
      for (let i = 0; i < localNumbers.length; i++) {
        const data = localNumbers[i].getFieldByLabel('Variable').getValue();
        target.setLocalNumber(i, data);
      }
    }
  }

  static serialize(source: SwVarTableHost): GFFStruct {
    const swVarTableStruct = new GFFStruct();
    const swVarTableBitArray = swVarTableStruct.addField(new GFFField(GFFDataType.LIST, 'BitArray'));

    for (let i = 0; i < 3; i++) {
      const varStruct = new GFFStruct();
      let value = 0;
      const offset = 32 * i;
      for (let j = 0; j < 32; j++) {
        if (source.getLocalBoolean(offset + j) === true) {
          value |= 1 << j;
        }
      }
      value = value >>> 0;
      varStruct.addField(new GFFField(GFFDataType.DWORD, 'Variable')).setValue(value);
      swVarTableBitArray.addChildStruct(varStruct);
    }

    const swVarTableByteArray = swVarTableStruct.addField(new GFFField(GFFDataType.LIST, 'ByteArray'));
    for (let i = 0; i < 8; i++) {
      const varStruct = new GFFStruct();
      varStruct.addField(new GFFField(GFFDataType.BYTE, 'Variable')).setValue(Number(source.getLocalNumber(i)));
      swVarTableByteArray.addChildStruct(varStruct);
    }
    return swVarTableStruct;
  }

  static writeField(parent: { addField: (f: GFFField) => GFFField }, source: SwVarTableHost): void {
    const field = parent.addField(new GFFField(GFFDataType.STRUCT, 'SWVarTable'));
    field.addChildStruct(SwVarTableSerializer.serialize(source));
  }
}
