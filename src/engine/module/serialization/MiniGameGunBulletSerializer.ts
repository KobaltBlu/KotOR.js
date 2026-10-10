import type { MiniGameGunBullet } from '@engine/module/MiniGameGunBullet';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import { readFloat, readResRef, readString } from '@engine/module/serialization/gffHelpers';

/**
 * MiniGame gun bullet — deserialize-only (no save evidence in module GIT dumps).
 */
export class MiniGameGunBulletSerializer implements GameObjectSerializer<MiniGameGunBullet, any, any> {
  deserialize(target: MiniGameGunBullet, source: any, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    if (root.hasField('Bullet_Model')) target.model_name = readResRef(root, 'Bullet_Model');
    if (root.hasField('Collision_Sound')) target.collision_sound = readResRef(root, 'Collision_Sound');
    if (root.hasField('Damage')) target.damage_amt = readFloat(root, 'Damage');
    if (root.hasField('Lifespan')) target.lifespan = readFloat(root, 'Lifespan');
    if (root.hasField('Rate_Of_Fire')) target.rate_of_fire = readFloat(root, 'Rate_Of_Fire');
    if (root.hasField('Speed')) target.speed = readFloat(root, 'Speed');
    if (root.hasField('Target_Type')) target.target_type = readFloat(root, 'Target_Type') as any;
  }

  serialize(_source: MiniGameGunBullet, _context?: SerializeContext): any {
    throw new Error('MiniGameGunBulletSerializer.serialize: not implemented (no save evidence)');
  }
}

export const miniGameGunBulletSerializer = new MiniGameGunBulletSerializer();
