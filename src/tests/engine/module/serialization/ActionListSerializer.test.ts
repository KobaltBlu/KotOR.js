/**
 * ActionListSerializer round-trip with injected FromStruct.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { ActionType } from '@core/enums/actions/ActionType';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';
import { ActionParameterSerializer } from '@engine/module/serialization/ActionParameterSerializer';

describe('ActionListSerializer', () => {
  function makeHost() {
    const queue: any[] = [];
    (queue as any).add = (a: any) => { queue.push(a); };
    return { actionQueue: queue as any };
  }

  function makeMoveActionStruct(): GFFStruct {
    const struct = new GFFStruct(1);
    struct.addField(new GFFField(GFFDataType.DWORD, 'ActionId')).setValue(ActionType.ActionMoveToPoint);
    struct.addField(new GFFField(GFFDataType.WORD, 'GroupActionId')).setValue(1);
    struct.addField(new GFFField(GFFDataType.WORD, 'NumParams')).setValue(1);
    const params = struct.addField(new GFFField(GFFDataType.LIST, 'Paramaters'));
    params.addChildStruct(
      ActionParameterSerializer.write(ActionParameterType.FLOAT, 3.5, undefined),
    );
    return struct;
  }

  it('deserializes ActionList via injected fromStruct', () => {
    const gff = new GFFObject();
    const list = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ActionList'));
    list.addChildStruct(makeMoveActionStruct());

    const host = makeHost();
    const seen: number[] = [];
    ActionListSerializer.deserialize(host, gff.RootNode, (struct) => {
      const id = struct.getFieldByLabel('ActionId').getValue();
      seen.push(id);
      return {
        type: id,
        toStruct: () => makeMoveActionStruct(),
      };
    });

    expect(seen).toEqual([ActionType.ActionMoveToPoint]);
    expect(host.actionQueue.length).toBe(1);
  });

  it('round-trips queue through writeField then deserialize', () => {
    const host = makeHost();
    host.actionQueue.add({
      type: ActionType.ActionMoveToPoint,
      toStruct: () => makeMoveActionStruct(),
    });

    const gff = new GFFObject();
    ActionListSerializer.writeField(gff.RootNode, host);

    const restored = makeHost();
    ActionListSerializer.deserialize(restored, gff.RootNode, (struct) => ({
      type: struct.getFieldByLabel('ActionId').getValue(),
      toStruct: () => struct,
    }));

    expect(restored.actionQueue.length).toBe(1);
    expect(restored.actionQueue[0].type).toBe(ActionType.ActionMoveToPoint);
  });

  it('ActionParameterSerializer writes DWORD Type for INT params', () => {
    const struct = ActionParameterSerializer.write(ActionParameterType.INT, 42, undefined);
    expect(struct.getFieldByLabel('Type').getValue()).toBe(ActionParameterType.INT);
    expect(struct.getFieldByLabel('Value').getValue()).toBe(42);
    const loaded = ActionParameterSerializer.read(struct);
    expect(loaded?.type).toBe(ActionParameterType.INT);
    expect(loaded?.value).toBe(42);
  });

  it('skips hydrate when queue already has entries', () => {
    const host = makeHost();
    host.actionQueue.add({ type: 1 });
    const gff = new GFFObject();
    const list = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ActionList'));
    list.addChildStruct(makeMoveActionStruct());
    ActionListSerializer.deserialize(host, gff.RootNode, () => ({ type: 99 }));
    expect(host.actionQueue.length).toBe(1);
    expect(host.actionQueue[0].type).toBe(1);
  });
});
