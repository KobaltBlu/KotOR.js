import type { GffRoot } from '@engine/module/serialization/types';
import { readByte } from '@engine/module/serialization/gffHelpers';

export interface ItemInstanceOverlayFlags {
  hadDropable: boolean;
  dropable: number;
  hadPickpocketable: boolean;
  pickpocketable: number;
}

/**
 * Instance-only Dropable / Pickpocketable overlay for nested equip/inventory
 * structs. Captured before UTI merge so instance flags can be re-applied.
 */
export class ItemInstanceOverlay {
  static capture(root: GffRoot): ItemInstanceOverlayFlags {
    const hadDropable = root.hasField('Dropable');
    const hadPickpocketable = root.hasField('Pickpocketable');
    return {
      hadDropable,
      dropable: hadDropable ? readByte(root, 'Dropable') : 0,
      hadPickpocketable,
      pickpocketable: hadPickpocketable ? readByte(root, 'Pickpocketable') : 0,
    };
  }

  static apply(
    target: { dropable?: number; pickpocketable?: number },
    flags: ItemInstanceOverlayFlags,
  ): void {
    if (flags.hadDropable) target.dropable = flags.dropable;
    if (flags.hadPickpocketable) target.pickpocketable = flags.pickpocketable;
  }
}
