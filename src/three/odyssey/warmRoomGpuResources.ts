import * as THREE from "three";
import type { OdysseyModel3D } from "@/three/odyssey/OdysseyModel3D";

export type WarmRoomGpuRoom = {
  model?: OdysseyModel3D;
  grass?: THREE.Object3D & { material?: THREE.Material | THREE.Material[] };
};

/**
 * Upload room diffuse / lightmap / env / bump textures (and grass) to the GPU
 * so the first VIS / frustum reveal does not pay deferred texImage2D stalls.
 */
export function warmRoomGpuResources(
  rooms: WarmRoomGpuRoom[],
  renderer: THREE.WebGLRenderer | undefined | null
): void {
  if(!renderer || typeof (renderer as any).initTexture !== "function"){
    return;
  }

  const seen = new Set<THREE.Texture>();
  const initTex = (tex?: THREE.Texture | null) => {
    if(!tex || seen.has(tex)){ return; }
    seen.add(tex);
    try{
      (renderer as any).initTexture(tex);
    }catch(_e){
      // Ignore invalid / already-disposed textures during warm-up.
    }
  };

  const warmMaterial = (material?: THREE.Material | null) => {
    if(!material){ return; }
    const m = material as THREE.Material & {
      map?: THREE.Texture;
      lightMap?: THREE.Texture;
      envMap?: THREE.Texture;
      bumpMap?: THREE.Texture;
      normalMap?: THREE.Texture;
      uniforms?: Record<string, { value?: THREE.Texture | null }>;
    };
    initTex(m.map);
    initTex(m.lightMap);
    initTex(m.envMap);
    initTex(m.bumpMap);
    initTex(m.normalMap);
    const u = m.uniforms;
    if(u){
      initTex(u.map?.value);
      initTex(u.lightMap?.value);
      initTex(u.envMap?.value);
      initTex(u.bumpMap?.value);
      initTex(u.normalMap?.value);
    }
  };

  const warmMaterials = (mats?: THREE.Material | THREE.Material[] | null) => {
    if(!mats){ return; }
    if(Array.isArray(mats)){
      for(let i = 0; i < mats.length; i++){
        warmMaterial(mats[i]);
      }
      return;
    }
    warmMaterial(mats);
  };

  for(let i = 0; i < rooms.length; i++){
    const room = rooms[i];
    const model = room.model;
    if(model){
      warmMaterials((model as OdysseyModel3D).materials);
      model.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh & { materials?: THREE.Material[] };
        warmMaterials(mesh.material);
        warmMaterials(mesh.materials);
      });
    }
    if(room.grass){
      warmMaterials(room.grass.material);
    }
  }
}

/**
 * Force every room model/grass visible for renderer.compile, then restore.
 * Does not touch visActive / audio — render-only.
 */
export function compileAreaRoomsVisible(
  rooms: WarmRoomGpuRoom[],
  renderer: THREE.WebGLRenderer,
  scene: THREE.Object3D,
  camera: THREE.Camera
): void {
  const savedModel: Array<boolean | undefined> = new Array(rooms.length);
  const savedGrass: Array<boolean | undefined> = new Array(rooms.length);

  for(let i = 0; i < rooms.length; i++){
    const room = rooms[i];
    if(room.model){
      savedModel[i] = room.model.visible;
      room.model.visible = true;
    }
    if(room.grass){
      savedGrass[i] = room.grass.visible;
      room.grass.visible = true;
    }
  }

  try{
    renderer.compile(scene as THREE.Scene, camera);
  }finally{
    for(let i = 0; i < rooms.length; i++){
      const room = rooms[i];
      if(room.model && savedModel[i] !== undefined){
        room.model.visible = savedModel[i] as boolean;
      }
      if(room.grass && savedGrass[i] !== undefined){
        room.grass.visible = savedGrass[i] as boolean;
      }
    }
  }
}
