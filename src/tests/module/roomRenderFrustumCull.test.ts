import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';

/**
 * Minimal stand-in for ModuleArea.applyRoomRenderFrustumCull:
 * VIS-active rooms outside the view frustum are render-hidden; player room stays.
 */
function applyRoomRenderFrustumCull(opts: {
  rooms: Array<{
    model: THREE.Object3D & { userData: { visActive?: boolean } };
    grass?: { visible: boolean } | null;
    box: THREE.Box3;
  }>;
  playerRoomIndex: number;
  camera: THREE.Camera;
  pad?: number;
}): void {
  const { rooms, playerRoomIndex, camera } = opts;
  const pad = opts.pad ?? 4;
  camera.updateMatrixWorld(true);
  const persp = camera as THREE.PerspectiveCamera;
  if(typeof persp.updateProjectionMatrix === 'function'){
    persp.updateProjectionMatrix();
  }
  const frustum = new THREE.Frustum();
  const proj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(proj);
  const scratch = new THREE.Box3();

  for(let i = 0; i < rooms.length; i++){
    const room = rooms[i];
    const model = room.model;
    if(!model.userData.visActive){
      model.visible = false;
      if(room.grass){ room.grass.visible = false; }
      continue;
    }
    if(i === playerRoomIndex){
      model.visible = true;
      if(room.grass){ room.grass.visible = true; }
      continue;
    }
    scratch.copy(room.box);
    scratch.min.x -= pad;
    scratch.min.y -= pad;
    scratch.min.z -= pad;
    scratch.max.x += pad;
    scratch.max.y += pad;
    scratch.max.z += pad;
    const onScreen = frustum.intersectsBox(scratch);
    model.visible = onScreen;
    if(room.grass){ room.grass.visible = onScreen; }
  }
}

describe('room render frustum cull', () => {
  test('keeps player room and hides off-screen VIS-linked rooms', () => {
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);

    const player = {
      model: Object.assign(new THREE.Object3D(), { userData: { visActive: true } }),
      grass: { visible: true },
      box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
    };
    const linkedOnScreen = {
      model: Object.assign(new THREE.Object3D(), { userData: { visActive: true } }),
      grass: { visible: true },
      box: new THREE.Box3(new THREE.Vector3(-2, -2, -2), new THREE.Vector3(2, 2, 2)),
    };
    const linkedOffScreen = {
      model: Object.assign(new THREE.Object3D(), { userData: { visActive: true } }),
      grass: { visible: true },
      box: new THREE.Box3(new THREE.Vector3(500, 0, 0), new THREE.Vector3(510, 10, 10)),
    };
    const hiddenVis = {
      model: Object.assign(new THREE.Object3D(), { userData: { visActive: false } }),
      grass: { visible: false },
      box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
    };

    applyRoomRenderFrustumCull({
      rooms: [player, linkedOnScreen, linkedOffScreen, hiddenVis],
      playerRoomIndex: 0,
      camera: cam,
    });

    expect(player.model.visible).toBe(true);
    expect(linkedOnScreen.model.visible).toBe(true);
    expect(linkedOffScreen.model.visible).toBe(false);
    expect(linkedOffScreen.grass.visible).toBe(false);
    expect(hiddenVis.model.visible).toBe(false);
  });
});
