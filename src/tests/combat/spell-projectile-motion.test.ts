/**
 * Spell projectile motion path samples.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as THREE from 'three';

import {
  sampleSpellProjectilePosition,
  spellProjectileBezierMid,
} from '@/combat/spell-projectile-motion';
import { ProjectilePath } from '@/enums/combat/ProjectilePath';
import { SPELL_PROJECTILE_PATH6_EXTRA_MS } from '@/combat/spell-projectile-time';
import { resolveDroidUtilityGateMs } from '@/combat/item-cast-timing';

describe('sampleSpellProjectilePosition', () => {
  const origin = new THREE.Vector3(0, 0, 0);
  const dest = new THREE.Vector3(10, 0, 0);

  it('homing lerps linearly', () => {
    const out = sampleSpellProjectilePosition(
      ProjectilePath.HOMING, origin, dest, 0.5, new THREE.Vector3()
    );
    expect(out.x).toBeCloseTo(5, 5);
    expect(out.z).toBeCloseTo(0, 5);
  });

  it('path 6 spends the last 2500ms in a collapsing spiral near dest', () => {
    const totalMs = 1000 + SPELL_PROJECTILE_PATH6_EXTRA_MS;
    const hangStart = 1000 / totalMs;
    const inHang = sampleSpellProjectilePosition(
      ProjectilePath.GRENADE, origin, dest, hangStart + 0.001, new THREE.Vector3(),
      { totalMs, spiralSign: 1 }
    );
    // Just into hang — near dest with lateral spiral offset (~2)
    expect(inHang.distanceTo(dest)).toBeGreaterThan(0.5);
    expect(inHang.distanceTo(dest)).toBeLessThan(3);

    const atEnd = sampleSpellProjectilePosition(
      ProjectilePath.GRENADE, origin, dest, 1, new THREE.Vector3(),
      { totalMs, spiralSign: 1 }
    );
    expect(atEnd.distanceTo(dest)).toBeLessThan(0.2);
  });

  it('high ballistic peaks near +30 mid-flight', () => {
    const mid = sampleSpellProjectilePosition(
      ProjectilePath.HIGH_BALLISTIC, origin, dest, 0.5, new THREE.Vector3()
    );
    expect(mid.z).toBeGreaterThan(20);
  });
});

describe('spellProjectileBezierMid', () => {
  it('raises grenade mid above the chord', () => {
    const mid = spellProjectileBezierMid(
      ProjectilePath.GRENADE,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0)
    );
    expect(mid.z).toBeGreaterThan(0);
  });
});

describe('resolveDroidUtilityGateMs', () => {
  it('uses anim length minus 50ms like retail GetAnimationLength(0x2AF9)-0x32', () => {
    expect(resolveDroidUtilityGateMs(0.4)).toBe(350);
  });

  it('falls back to 300ms when length unavailable', () => {
    expect(resolveDroidUtilityGateMs(0)).toBe(300);
  });
});
