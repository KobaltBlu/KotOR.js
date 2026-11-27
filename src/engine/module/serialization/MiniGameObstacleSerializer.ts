import type { MiniGameObstacle } from '@engine/module/minigame/MiniGameObstacle';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import { readFloat, readString } from '@engine/module/serialization/gffHelpers';

/**
 * MiniGame obstacle — deserialize-only (no save evidence in module GIT dumps).
 */
export class MiniGameObstacleSerializer implements GameObjectSerializer<MiniGameObstacle, any, any> {
  deserialize(target: MiniGameObstacle, source: any, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    if (root.hasField('Name')) target.name = readString(root, 'Name').toLowerCase();
    if (root.hasField('Hit_Points')) target.hit_points = readFloat(root, 'Hit_Points');
    if (root.hasField('Max_Hit_Points')) target.max_hps = readFloat(root, 'Max_Hit_Points');
    if (root.hasField('Invince_Period')) target.invince_period = readFloat(root, 'Invince_Period');
  }

  serialize(_source: MiniGameObstacle, _context?: SerializeContext): any {
    throw new Error('MiniGameObstacleSerializer.serialize: not implemented (no save evidence)');
  }
}

export const miniGameObstacleSerializer = new MiniGameObstacleSerializer();
