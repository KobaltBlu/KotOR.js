/**
 * Idle look tracking must preserve post-anim hturn.x (female +/-0.1745 cancel).
 * Active look must not accumulate pitch across frames.
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import { applyHeadTrackingToHturn } from '@/module/applyHeadTrackingToHturn';

function makeHturn(x: number, z = 0) {
  return { rotation: { x, z }, userData: {} as Record<string, unknown> };
}

describe('applyHeadTrackingToHturn', () => {
  test('idle look (yaw/pitch ~0) preserves female hturn bind cancel', () => {
    const hturn = makeHturn(0.1745, 0.02);
    applyHeadTrackingToHturn(hturn, 0, 0);
    expect(hturn.rotation.x).toBeCloseTo(0.1745);
    expect(hturn.rotation.z).toBeCloseTo(0.02);
  });

  test('active yaw replaces z; active pitch adds onto anim x once', () => {
    const hturn = makeHturn(0.1745, 0);
    applyHeadTrackingToHturn(hturn, 0.3, -0.1);
    expect(hturn.rotation.z).toBeCloseTo(0.3);
    expect(hturn.rotation.x).toBeCloseTo(0.0745);
  });

  test('repeated frames with constant pitch do not accumulate (listen-style sticky bone)', () => {
    const hturn = makeHturn(0.1745, 0);
    for(let i = 0; i < 100; i++){
      // Anim did not overwrite hturn (sticky pose from last compose)
      applyHeadTrackingToHturn(hturn, 0.05, -0.11);
    }
    expect(hturn.rotation.x).toBeCloseTo(0.1745 - 0.11);
    expect(Math.abs(hturn.rotation.x)).toBeLessThan(1);
  });

  test('anim overwrite each frame still applies full look pitch', () => {
    const hturn = makeHturn(0.1745, 0);
    for(let i = 0; i < 50; i++){
      hturn.rotation.x = 0.1745; // anim reset
      hturn.rotation.z = 0;
      applyHeadTrackingToHturn(hturn, 0.2, -0.11);
    }
    expect(hturn.rotation.x).toBeCloseTo(0.1745 - 0.11);
    expect(hturn.rotation.z).toBeCloseTo(0.2);
  });

  test('clearing look restores anim baseline', () => {
    const hturn = makeHturn(0.1745, 0);
    applyHeadTrackingToHturn(hturn, 0.2, -0.11);
    applyHeadTrackingToHturn(hturn, 0, 0);
    expect(hturn.rotation.x).toBeCloseTo(0.1745);
    expect(hturn.rotation.z).toBeCloseTo(0);
  });
});
