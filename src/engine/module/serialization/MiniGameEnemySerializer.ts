import type { MiniGameEnemy } from '@engine/module/minigame/MiniGameEnemy';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  readBoolByte,
  readFloat,
  readInt,
  readResRef,
  readString,
} from '@engine/module/serialization/gffHelpers';
import { MiniGameTrack } from '@engine/module/minigame/MiniGameTrack';

/**
 * MiniGame enemy — deserialize-only.
 * Nested Models / Gun_Banks / Sounds / Scripts stay in the MiniGameEnemy facade.
 */
export class MiniGameEnemySerializer implements GameObjectSerializer<MiniGameEnemy, any, any> {
  deserialize(target: MiniGameEnemy, source: any, _context?: DeserializeContext): void {
    const root = gffRootOf(source);

    if (root.hasField('Accel_Secs')) target.accel_secs = readFloat(root, 'Accel_Secs');
    if (root.hasField('Bump_Damage')) target.bump_damage = readFloat(root, 'Bump_Damage');
    if (root.hasField('Camera')) target.cameraName = readString(root, 'Camera');
    if (root.hasField('CameraRotate')) target.cameraRotate = readFloat(root, 'CameraRotate');
    if (root.hasField('Hit_Points')) target.hit_points = readFloat(root, 'Hit_Points');
    if (root.hasField('Invince_Period')) target.invince_period = readFloat(root, 'Invince_Period');
    if (root.hasField('Max_HPs')) target.max_hps = readFloat(root, 'Max_HPs');
    if (root.hasField('Maximum_Speed')) target.maximum_speed = readFloat(root, 'Maximum_Speed');
    if (root.hasField('Minimum_Speed')) target.minimum_speed = readFloat(root, 'Minimum_Speed');
    if (root.hasField('Num_Loops')) target.num_loops = readInt(root, 'Num_Loops');
    if (root.hasField('Sphere_Radius')) target.sphere_radius = readFloat(root, 'Sphere_Radius');
    if (root.hasField('Track')) {
      target.trackName = MiniGameTrack.normalizeName(readString(root, 'Track'));
    }
    if (root.hasField('Trigger')) target.isTrigger = readBoolByte(root, 'Trigger');

  }

  serialize(_source: MiniGameEnemy, _context?: SerializeContext): any {
    throw new Error('MiniGameEnemySerializer.serialize: not implemented (no save evidence)');
  }
}

export const miniGameEnemySerializer = new MiniGameEnemySerializer();
