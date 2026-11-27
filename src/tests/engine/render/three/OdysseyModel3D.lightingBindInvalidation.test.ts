/**
 * @jest-environment node
 *
 * Attaching a sub-model (head, weapon, VFX) under a model must drop the cached
 * light-bind fingerprints on every ancestor; otherwise a stationary creature
 * keeps skipping the bind and the new materials stay unlit (black).
 */
import { describe, expect, jest, test } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));

import { OdysseyModel3D } from '@engine/render/three/odyssey/OdysseyModel3D';

function markBound(obj: THREE.Object3D){
  obj.userData.odysseyObjectBindFp = 123;
  obj.userData.odysseyBindFp = 456;
  obj.userData.odysseyShadowBoundEpoch = 7;
}

describe('OdysseyModel3D lighting bind invalidation', () => {
  test('adding a model under a nested hook clears every ancestor fingerprint', () => {
    const container = new THREE.Object3D();
    const body = new OdysseyModel3D();
    const hand = new THREE.Object3D();
    container.add(body);
    body.add(hand);
    markBound(container);
    markBound(body);

    hand.add(new OdysseyModel3D());

    for(const obj of [container, body, hand]){
      expect(obj.userData.odysseyObjectBindFp).toBeUndefined();
      expect(obj.userData.odysseyBindFp).toBeUndefined();
      expect(obj.userData.odysseyShadowBoundEpoch).toBeUndefined();
    }
  });

  test('adding a plain Object3D leaves the fingerprint alone', () => {
    const body = new OdysseyModel3D();
    markBound(body);
    body.add(new THREE.Object3D());
    expect(body.userData.odysseyObjectBindFp).toBe(123);
  });

  test('invalidateLightingBinds walks up from the given object', () => {
    const root = new THREE.Object3D();
    const body = new OdysseyModel3D();
    root.add(body);
    markBound(root);
    markBound(body);
    OdysseyModel3D.invalidateLightingBinds(body);
    expect(body.userData.odysseyObjectBindFp).toBeUndefined();
    expect(root.userData.odysseyBindFp).toBeUndefined();
  });
});
