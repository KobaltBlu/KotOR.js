import * as THREE from "three";

export interface LayoutDoorHook {
  room: string;
  name: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}
