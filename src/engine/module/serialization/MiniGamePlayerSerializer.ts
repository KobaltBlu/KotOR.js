import type { MiniGamePlayer } from '@engine/module/minigame/MiniGamePlayer';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import { readFloat, readInt, readString } from '@engine/module/serialization/gffHelpers';
import { MiniGameTrack } from '@engine/module/minigame/MiniGameTrack';

/**
 * MiniGame player — deserialize-only.
 * Nested Models / Gun_Banks / Sounds / Scripts / tunnel helpers stay in the facade.
 */
export class MiniGamePlayerSerializer implements GameObjectSerializer<MiniGamePlayer, any, any> {
  /**
   * Retail acceleration derivation; `undefined` = leave the current value.
   */
  static deriveAcceleration(minRaw: number, maxRaw: number, accelSecs: number): number | undefined {
    let accel: number;
    if (accelSecs === 0) {
      accel = maxRaw - minRaw;
    } else if (accelSecs > 0) {
      accel = (maxRaw - minRaw) / accelSecs;
    } else {
      return undefined;
    }
    return accel >= 0 ? accel : undefined;
  }

  deserialize(target: MiniGamePlayer, source: any, _context?: DeserializeContext): void {
    const root = gffRootOf(source);

    // CSWMiniPlayer::Load (0x006702f0): Minimum_Speed (default −1, kept only if ≥ 0),
    // Maximum_Speed (default 100, kept if ≥ 0); acceleration =
    // (max − min) / Accel_Secs, or (max − min) when Accel_Secs == 0; Accel_Secs < 0 or
    // missing leaves acceleration unchanged. `min`/`max` here are the raw reads.
    const minRaw = root.hasField('Minimum_Speed') ? readFloat(root, 'Minimum_Speed') : -1;
    const maxRaw = root.hasField('Maximum_Speed') ? readFloat(root, 'Maximum_Speed') : 100;
    if (minRaw >= 0) target.speed_min = minRaw;
    if (maxRaw >= 0) target.speed_max = maxRaw;
    const accelSecs = root.hasField('Accel_Secs') ? readFloat(root, 'Accel_Secs') : -1;
    const accel = MiniGamePlayerSerializer.deriveAcceleration(minRaw, maxRaw, accelSecs);
    if (accel !== undefined) target.accelPerSec = accel;

    if (root.hasField('Bump_Damage')) target.bump_damage = readFloat(root, 'Bump_Damage');
    if (root.hasField('Camera')) target.cameraName = readString(root, 'Camera');
    if (root.hasField('CameraRotate')) target.cameraRotate = readFloat(root, 'CameraRotate');
    if (root.hasField('Hit_Points')) target.hit_points = readFloat(root, 'Hit_Points');
    if (root.hasField('Invince_Period')) target.invince_period = readFloat(root, 'Invince_Period');
    if (root.hasField('Max_HPs')) target.max_hps = readFloat(root, 'Max_HPs');
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
