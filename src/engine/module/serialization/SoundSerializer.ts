import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import type { Sound } from '@engine/module/Sound';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addString,
  readBoolByte,
  readByte,
  readDword,
  readFloat,
  readLocString,
  readObjectId,
  readResRef,
  readString,
} from '@engine/module/serialization/gffHelpers';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { NamedVarTableSerializer } from '@engine/module/serialization/NamedVarTableSerializer';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';

/**
 * Sound GIT/UTS serializer.
 * Evidence: Save field set omits TemplateResRef / Priority / Elevation.
 */
export class SoundSerializer implements GameObjectSerializer<Sound, GFFObject, GFFObject> {
  deserialize(target: Sound, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('LocName')) {
      const loc = readLocString(root, 'LocName');
      if (loc) target.name = loc.getValue();
    }

    if (root.hasField('Active')) target.active = readBoolByte(root, 'Active');
    if (root.hasField('Priority')) target.priority = readByte(root, 'Priority');
    if (root.hasField('Commandable')) target.commandable = readBoolByte(root, 'Commandable');
    if (root.hasField('FixedVariance')) target.fixedVariance = readFloat(root, 'FixedVariance');
    if (root.hasField('GeneratedType')) target.generatedType = readDword(root, 'GeneratedType');
    if (root.hasField('Hours')) target.hours = readDword(root, 'Hours');
    if (root.hasField('Interval')) target.interval = readDword(root, 'Interval');
    if (root.hasField('IntervalVrtn')) target.intervalVariation = readDword(root, 'IntervalVrtn');
    if (root.hasField('Looping')) target.looping = readByte(root, 'Looping');
    if (root.hasField('Continuous')) target.continuous = readBoolByte(root, 'Continuous');
    if (root.hasField('MaxDistance')) target.maxDistance = readFloat(root, 'MaxDistance');
    if (root.hasField('MinDistance')) target.minDistance = readFloat(root, 'MinDistance');
    if (root.hasField('PitchVariation')) target.pitchVariation = readFloat(root, 'PitchVariation');
    if (root.hasField('Positional')) target.positional = readBoolByte(root, 'Positional');
    if (root.hasField('Random')) target.random = readByte(root, 'Random');
    if (root.hasField('RandomPosition')) target.randomPosition = readBoolByte(root, 'RandomPosition');
    if (root.hasField('RandomRangeX')) target.randomRangeX = readFloat(root, 'RandomRangeX');
    if (root.hasField('RandomRangeY')) target.randomRangeY = readFloat(root, 'RandomRangeY');

    if (root.hasField('Sounds')) {
      const sounds = root.getFieldByLabel('Sounds').getChildStructs?.() || [];
      target.soundResRefs = [];
      for (let i = 0; i < sounds.length; i++) {
        target.soundResRefs.push(sounds[i].getFieldByLabel('Sound').getValue());
      }
    }

    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');
    if (root.hasField('TemplateResRef')) target.templateResRef = readResRef(root, 'TemplateResRef');
    if (root.hasField('Times')) target.times = readByte(root, 'Times');
    if (root.hasField('Volume')) target.volume = readByte(root, 'Volume');
    if (root.hasField('VolumeVrtn')) target.volumeVariation = readByte(root, 'VolumeVrtn');

    if (root.hasField('XPosition')) target.position.x = readFloat(root, 'XPosition');
    if (root.hasField('YPosition')) target.position.y = readFloat(root, 'YPosition');
    if (root.hasField('ZPosition')) target.position.z = readFloat(root, 'ZPosition');
    if (root.hasField('Elevation')) target.elevation = readFloat(root, 'Elevation');

    SwVarTableSerializer.deserialize(target, root, { loadByteArray: false });
    NamedVarTableSerializer.deserialize(target, root);

    target.initialized = true;
  }

  serialize(source: Sound, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTS ';
    gff.RootNode.type = 6;

    // Save field set (no TemplateResRef / Priority / Elevation).
    addString(gff.RootNode, 'Tag', source.tag);
    addByte(gff.RootNode, 'Active', source.active);
    addByte(gff.RootNode, 'Positional', source.positional);
    addByte(gff.RootNode, 'Looping', source.looping);
    addByte(gff.RootNode, 'Volume', Math.max(0, Math.min(127, source.volume | 0)));
    addByte(gff.RootNode, 'VolumeVrtn', Math.max(0, Math.min(127, source.volumeVariation | 0)));
    addByte(gff.RootNode, 'Times', source.times | 0);
    addFloat(gff.RootNode, 'PitchVariation', source.pitchVariation);
    addDword(gff.RootNode, 'Hours', source.hours);
    addDword(gff.RootNode, 'GeneratedType', source.generatedType);
    addDword(gff.RootNode, 'Interval', source.interval);
    addDword(gff.RootNode, 'IntervalVrtn', source.intervalVariation);
    addFloat(gff.RootNode, 'MinDistance', source.minDistance);
    addFloat(gff.RootNode, 'MaxDistance', source.maxDistance);
    addByte(gff.RootNode, 'Continuous', source.continuous);
    addByte(gff.RootNode, 'Random', source.random);
    addFloat(gff.RootNode, 'FixedVariance', source.fixedVariance);
    addByte(gff.RootNode, 'RandomPosition', source.randomPosition);
    addFloat(gff.RootNode, 'RandomRangeX', source.randomRangeX);
    addFloat(gff.RootNode, 'RandomRangeY', source.randomRangeY);
    addFloat(gff.RootNode, 'XPosition', source.position.x);
    addFloat(gff.RootNode, 'YPosition', source.position.y);
    addFloat(gff.RootNode, 'ZPosition', source.position.z);

    addByte(gff.RootNode, 'Commandable', source.commandable);

    ActionListSerializer.writeField(gff.RootNode, source as any);
    addDword(gff.RootNode, 'ObjectId', source.id);
    SwVarTableSerializer.writeField(gff.RootNode, source);
    NamedVarTableSerializer.writeField(gff.RootNode, source);

    const sounds = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'Sounds'));
    for (let i = 0; i < source.soundResRefs.length; i++) {
      const soundStruct = new GFFStruct();
      soundStruct.addField(new GFFField(GFFDataType.RESREF, 'Sound', source.soundResRefs[i]));
      sounds.addChildStruct(soundStruct);
    }

    return gff;
  }
}

export const soundSerializer = new SoundSerializer();
