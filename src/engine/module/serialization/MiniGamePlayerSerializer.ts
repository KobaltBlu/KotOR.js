import type { MiniGamePlayer } from '@engine/module/MiniGamePlayer';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import { readFloat, readInt, readString } from '@engine/module/serialization/gffHelpers';
import { MiniGameTrack } from '@engine/module/MiniGameTrack';

/**
 * MiniGame player — deserialize-only.
 * Nested Models / Gun_Banks / Sounds / Scripts / tunnel helpers stay in the facade.
 */
export class MiniGamePlayerSerializer implements GameObjectSerializer<MiniGamePlayer, any, any> {
  deserialize(target: MiniGamePlayer, source: any, _context?: DeserializeContext): void {
    const root = gffRootOf(source);

    if (root.hasField('Accel_Secs')) target.accel_secs = readFloat(root, 'Accel_Secs');
    if (root.hasField('Bump_Damage')) target.bump_damage = readFloat(root, 'Bump_Damage');
    if (root.hasField('Camera')) target.cameraName = readString(root, 'Camera');
    if (root.hasField('CameraRotate')) target.cameraRotate = readFloat(root, 'CameraRotate');
    if (root.hasField('Hit_Points')) target.hit_points = readFloat(root, 'Hit_Points');
    if (root.hasField('Invince_Period')) target.invince_period = readFloat(root, 'Invince_Period');
    if (root.hasField('Max_HPs')) target.max_hps = readFloat(root, 'Max_HPs');
    if (root.hasField('Maximum_Speed')) target.speed_max = readFloat(root, 'Maximum_Speed');
    if (root.hasField('Minimum_Speed')) target.speed_min = readFloat(root, 'Minimum_Speed');
    if (root.hasField('Num_Loops')) target.num_loops = readInt(root, 'Num_Loops');
    if (root.hasField('Sphere_Radius')) target.sphere_radius = readFloat(root, 'Sphere_Radius');
    if (root.hasField('Track')) {
      target.trackName = MiniGameTrack.normalizeName(readString(root, 'Track'));
    }

    if (root.hasField('TunnelXNeg')) target.tunnel.neg.x = readFloat(root, 'TunnelXNeg');
    if (root.hasField('TunnelXPos')) target.tunnel.pos.x = readFloat(root, 'TunnelXPos');
    else if (root.hasField('TunneXPos')) target.tunnel.pos.x = readFloat(root, 'TunneXPos');
    if (root.hasField('TunnelYNeg')) target.tunnel.neg.y = readFloat(root, 'TunnelYNeg');
    if (root.hasField('TunnelYPos')) target.tunnel.pos.y = readFloat(root, 'TunnelYPos');
    if (root.hasField('TunnelZNeg')) target.tunnel.neg.z = readFloat(root, 'TunnelZNeg');
    else if (root.hasField('TunneZNeg')) target.tunnel.neg.z = readFloat(root, 'TunneZNeg');
    if (root.hasField('TunnelZPos')) target.tunnel.pos.z = readFloat(root, 'TunnelZPos');

  }

  serialize(_source: MiniGamePlayer, _context?: SerializeContext): any {
    throw new Error('MiniGamePlayerSerializer.serialize: not implemented (no save evidence)');
  }
}

export const miniGamePlayerSerializer = new MiniGamePlayerSerializer();
