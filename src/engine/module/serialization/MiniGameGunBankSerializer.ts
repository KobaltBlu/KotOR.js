import type { MiniGameGunBank } from '@engine/module/MiniGameGunBank';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import { readFloat, readInt, readResRef } from '@engine/module/serialization/gffHelpers';

/**
 * MiniGame gun bank — deserialize-only.
 * Nested Bullet proto construction stays in the MiniGameGunBank facade.
 */
export class MiniGameGunBankSerializer implements GameObjectSerializer<MiniGameGunBank, any, any> {
  deserialize(target: MiniGameGunBank, source: any, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    if (root.hasField('BankID')) target.bankID = readInt(root, 'BankID');
    if (root.hasField('Fire_Sound')) {
      target.fireSound = readResRef(root, 'Fire_Sound');
      target.fire_sound = target.fireSound;
    }
    if (root.hasField('Gun_Model')) target.gunModel = readResRef(root, 'Gun_Model');
    if (root.hasField('Horiz_Spread')) target.horizSpread = readFloat(root, 'Horiz_Spread') || 0;
    if (root.hasField('Inaccuracy')) target.inaccuracy = readFloat(root, 'Inaccuracy') || 0;
    if (root.hasField('Sensing_Radius')) target.sensingRadius = readFloat(root, 'Sensing_Radius') || 0;
    if (root.hasField('Vert_Spread')) target.vertSpread = readFloat(root, 'Vert_Spread') || 0;
  }

  serialize(_source: MiniGameGunBank, _context?: SerializeContext): any {
    throw new Error('MiniGameGunBankSerializer.serialize: not implemented (no save evidence)');
  }
}

export const miniGameGunBankSerializer = new MiniGameGunBankSerializer();
