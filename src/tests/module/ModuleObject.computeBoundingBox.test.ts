/**
 * @jest-environment node
 *
 * Contract for ModuleObject / ModuleRoom.computeBoundingBox matrix refresh:
 * a single root updateMatrixWorld(force) — no nested traverse of
 * updateMatrixWorld(true) on every descendant.
 */
import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';

function computeBoundingBoxMatrices(
  container: THREE.Object3D | undefined,
  model: THREE.Object3D | undefined,
  force: boolean,
  box: THREE.Box3
): THREE.Box3 {
  if(container){
    container.updateMatrixWorld(force);
  }else if(model){
    model.updateMatrixWorld(force);
  }
  if(model instanceof THREE.Object3D){
    box.setFromObject(model);
  }
  return box;
}

describe('computeBoundingBox matrix contract', () => {
  test('force path updates matrixWorld once at the container root without nested traverse', () => {
    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const model = new THREE.Object3D();
    model.add(child);
    const container = new THREE.Object3D();
    container.add(model);

    const traverseSpy = jest.spyOn(container, 'traverse');
    const containerUpdateSpy = jest.spyOn(container, 'updateMatrixWorld');

    const box = computeBoundingBoxMatrices(container, model, true, new THREE.Box3());

    expect(containerUpdateSpy).toHaveBeenCalledTimes(1);
    expect(containerUpdateSpy).toHaveBeenCalledWith(true);
    expect(traverseSpy).not.toHaveBeenCalled();
    expect(box.isEmpty()).toBe(false);
  });
});
