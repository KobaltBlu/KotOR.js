import * as THREE from "three";
import { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import { OdysseyFace3 } from "@/three/odyssey/OdysseyFace3";

function makeFace(wok: OdysseyWalkMesh, a: number, b: number, c: number): OdysseyFace3 {
  const face = new OdysseyFace3(a, b, c);
  face.walkmesh = wok;
  face.walkIndex = 0;
  face.triangle = new THREE.Triangle(wok.vertices[a], wok.vertices[b], wok.vertices[c]);
  face.normal = new THREE.Vector3(0, 0, 1);
  return face;
}

describe("OdysseyWalkMesh spatial helpers", () => {
  it("raycast respects candidate face subsets", () => {
    const wok = new OdysseyWalkMesh();
    wok.vertices = [
      new THREE.Vector3(-1, -1, 0),
      new THREE.Vector3(1, -1, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(9, -1, 0),
      new THREE.Vector3(11, -1, 0),
      new THREE.Vector3(10, 1, 0),
    ];
    const nearFace = makeFace(wok, 0, 1, 2);
    const farFace = makeFace(wok, 3, 4, 5);
    wok.faces = [nearFace, farFace];
    wok.mesh = new THREE.Mesh();
    wok.mesh.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      0,
      5
    );

    expect(wok.raycast(raycaster, [farFace])).toHaveLength(0);
    const hits = wok.raycast(raycaster, [nearFace]);
    expect(hits).toHaveLength(1);
    expect((hits[0] as any).face).toBe(nearFace);
  });
});
