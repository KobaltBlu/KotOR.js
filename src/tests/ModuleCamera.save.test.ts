/**
 * ModuleCamera save export must preserve the raw GIT Orientation / Pitch —
 * building the THREE view camera composes YawPitchRoll(Yaw, Pitch(q)+Pitch, Roll)
 * for rendering, but that composed quaternion must never leak into `save()`.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    ResolutionManager: {
      getViewportWidth: () => 1920,
      getViewportHeight: () => 1080,
    },
  },
}));

import { ModuleCamera } from '@/module/ModuleCamera';
import { GFFDataType } from '@/enums/resource/GFFDataType';

describe('ModuleCamera save export', () => {
  // end_m01aa CameraID 2 — disk WXYZ pure Z-yaw ≈ 78.75°, Pitch 90.
  const orientation = { x: 0, y: 0, z: 0.6343932151794434, w: 0.7730104327201843 };
  const position = { x: 12.5, y: -3.25, z: 1.75 };
  const pitch = 90;
  const height = 1.5;
  const fov = 55;
  const micRange = 8;

  function makeCamera(): ModuleCamera {
    const cam = new ModuleCamera();
    cam.cameraID = 2;
    cam.fov = fov;
    cam.height = height;
    cam.micRange = micRange;
    cam.pitch = pitch;
    cam.orientation.set(orientation.x, orientation.y, orientation.z, orientation.w);
    cam.position.set(position.x, position.y, position.z);
    return cam;
  }

  it('writes raw GIT Orientation, not the composed view quaternion', () => {
    const cam = makeCamera();
    // buildCamera composes Pitch into the render quaternion.
    cam.buildCamera();

    const composed = cam.perspectiveCamera.quaternion;
    // Sanity: the render quaternion is the pitched view, not the raw GIT quat.
    expect(Math.abs(composed.z - orientation.z)).toBeGreaterThan(1e-3);

    const gff = cam.save();
    const saved = gff.RootNode.getFieldByLabel('Orientation').getOrientation();
    expect(saved.x).toBeCloseTo(orientation.x, 6);
    expect(saved.y).toBeCloseTo(orientation.y, 6);
    expect(saved.z).toBeCloseTo(orientation.z, 6);
    expect(saved.w).toBeCloseTo(orientation.w, 6);
  });

  it('preserves Pitch / Height / FOV / MicRange as FLOAT and Position', () => {
    const cam = makeCamera();
    cam.buildCamera();
    const gff = cam.save();
    const root = gff.RootNode;

    expect(root.getFieldByLabel('Pitch').getValue()).toBeCloseTo(pitch, 6);
    expect(root.getFieldByLabel('Height').getValue()).toBeCloseTo(height, 6);
    expect(root.getFieldByLabel('FieldOfView').getValue()).toBeCloseTo(fov, 6);
    expect(root.getFieldByLabel('MicRange').getValue()).toBeCloseTo(micRange, 6);

    const pos = root.getFieldByLabel('Position').getVector();
    expect(pos.x).toBeCloseTo(position.x, 6);
    expect(pos.y).toBeCloseTo(position.y, 6);
    expect(pos.z).toBeCloseTo(position.z, 6);

    expect(root.getFieldByLabel('FieldOfView').type).toBe(GFFDataType.FLOAT);
    expect(root.getFieldByLabel('Height').type).toBe(GFFDataType.FLOAT);
    expect(root.getFieldByLabel('Pitch').type).toBe(GFFDataType.FLOAT);
  });

  it('round-trips unchanged when saving twice through a rebuild', () => {
    const cam = makeCamera();
    cam.buildCamera();
    const first = cam.save().RootNode.getFieldByLabel('Orientation').getOrientation();
    cam.buildCamera();
    const second = cam.save().RootNode.getFieldByLabel('Orientation').getOrientation();
    expect(second.x).toBeCloseTo(first.x, 6);
    expect(second.y).toBeCloseTo(first.y, 6);
    expect(second.z).toBeCloseTo(first.z, 6);
    expect(second.w).toBeCloseTo(first.w, 6);
  });
});
