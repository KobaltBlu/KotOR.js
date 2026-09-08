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

  test('filterCastersForLights drops casters outside focus distance', () => {
    const registry = new ShadowCasterRegistry();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    geom.computeBoundingSphere();

    const near = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    near.castShadow = true;
    near.position.set(0, 0, 0);
    near.updateMatrixWorld(true);

    const far = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    far.castShadow = true;
    far.position.set(200, 0, 0);
    far.updateMatrixWorld(true);

    registry.registerMesh(near, { castShadow: true, receiveShadow: false });
    registry.registerMesh(far, { castShadow: true, receiveShadow: false });

    const count = registry.filterCastersForLights(
      [{ x: 0, y: 0, z: 0, radius: 800 }],
      { focus: new THREE.Vector3(0, 0, 0), maxFocusDistance: 60 }
    );
    expect(count).toBe(1);
    expect(near.castShadow).toBe(true);
    expect(far.castShadow).toBe(false);
    registry.restoreCastShadow();
  });

  test('filterCastersForLights drops invisible casters and enables none with empty lights', () => {
    const registry = new ShadowCasterRegistry();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    geom.computeBoundingSphere();

    const hidden = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    hidden.castShadow = true;
    hidden.visible = false;
    hidden.position.set(0, 0, 0);
    hidden.updateMatrixWorld(true);

    const visible = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    visible.castShadow = true;
    visible.position.set(0, 0, 0);
    visible.updateMatrixWorld(true);

    registry.registerMesh(hidden, { castShadow: true, receiveShadow: false });
    registry.registerMesh(visible, { castShadow: true, receiveShadow: false });

    expect(registry.filterCastersForLights([])).toBe(0);
    expect(hidden.castShadow).toBe(false);
    expect(visible.castShadow).toBe(false);
    registry.restoreCastShadow();

    const count = registry.filterCastersForLights(
      [{ x: 0, y: 0, z: 0, radius: 40 }],
      { focus: new THREE.Vector3(0, 0, 0), maxFocusDistance: 60 }
    );
    expect(count).toBe(1);
    expect(hidden.castShadow).toBe(false);
    expect(visible.castShadow).toBe(true);
    registry.restoreCastShadow();
  });
});
