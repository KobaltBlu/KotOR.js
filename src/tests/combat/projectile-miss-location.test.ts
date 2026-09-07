/**
 * ResolveProjectileMissLocation alignment helpers.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as THREE from 'three';

/**
 * Pure core of ResolveProjectileMissLocation
 * (without ClearLineOfSight) for unit testing.
 */
function missBesideTarget(opts: {
  attacker: THREE.Vector3;
  target: THREE.Vector3;
  personalSpace: number;
  attackResult?: number;
  flipPerp?: boolean;
  rand01?: number;
}): THREE.Vector3 {
  let lateralScale = 0.40002003;
  let scatterMul = 1.0;
  if(opts.personalSpace > 0){
    lateralScale = opts.personalSpace * 0.6667;
  }
  if((opts.attackResult | 0) === 10){
    // Deterministic stand-in for three rand%3 draws
    scatterMul = 3;
  }

  const toAttacker = opts.attacker.clone().sub(opts.target);
  const distSq = toAttacker.lengthSq();
  if(distSq > 1e-8) toAttacker.normalize();
  else toAttacker.set(1, 0, 0);

  const perp = new THREE.Vector3().crossVectors(toAttacker, new THREE.Vector3(0, 0, 1));
  if(opts.flipPerp) perp.negate();
  perp.multiplyScalar(scatterMul);

  return new THREE.Vector3(
    opts.target.x + perp.x * lateralScale,
    opts.target.y + perp.y * lateralScale,
    opts.target.z + perp.z * lateralScale
  );
}

describe('ResolveProjectileMissLocation core', () => {
  it('offsets beside the target by ~2/3 personal space', () => {
    const miss = missBesideTarget({
      attacker: new THREE.Vector3(0, 0, 0),
      target: new THREE.Vector3(10, 0, 0),
      personalSpace: 0.9,
      flipPerp: false,
    });
    // perp of (attacker-target)=(-1,0,0) × (0,0,1) = (0,-1,0) wait
    // toAttacker = attacker - target = (-10,0,0) → (-1,0,0)
    // cross((-1,0,0),(0,0,1)) = (0*1-0*0, 0*0-(-1)*1, (-1)*0-0*0) = (0, 1, 0)
    expect(Math.abs(miss.y - 0)).toBeCloseTo(0.9 * 0.6667, 3);
    expect(miss.x).toBeCloseTo(10, 5);
  });

  it('widens scatter when attack_result == 10', () => {
    const narrow = missBesideTarget({
      attacker: new THREE.Vector3(0, 0, 0),
      target: new THREE.Vector3(10, 0, 0),
      personalSpace: 0.9,
      attackResult: 4,
      flipPerp: false,
    });
    const wide = missBesideTarget({
      attacker: new THREE.Vector3(0, 0, 0),
      target: new THREE.Vector3(10, 0, 0),
      personalSpace: 0.9,
      attackResult: 10,
      flipPerp: false,
    });
    expect(Math.abs(wide.y)).toBeGreaterThan(Math.abs(narrow.y));
  });
});
