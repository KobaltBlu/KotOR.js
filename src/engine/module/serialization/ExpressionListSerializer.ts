import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import type { GffRoot } from '@engine/module/serialization/types';

export interface ListeningPatternDto {
  pattern: string;
  number: number;
}

/**
 * Creature ExpressionList ↔ listening-pattern DTOs.
 */
export class ExpressionListSerializer {
  static read(root: GffRoot): ListeningPatternDto[] {
    if (!root.hasField('ExpressionList')) return [];
    const structs = root.getFieldByLabel('ExpressionList').getChildStructs?.() || [];
    const out: ListeningPatternDto[] = [];
    for (let i = 0; i < structs.length; i++) {
      const s = structs[i];
      out.push({
        pattern: s.hasField('ExpressionString')
          ? String(s.getFieldByLabel('ExpressionString').getValue() ?? '')
          : '',
        number: s.hasField('ExpressionId')
          ? (s.getFieldByLabel('ExpressionId').getValue() | 0)
          : 0,
      });
    }
    return out;
  }

  static writeField(
    parent: { addField: (f: GFFField) => GFFField },
    patterns: Array<{ pattern: string; number: number }>,
  ): void {
    if (!patterns?.length) return;
    const list = parent.addField(new GFFField(GFFDataType.LIST, 'ExpressionList'));
    for (let i = 0; i < patterns.length; i++) {
      const entry = patterns[i];
      const expressionStruct = new GFFStruct(5);
      expressionStruct.addField(new GFFField(GFFDataType.INT, 'ExpressionId')).setValue(entry.number);
      expressionStruct
        .addField(new GFFField(GFFDataType.CEXOSTRING, 'ExpressionString'))
        .setValue(entry.pattern);
      list.addChildStruct(expressionStruct);
    }
  }
}
