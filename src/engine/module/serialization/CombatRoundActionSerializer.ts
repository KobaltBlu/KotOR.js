import type { GFFStruct } from '@core/resource/GFFStruct';
import type { CombatRoundAction } from '@engine/combat/CombatRoundAction';
import type { GameObject } from '@engine/module/GameObject';

/** GFF adapter for actions scheduled within a combat round. */
export class CombatRoundActionSerializer {
  static serialize(source: CombatRoundAction, structIdx: number = 0xDAEA): GFFStruct {
    return source.toStruct(structIdx);
  }

  static deserialize(
    target: CombatRoundAction,
    source: GFFStruct,
    owner?: GameObject,
  ): void {
    target.fromStruct(source, owner);
  }
}
