import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import type { GameEffect } from '@engine/effects/GameEffect';

/**
 * Serializes the shared save-game representation of a runtime effect.
 * Effect construction remains factory-owned because the concrete class depends on Type.
 */
export class GameEffectSerializer {
  static serialize(effect: GameEffect): GFFStruct {
    const effectStruct = new GFFStruct(2);
    effectStruct.addField(new GFFField(GFFDataType.DWORD64, 'Id')).setValue(effect.id);
    effectStruct.addField(new GFFField(GFFDataType.WORD, 'Type')).setValue(effect.getSaveType());
    effectStruct.addField(new GFFField(GFFDataType.WORD, 'SubType')).setValue(effect.getSubTypeUnMasked());
    effectStruct.addField(new GFFField(GFFDataType.FLOAT, 'Duration')).setValue(effect.getDuration());
    effectStruct.addField(new GFFField(GFFDataType.BYTE, 'SkipOnLoad')).setValue(effect.skipOnLoad ? 1 : 0);
    effectStruct.addField(new GFFField(GFFDataType.DWORD, 'ExpireDay')).setValue(effect.getExpireDay());
    effectStruct.addField(new GFFField(GFFDataType.DWORD, 'ExpireTime')).setValue(effect.getExpireTime());
    effectStruct.addField(new GFFField(GFFDataType.DWORD, 'CreatorId')).setValue(
      typeof effect.creator === 'object' ? effect.creator.id : GameObjectConstant.OBJECT_INVALID,
    );
    effectStruct.addField(new GFFField(GFFDataType.DWORD, 'SpellId')).setValue(
      effect.getSpellId() >= 0 ? effect.getSpellId() : 0xFFFFFFFF,
    );
    effectStruct.addField(new GFFField(GFFDataType.INT, 'IsExposed')).setValue(effect.isExposed ? 1 : 0);

    const numIntegers = (effect.numIntegers | 0) > 0 ? (effect.numIntegers | 0) : 8;
    effectStruct.addField(new GFFField(GFFDataType.INT, 'NumIntegers')).setValue(numIntegers);

    if (numIntegers > 0) {
      const intList = effectStruct.addField(new GFFField(GFFDataType.LIST, 'IntList'));
      for (let i = 0; i < numIntegers; i++) {
        const intStruct = new GFFStruct(3);
        intStruct.addField(new GFFField(GFFDataType.INT, 'Value')).setValue(effect.getInt(i) || 0);
        intList.addChildStruct(intStruct);
      }
    }

    const floatList = effectStruct.addField(new GFFField(GFFDataType.LIST, 'FloatList'));
    for (let i = 0; i < 4; i++) {
      const floatStruct = new GFFStruct(4);
      floatStruct.addField(new GFFField(GFFDataType.FLOAT, 'Value')).setValue(effect.getFloat(i) || 0.0);
      floatList.addChildStruct(floatStruct);
    }

    const stringList = effectStruct.addField(new GFFField(GFFDataType.LIST, 'StringList'));
    for (let i = 0; i < 6; i++) {
      const stringStruct = new GFFStruct(5);
      stringStruct.addField(new GFFField(GFFDataType.CEXOSTRING, 'Value')).setValue(effect.getString(i) || '');
      stringList.addChildStruct(stringStruct);
    }

    const objectList = effectStruct.addField(new GFFField(GFFDataType.LIST, 'ObjectList'));
    for (let i = 0; i < 4; i++) {
      const objectStruct = new GFFStruct(6);
      const object = effect.getObject(i);
      const objectId = object && typeof object === 'object' ? (object.id | 0) : 0;
      objectStruct.addField(new GFFField(GFFDataType.DWORD, 'Value')).setValue(
        objectId || GameObjectConstant.OBJECT_INVALID,
      );
      objectList.addChildStruct(objectStruct);
    }

    return effectStruct;
  }
}
