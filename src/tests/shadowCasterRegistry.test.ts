import * as THREE from 'three';
import { ShadowCasterRegistry } from '@/managers/ShadowCasterRegistry';

describe('ShadowCasterRegistry', () => {
  test('registers casters and receivers', () => {
    const registry = new ShadowCasterRegistry();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const caster = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    caster.castShadow = true;
    const receiver = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    receiver.receiveShadow = true;

    registry.registerMesh(caster, { castShadow: true, receiveShadow: false, isStatic: false });
    registry.registerMesh(receiver, { castShadow: false, receiveShadow: true, isStatic: true });

    expect(registry.getStencilCasters().length).toBe(1);
    expect(registry.getStaticReceivers().length).toBe(1);
    expect(registry.getDynamicReceivers().length).toBe(0);
  });

  test('filters casters by light radius', () => {
    const registry = new ShadowCasterRegistry();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const near = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    near.castShadow = true;
    near.position.set(0, 0, 0);
    near.updateMatrixWorld(true);

    registry.registerMesh(near, { castShadow: true, receiveShadow: false });

    const inRange = registry.getCastersInLightRadius(0, 0, 0, 5, 0);
    expect(inRange.length).toBe(1);

    const outRange = registry.getCastersInLightRadius(100, 100, 0, 5, 0);
    expect(outRange.length).toBe(0);
  });
});
