/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import {
  clearWorldMatrixDirty,
  commitWorldTransform,
  flushWorldMatrices,
  freezeWorldContainer,
  getWorldMatrixDirtyCount,
  markWorldMatrixDirty,
} from "@engine/render/worldMatrix";

describe("worldMatrix", () => {
  afterEach(() => {
    clearWorldMatrixDirty();
  });

  it("commitWorldTransform updates world matrix immediately", () => {
    const root = new THREE.Group();
    freezeWorldContainer(root);
    expect(root.matrixAutoUpdate).toBe(false);
    clearWorldMatrixDirty();

    root.position.x = 10;
    expect(root.matrix.elements[12]).toBe(0);

    commitWorldTransform(root);
    expect(root.matrix.elements[12]).toBe(10);
    expect(root.matrixWorld.elements[12]).toBe(10);
    expect(getWorldMatrixDirtyCount()).toBe(1);

    flushWorldMatrices();
    expect(getWorldMatrixDirtyCount()).toBe(0);
    expect(root.matrixWorld.elements[12]).toBe(10);
  });

  it("parent commit updates child world matrix", () => {
    const parent = new THREE.Group();
    const child = new THREE.Group();
    freezeWorldContainer(parent);
    parent.add(child);
    freezeWorldContainer(child);
    clearWorldMatrixDirty();

    child.position.x = 5;
    commitWorldTransform(child);
    parent.position.x = 10;
    commitWorldTransform(parent);

    expect(child.matrixWorld.elements[12]).toBe(15);
  });

  it("markWorldMatrixDirty alone is cleared by flush", () => {
    const obj = new THREE.Group();
    freezeWorldContainer(obj);
    clearWorldMatrixDirty();
    markWorldMatrixDirty(obj);
    expect(getWorldMatrixDirtyCount()).toBe(1);
    flushWorldMatrices();
    expect(getWorldMatrixDirtyCount()).toBe(0);
  });
});
