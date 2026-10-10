/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    SWRuleSet: {
      itemPropsDef: [{ hasSubType: () => false }],
      costTables: [{ name: 'iprp_costtable' }],
    },
    TwoDAManager: {
      datatables: new Map([
        ['iprp_costtable', { rows: [] }],
      ]),
    },
  },
}));

import { ItemPropertySerializer } from '@engine/module/serialization/ItemPropertySerializer';

describe('ItemPropertySerializer', () => {
  it('round-trips the item property fields and sentinel values', () => {
    const input = new GFFStruct(0);
    input.addField(new GFFField(GFFDataType.WORD, 'PropertyName')).setValue(0);
    input.addField(new GFFField(GFFDataType.WORD, 'Subtype')).setValue(7);
    input.addField(new GFFField(GFFDataType.BYTE, 'CostTable')).setValue(0);
    input.addField(new GFFField(GFFDataType.WORD, 'CostValue')).setValue(4);
    input.addField(new GFFField(GFFDataType.BYTE, 'Param1')).setValue(2);
    input.addField(new GFFField(GFFDataType.BYTE, 'Param1Value')).setValue(3);
    input.addField(new GFFField(GFFDataType.BYTE, 'ChanceAppear')).setValue(100);
    input.addField(new GFFField(GFFDataType.BYTE, 'UsesPerDay')).setValue(5);
    input.addField(new GFFField(GFFDataType.BYTE, 'Useable')).setValue(1);
    input.addField(new GFFField(GFFDataType.BYTE, 'UpgradeType')).setValue(255);

    const property = ItemPropertySerializer.deserialize(input, { upgrades: 0 } as any);
    expect(property.subType).toBe(7);
    expect(property.upgradeType).toBe(-1);

    const output = ItemPropertySerializer.serialize(property);
    expect(output.getFieldByLabel('PropertyName').getValue()).toBe(0);
    expect(output.getFieldByLabel('CostValue').getValue()).toBe(4);
    expect(output.getFieldByLabel('ChanceAppear').getValue()).toBe(100);
    expect(output.getFieldByLabel('UpgradeType').getValue()).toBe(255);
  });
});
