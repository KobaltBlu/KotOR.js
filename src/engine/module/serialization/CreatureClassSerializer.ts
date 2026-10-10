import { GFFStruct } from '@core/resource/GFFStruct';
import { CreatureClass } from '@engine/combat/CreatureClass';

export class CreatureClassSerializer {
  static deserialize(source: GFFStruct): CreatureClass {
    return CreatureClass.FromCreatureClassStruct(source);
  }

  static serialize(source: CreatureClass): GFFStruct {
    return source.save();
  }
}
