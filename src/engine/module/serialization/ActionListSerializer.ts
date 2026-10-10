import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { GFFStruct } from '@core/resource/GFFStruct';
import type { DeserializeContext, GffRoot } from '@engine/module/serialization/types';

export interface ActionListHost {
  actionQueue: {
    length: number;
    add: (action: any) => void;
    [index: number]: { toStruct?: () => GFFStruct } | undefined;
  };
}

/**
 * ActionList LIST field. Deserialization requires an injected FromStruct converter
 * so serializers stay free of GameState/ActionFactory imports.
 */
export class ActionListSerializer {
  static deserialize(
    target: ActionListHost,
    root: GffRoot,
    fromStruct: (struct: GFFStruct) => any | undefined,
  ): void {
    if (target.actionQueue.length) return;
    if (!root.hasField('ActionList')) return;
    const actionStructs = root.getFieldByLabel('ActionList').getChildStructs?.() || [];
    for (let i = 0; i < actionStructs.length; i++) {
      const action = fromStruct(actionStructs[i]);
      if (action) target.actionQueue.add(action);
    }
  }

  /** Hydrate ActionList when DeserializeContext.actionFromStruct is provided. */
  static deserializeFromContext(
    target: ActionListHost,
    root: GffRoot,
    context?: DeserializeContext,
  ): void {
    if (!context?.actionFromStruct) return;
    ActionListSerializer.deserialize(target, root, context.actionFromStruct);
  }

  static writeField(parent: { addField: (f: GFFField) => GFFField }, source: ActionListHost): GFFField {
    const actionList = parent.addField(new GFFField(GFFDataType.LIST, 'ActionList'));
    for (let i = 0, len = source.actionQueue.length; i < len; i++) {
      const action = source.actionQueue[i];
      if (!action?.toStruct) continue;
      actionList.addChildStruct(action.toStruct());
    }
    return actionList;
  }
}
