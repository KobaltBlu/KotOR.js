/**
 * Per-object "last bullet hit" record + default OnHitBullet helpers.
 *
 * Retail CSWMiniGameObject keeps the last bullet that hit it on the object
 * itself (damage, target type, collision sound, hit point, shooter, part).
 * OnHitBullet(1) (SWMG_OnBulletHit DefaultImpl, 0x0066c190) reads that record:
 *   - follower whose TargetType() & bullet.target_type != 0 → AdjustHitPoints(-damage)
 *   - Collision_Sound → Play3DOneShotSound at the hit point (0x17 player / 0x18 other)
 *
 * @file MGBulletHit.ts
 */

import * as THREE from 'three';
import { AudioEmitter } from '@engine/audio/AudioEmitter';
import { AudioEngine } from '@engine/audio/AudioEngine';
import { AudioEmitterType } from '@core/enums/audio/AudioEmitterType';
import { AudioPriorityGroup } from '@core/enums/audio/AudioPriorityGroup';

/** MiniGameObjectTypes (retail enum) — returned by CSWTrackFollower::TargetType. */
export const MG_TARGET_PLAYER = 1;
export const MG_TARGET_ENEMY = 2;

export interface MGBulletHitInfo {
  damage: number;
  targetType: number;
  collisionSound: string;
  point: THREE.Vector3;
  shooter?: any;
  part?: string;
}

export function createBulletHitInfo(): MGBulletHitInfo {
  return {
    damage: 0,
    targetType: 0,
    collisionSound: '',
    point: new THREE.Vector3(),
    shooter: undefined,
    part: '',
  };
}

/** Normalize a GFF ResRef string (strip NUL padding, lower-case). */
export function normalizeResRef(ref: string | undefined | null): string {
  return String(ref || '').replace(/\0[\s\S]*$/g, '').trim().toLowerCase();
}

const oneShotEmitters = new Map<AudioPriorityGroup, AudioEmitter>();

/**
 * CExoSound::Play3DOneShotSound stand-in — one positional emitter per priority
 * group, moved to the sound position before each fire-and-forget play.
 */
export async function playMG3DOneShot(
  resRef: string,
  position: THREE.Vector3,
  isPlayer: boolean,
): Promise<void> {
  const ref = normalizeResRef(resRef);
  if(!ref || ref === '****'){ return; }
  try{
    const engine = AudioEngine.GetAudioEngine();
    if(!engine){ return; }
    const group = isPlayer ? AudioPriorityGroup.DEFAULT : AudioPriorityGroup.MINIGAME_ENEMY;
    let emitter = oneShotEmitters.get(group);
    if(!emitter || (emitter as any).isDestroyed){
      emitter = new AudioEmitter(engine);
      emitter.type = AudioEmitterType.POSITIONAL;
      emitter.setPriorityGroupId(group);
      emitter.setMaxDistance(50);
      emitter.setPosition(position.x, position.y, position.z);
      await emitter.load();
      oneShotEmitters.set(group, emitter);
    }
    emitter.setPosition(position.x, position.y, position.z);
    await emitter.playSoundFireAndForget(ref);
  }catch(e){
    console.error('playMG3DOneShot: failed', ref, e);
  }
}

/** Drop cached one-shot emitters (minigame teardown). */
export function disposeMG3DOneShots(){
  oneShotEmitters.forEach((e) => e.destroy());
  oneShotEmitters.clear();
}
