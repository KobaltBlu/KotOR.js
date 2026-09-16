import { describe, expect, test } from "@jest/globals";
import * as THREE from "three";
import {
  OdysseySaberTrailGeometry,
  SABER_TRAIL_CAPACITY,
  SABER_TRAIL_PROFILE_COUNT,
} from "@/odyssey/OdysseySaberTrailGeometry";
import {
  OdysseySaberTrail,
  SABER_TRAIL_SAMPLE_INTERVAL,
  SABER_TRAIL_LIFETIME,
} from "@/odyssey/OdysseySaberTrail";
import type { OdysseyModelNodeSaber } from "@/odyssey/OdysseyModelNodeSaber";

function makeSaberNode(): OdysseyModelNodeSaber {
  const verts: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < 176; i++) {
    verts.push(0, 0, i * 0.01);
    uvs.push(0, i / 175);
  }
  return {
    vertices: verts,
    tvectors: [uvs],
  } as unknown as OdysseyModelNodeSaber;
}

describe("CPU OdysseySaberTrail", () => {
  test("ring wraps and fillPositions leaves UV/index versions unchanged", () => {
    const geo = new OdysseySaberTrailGeometry(
      new Float32Array(12),
      new Float32Array(8),
    );
    const pos = new Float32Array(SABER_TRAIL_CAPACITY * 3);
    const ori = new Float32Array(SABER_TRAIL_CAPACITY * 4);
    let writeIndex = 0;
    let sampleCount = 0;
    const push = (x: number) => {
      const s = writeIndex;
      pos[s * 3] = x;
      ori[s * 4 + 3] = 1;
      writeIndex = (s + 1) % SABER_TRAIL_CAPACITY;
      sampleCount = Math.min(sampleCount + 1, SABER_TRAIL_CAPACITY);
    };
    for (let i = 0; i < 45; i++) push(i);

    expect(sampleCount).toBe(SABER_TRAIL_CAPACITY);
    const uv = geo.geometry.getAttribute("uv") as THREE.BufferAttribute;
    const index = geo.geometry.getIndex() as THREE.BufferAttribute;
    const uvVersion = uv.version;
    const indexVersion = index.version;
    const idxCount = geo.fillPositions(
      pos,
      ori,
      writeIndex,
      sampleCount,
      new THREE.Matrix4(),
    );
    expect(idxCount).toBe((sampleCount - 1) * SABER_TRAIL_PROFILE_COUNT * 6);
    expect(uv.version).toBe(uvVersion);
    expect(index.version).toBe(indexVersion);
    expect(
      (geo.geometry.getAttribute("position") as THREE.BufferAttribute).version,
    ).toBeGreaterThan(0);
    geo.dispose();
  });

  test("rotation generates a trail; idle expires without further uploads; hitch resets", () => {
    const parent = new THREE.Object3D();
    const bladeGeo = new THREE.BufferGeometry();
    bladeGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(9), 3),
    );
    const mat = new THREE.MeshBasicMaterial();
    const blade = new THREE.Mesh(bladeGeo, mat);
    parent.add(blade);

    const trail = new OdysseySaberTrail(blade, makeSaberNode());
    const mw = new THREE.Matrix4();
    const posAttr = trail.mesh.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;

    trail.update(0.016, mw);
    expect(trail.mesh.visible).toBe(false);

    const q = new THREE.Quaternion();
    let rebuilt = 0;
    for (let frame = 0; frame < 20; frame++) {
      q.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        (Math.PI / 2) * (frame / 19),
      );
      mw.compose(
        new THREE.Vector3(0, 0, 0),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      const versionBefore = posAttr.version;
      trail.update(SABER_TRAIL_SAMPLE_INTERVAL, mw);
      if (posAttr.version !== versionBefore) rebuilt++;
    }
    expect(trail.mesh.visible).toBe(true);
    expect(rebuilt).toBeGreaterThan(0);

    mw.compose(new THREE.Vector3(0, 0, 0), q, new THREE.Vector3(1, 1, 1));
    const frames = Math.ceil(SABER_TRAIL_LIFETIME / 0.016) + 5;
    for (let i = 0; i < frames; i++) {
      trail.update(0.016, mw);
    }
    expect(trail.mesh.visible).toBe(false);
    const idleVersion = posAttr.version;
    trail.update(0.016, mw);
    expect(posAttr.version).toBe(idleVersion);

    for (let i = 0; i < 10; i++) {
      mw.setPosition(i * 0.05, 0, 0);
      trail.update(SABER_TRAIL_SAMPLE_INTERVAL, mw);
    }
    expect(trail.mesh.visible).toBe(true);
    mw.setPosition(100, 0, 0);
    trail.update(0.5, mw);
    expect(trail.mesh.visible).toBe(false);

    trail.dispose();
    expect(trail.mesh.parent).toBeNull();
    expect(mat.uuid.length).toBeGreaterThan(0);
    mat.dispose();
    bladeGeo.dispose();
  });
});
