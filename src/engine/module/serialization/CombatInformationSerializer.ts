import type { GFFStruct } from '@core/resource/GFFStruct';
import type { CombatInformation } from '@engine/combat/CombatInformation';

/** GFF adapter for a creature's nested combat information. */
export class CombatInformationSerializer {
  static serialize(source: CombatInformation, structIdx: number = 0xCAAA): GFFStruct {
    return source.toStruct(structIdx);
  }

  static deserialize(target: CombatInformation, source: GFFStruct): boolean {
    return target.fromStruct(source);
  }
}
