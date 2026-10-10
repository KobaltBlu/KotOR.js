import type { GFFStruct } from '@core/resource/GFFStruct';
import type { CombatRound } from '@engine/combat/CombatRound';

/** GFF adapter for a creature's nested combat-round state. */
export class CombatRoundSerializer {
  static serialize(source: CombatRound, structIdx: number = 0xCADA): GFFStruct {
    return source.toStruct(structIdx);
  }

  static deserialize(target: CombatRound, source: GFFStruct): boolean {
    return target.fromStruct(source);
  }
}
