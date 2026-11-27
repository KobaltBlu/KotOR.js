import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { GFFStruct } from '@core/resource/GFFStruct';
import type { GameEffect } from '@engine/effects/GameEffect';
import { GameEffectSerializer } from '@engine/module/serialization/GameEffectSerializer';
import type { DeserializeContext, GffRoot } from '@engine/module/serialization/types';

export interface EffectListHost {
  effects: GameEffect[];
}

/**
 * EffectList LIST field. Concrete effect construction is injected so this
 * serializer remains independent of GameState and GameEffectFactory.
 */
export class EffectListSerializer {
  static writeField(
    parent: { addField: (field: GFFField) => GFFField },
    effects: GameEffect[],
  ): GFFField {
    const effectList = parent.addField(new GFFField(GFFDataType.LIST, 'EffectList'));
    for (let i = 0; i < effects.length; i++) {
      if (!effects[i]) continue;
      effectList.addChildStruct(GameEffectSerializer.serialize(effects[i]));
    }
    return effectList;
  }

  static deserialize(
    target: EffectListHost,
    root: GffRoot,
    effectFromStruct: (struct: GFFStruct) => GameEffect | undefined,
  ): void {
    if (!root.hasField('EffectList')) return;
    const effectStructs = root.getFieldByLabel('EffectList').getChildStructs?.() || [];
    for (let i = 0; i < effectStructs.length; i++) {
      const effect = effectFromStruct(effectStructs[i]);
      if (effect) target.effects.push(effect);
    }
  }

  static deserializeFromContext(
    target: EffectListHost,
    root: GffRoot,
    context?: DeserializeContext,
  ): void {
    if (!context?.effectFromStruct) return;
    EffectListSerializer.deserialize(target, root, context.effectFromStruct);
  }
}
