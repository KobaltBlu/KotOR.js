import type { GFFStruct } from '@core/resource/GFFStruct';
import type { CombatAttackData } from '@engine/combat/CombatAttackData';

/** GFF adapter for combat attack data nested in a combat round. */
export class CombatAttackDataSerializer {
  static serialize(source: CombatAttackData, structIdx: number = 0xAAEE): GFFStruct {
    return source.toStruct(structIdx);
  }

  static deserialize(target: CombatAttackData, source: GFFStruct): void {
    target.fromStruct(source);
  }
}
