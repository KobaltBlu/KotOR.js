import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import {
  auroraPitchFromQuaternion,
  auroraYawFromQuaternion,
  auroraYawPitchRoll,
  placeableCameraOrientation,
} from "@/utility/aurora-camera-orientation";

describe("aurora-camera-orientation", () => {
  const lookDir = new THREE.Vector3();

  function cameraLook(q: THREE.Quaternion): THREE.Vector3 {
    return lookDir.set(0, 0, -1).applyQuaternion(q).normalize();
  }

  it("identity Orientation + Pitch 90 looks along +Y (horizontal)", () => {
    const q = placeableCameraOrientation(new THREE.Quaternion(), 90);
    const d = cameraLook(q);
    expect(d.x).toBeCloseTo(0, 5);
    expect(d.y).toBeCloseTo(1, 5);
    expect(d.z).toBeCloseTo(0, 5);
    expect(auroraPitchFromQuaternion(q)).toBeCloseTo(90, 4);
  });

  it("YawPitchRoll facing + Pitch field matches SetShotFromScript rebuild", () => {
    const orient = auroraYawPitchRoll(45, 0, 0);
    const q = placeableCameraOrientation(orient, 90);
    const d = cameraLook(q);
    expect(d.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(d.y).toBeCloseTo(Math.SQRT1_2, 5);
    expect(d.z).toBeCloseTo(0, 5);
    expect(auroraYawFromQuaternion(q)).toBeCloseTo(45, 4);
  });

  it("does not double-apply Pitch when Orientation already includes tilt", () => {
    const orient = auroraYawPitchRoll(0, 90, 0);
    const q = placeableCameraOrientation(orient, 0);
    const d = cameraLook(q);
    expect(d.x).toBeCloseTo(0, 5);
    expect(d.y).toBeCloseTo(1, 5);
    expect(d.z).toBeCloseTo(0, 5);
  });

  it("rebuilds end_m01aa CameraID 2 facing from retail WXYZ Orientation", () => {
    // Raw GIT floats are W,X,Y,Z — pure Z-yaw ≈ 78.75°, Pitch 90 → horizontal.
    const orient = new THREE.Quaternion(0, 0, 0.6343932151794434, 0.7730104327201843);
    const q = placeableCameraOrientation(orient, 90);
    const d = cameraLook(q);
    expect(d.z).toBeCloseTo(0, 4);
    expect(auroraYawFromQuaternion(q)).toBeCloseTo(78.75, 1);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 4);
  });

  it("matches pre-alignment XYZW-misread + atan2 look for end_m01aa cameras", () => {
    // Disk WXYZ mis-read as XYZW made atan2(w,-x) accidentally recover Z-yaw.
    const samples: Array<{ w: number; z: number; pitch: number }> = [
      { w: 0.7730104327201843, z: 0.6343932151794434, pitch: 90 },
      { w: 0.4702639877796173, z: -0.8825258016586304, pitch: 69.8 },
      { w: 2.808638832618726e-08, z: -0.9999999403953552, pitch: 90 },
    ];
    for(const s of samples){
      const correct = new THREE.Quaternion(0, 0, s.z, s.w);
      const retailQ = placeableCameraOrientation(correct, s.pitch);
      const retailLook = cameraLook(retailQ).clone();

      // Legacy mis-read: first float → x, fourth → w
      const misX = s.w;
      const misW = s.z;
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(s.pitch),
        0,
        -Math.atan2(misW, -misX) * 2,
        'YZX'
      );
      const legacyQ = new THREE.Quaternion().setFromEuler(euler);
      const legacyLook = cameraLook(legacyQ);

      expect(legacyLook.x).toBeCloseTo(retailLook.x, 4);
      expect(legacyLook.y).toBeCloseTo(retailLook.y, 4);
      expect(legacyLook.z).toBeCloseTo(retailLook.z, 4);
    }
  });
});
