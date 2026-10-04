/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";
import {
  auditGuiMatrices,
  clearGuiMatrixDirty,
  commitGuiTransform,
  flushGuiMatrices,
  freezeGuiObject,
  freezeGuiTree,
  getGuiMatrixDirtyCount,
  markGuiWorldDirty,
} from "@engine/gui/guiMatrix";

describe("guiMatrix", () => {
  afterEach(() => {
    clearGuiMatrixDirty();
  });

  it("freezes a tree and newly added children via childadded", () => {
    const root = new THREE.Group();
    freezeGuiTree(root);
    expect(root.matrixAutoUpdate).toBe(false);

    const child = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial(),
    );
    expect(child.matrixAutoUpdate).toBe(true);
    root.add(child);
    expect(child.matrixAutoUpdate).toBe(false);
  });

  it("leaves matrixWorld stale until commit + flush", () => {
    const root = new THREE.Group();
    freezeGuiObject(root);
    clearGuiMatrixDirty();

    root.position.x = 10;
    const before = root.matrixWorld.elements.slice();
    expect(root.matrix.elements[12]).toBe(0);

    commitGuiTransform(root);
    expect(root.matrix.elements[12]).toBe(10);
    expect(getGuiMatrixDirtyCount()).toBe(1);

    flushGuiMatrices();
    expect(getGuiMatrixDirtyCount()).toBe(0);
    expect(root.matrixWorld.elements[12]).toBe(10);
    expect(root.matrixWorld.elements).not.toEqual(before);
  });

  it("parent commit updates child world matrix on flush", () => {
    const parent = new THREE.Group();
    const child = new THREE.Group();
    freezeGuiObject(parent);
    parent.add(child);
    clearGuiMatrixDirty();

    child.position.x = 5;
    commitGuiTransform(child);
    parent.position.x = 10;
    commitGuiTransform(parent);

    flushGuiMatrices();
    expect(child.matrixWorld.elements[12]).toBe(15);
  });

  it("audit warns on uncommitted transform writes", () => {
    const root = new THREE.Group();
    freezeGuiObject(root);
    root.name = "audit-target";
    clearGuiMatrixDirty();

    root.position.x = 3;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    auditGuiMatrices(root);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain("audit-target");
    warn.mockRestore();
  });

  it("markGuiWorldDirty alone is cleared by flush", () => {
    const obj = new THREE.Group();
    freezeGuiObject(obj);
    clearGuiMatrixDirty();
    markGuiWorldDirty(obj);
    expect(getGuiMatrixDirtyCount()).toBe(1);
    flushGuiMatrices();
    expect(getGuiMatrixDirtyCount()).toBe(0);
  });
});
