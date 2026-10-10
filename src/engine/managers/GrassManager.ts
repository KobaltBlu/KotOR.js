import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { WindManager } from "@engine/managers/WindManager";
import { TextureLoader } from "@engine/loaders";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { OdysseyModelNodeAABB } from "@engine/odyssey/OdysseyModelNodeAABB";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import type { AreaRoom } from "@engine/module/AreaRoom";
import {
  GRASS_ALPHA_TEST_DEFAULT,
  GRASS_BIN_CELL_SIZE,
  GRASS_FAR_RADIUS_SQ,
  GRASS_NEAR_RADIUS_SQ,
  binCellKey,
  colorFromAreDword,
  computeBinFade,
  computeFaceGrassCount,
  faceVertexPositions,
  grassMeshOffset,
  normalizeGrassProbability,
  pickGrassTextureQuad,
  resolveGrassFaces,
  type GrassFaceSource,
} from "@engine/managers/grass/grassHelpers";

export type GrassBin = {
  mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  center: THREE.Vector3;
  fade: number;
};

type BladePlacement = {
  matrix: THREE.Matrix4;
  grassQuad: number;
  lightmapUV: THREE.Vector2;
  instanceID: number;
  worldX: number;
  worldY: number;
};

/**
 * Scene-level grass: ARE params, WOK/AABB placement, spatial bins, GPU wind.
 */
export class GrassManager {
  context: any;
  private rooms = new Map<object, GrassBin[]>();
  private _camPos = new THREE.Vector3();
  private static _instance: GrassManager | null = null;

  init(context: any): void {
    this.context = context;
  }

  clear(): void {
    for(const bins of this.rooms.values()){
      this.disposeBins(bins);
    }
    this.rooms.clear();
  }

  async buildForRoom(room: AreaRoom): Promise<void> {
    this.destroyForRoom(room);

    const area = room.area;
    if(!area){
      return;
    }

    let textureName = (area.grass?.textureName || "").trim();
    if(!textureName){
      textureName = "grass";
    }

    const density = area.grass?.density ?? 0;
    const quadSize = area.grass?.quadSize ?? 0;
    if(!(density > 0) || !(quadSize > 0)){
      return;
    }

    if(!room.model){
      return;
    }

    const aabb = room.model.aabb instanceof OdysseyModelNodeAABB ? room.model.aabb : undefined;
    const walkmesh = room.collisionManager?.walkmesh;
    const resolved = resolveGrassFaces(walkmesh, aabb);
    if(!resolved.faces.length){
      return;
    }

    const probability = new THREE.Vector4(
      area.grass.probability.lowerLeft,
      area.grass.probability.lowerRight,
      area.grass.probability.upperLeft,
      area.grass.probability.upperRight
    );
    normalizeGrassProbability(probability);

    const bladeGeom = this.createBladeGeometry(quadSize);
    const placements = this.placeBlades(
      room,
      resolved.faces,
      resolved.source,
      resolved.aabbVertices,
      resolved.walkmesh,
      aabb,
      density,
      quadSize,
      probability
    );

    if(!placements.length){
      bladeGeom.dispose();
      return;
    }

    const material = this.createMaterial(area, quadSize);
    WindManager.bindWindUniforms(material.uniforms, material);

    const lmName = resolved.source === "aabb" ? aabb?.textureMap2 : undefined;
    await this.loadTextures(material, textureName, lmName);

    const bins = this.buildBins(room, bladeGeom, material, placements, resolved.source, aabb);
    bladeGeom.dispose();

    if(!bins.length){
      material.dispose();
      return;
    }

    const group = new THREE.Group();
    group.name = `grass_${room.roomName}`;
    for(const bin of bins){
      group.add(bin.mesh);
    }
    GameState.group.grass.add(group);

    (room as any).grass = group;
    (room as any).grassBins = bins;
    this.rooms.set(room, bins);
  }

  destroyForRoom(room: AreaRoom): void {
    const bins = this.rooms.get(room) || (room as any).grassBins;
    if(bins?.length){
      this.disposeBins(bins);
    }
    this.rooms.delete(room);

    const group = (room as any).grass;
    if(group){
      group.removeFromParent();
      (room as any).grass = undefined;
    }
    (room as any).grassBins = undefined;
  }

  /** Per-frame bin fade from camera; call after WindManager.update. */
  update(_delta: number = 0): void {
    const cam = GameState.currentCamera;
    if(cam){
      cam.getWorldPosition(this._camPos);
    }else{
      this._camPos.copy(GameState.currentCameraPosition || this._camPos);
    }

    for(const bins of this.rooms.values()){
      for(let i = 0; i < bins.length; i++){
        const bin = bins[i];
        const dx = bin.center.x - this._camPos.x;
        const dy = bin.center.y - this._camPos.y;
        const dz = bin.center.z - this._camPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const fade = computeBinFade(distSq, GRASS_NEAR_RADIUS_SQ, GRASS_FAR_RADIUS_SQ);
        bin.fade = fade;
        bin.mesh.visible = fade > 0 && bin.mesh.userData.roomGrassVisible !== false;
      }
    }
  }

  setRoomVisible(room: AreaRoom, visible: boolean): void {
    const bins = (room as any).grassBins as GrassBin[] | undefined;
    const group = (room as any).grass as THREE.Object3D | undefined;
    if(group){
      group.visible = visible;
    }
    if(!bins){
      return;
    }
    for(let i = 0; i < bins.length; i++){
      bins[i].mesh.userData.roomGrassVisible = visible;
      if(!visible){
        bins[i].mesh.visible = false;
      }
    }
  }

  static setInstance(manager: GrassManager): void {
    GrassManager._instance = manager;
  }

  static getInstance(): GrassManager | null {
    return GrassManager._instance;
  }

  private disposeBins(bins: GrassBin[]): void {
    let sharedMaterial: THREE.ShaderMaterial | undefined;
    for(const bin of bins){
      bin.mesh.geometry.dispose();
      sharedMaterial = bin.mesh.material;
      bin.mesh.removeFromParent();
    }
    sharedMaterial?.dispose();
  }

  private createBladeGeometry(quadSize: number): THREE.BufferGeometry {
    const half = quadSize * 0.5;
    const positions = new Float32Array([
      -half, 0, 0,
      half, 0, 0,
      half, quadSize, 0,
      -half, quadSize, 0,
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
    ]);
    const normals = new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ]);
    const constraint = new Float32Array([0, 0, 1, 1]);
    const quadIdx = new Float32Array([0, 0, 0, 0]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geom.setAttribute("constraint", new THREE.BufferAttribute(constraint, 1));
    geom.setAttribute("quadIdx", new THREE.BufferAttribute(quadIdx, 1));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    return geom;
  }

  private createMaterial(area: any, quadSize: number): THREE.ShaderMaterial {
    const grassShader = GameState.ShaderManager.Shaders.get("grass");
    const ambient = colorFromAreDword(area.grass?.ambient ?? 0);
    const diffuse = colorFromAreDword(area.grass?.diffuse ?? 0);
    // ARE sometimes stores 0/0; fall back to white so lightmap/texture remain visible.
    if(ambient.r + ambient.g + ambient.b < 1e-4 && diffuse.r + diffuse.g + diffuse.b < 1e-4){
      ambient.setRGB(1, 1, 1);
      diffuse.setRGB(1, 1, 1);
    }

    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib["common"],
        {
          map: { value: null },
          lightMap: { value: null },
          time: { value: 0 },
          ambientColor: { value: ambient },
          diffuseColor: { value: diffuse },
          planeHeightJitter: { value: 0.05 },
          quadSize: { value: quadSize },
          grassStiffness: { value: 1.0 },
          binFade: { value: 1.0 },
          alphaTest: { value: GRASS_ALPHA_TEST_DEFAULT },
        },
      ]),
      vertexShader: grassShader.getVertex(),
      fragmentShader: grassShader.getFragment(),
      side: THREE.DoubleSide,
      // Transparent so grass draws after opaque terrain (avoids z-disappear).
      // depthWrite still on — bin draw keeps the depth mask —
      // so later additive sabers depth-test against blades.
      transparent: true,
      depthWrite: true,
      blending: THREE.NormalBlending,
    });
    return material;
  }

  private async loadTextures(
    material: THREE.ShaderMaterial,
    textureName: string,
    lightmapName?: string
  ): Promise<void> {
    const diffuseMap: OdysseyTexture = await TextureLoader.Load(textureName);
    if(diffuseMap){
      diffuseMap.minFilter = THREE.LinearFilter;
      diffuseMap.magFilter = THREE.LinearFilter;
      material.uniforms.map.value = diffuseMap;
      material.defines.USE_MAP = "";
      material.defines.USE_UV = "";
      material.needsUpdate = true;
    }

    if(!lightmapName){
      return;
    }
    const lightMap: OdysseyTexture = await TextureLoader.Load(lightmapName);
    if(!lightMap){
      return;
    }
    lightMap.minFilter = THREE.LinearFilter;
    lightMap.magFilter = THREE.LinearFilter;
    material.uniforms.lightMap.value = lightMap;
    material.defines.ODYSSEY_GRASS_LIGHTMAP = "";
    material.needsUpdate = true;
  }

  private placeBlades(
    room: AreaRoom,
    faces: OdysseyFace3[],
    source: GrassFaceSource,
    aabbVertices: number[] | undefined,
    walkmesh: any,
    aabb: OdysseyModelNodeAABB | undefined,
    density: number,
    quadSize: number,
    probability: THREE.Vector4
  ): BladePlacement[] {
    const placements: BladePlacement[] = [];
    const FA = new THREE.Vector3();
    const FB = new THREE.Vector3();
    const FC = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const side = new THREE.Vector3();
    const up = new THREE.Vector3();
    const right = new THREE.Vector3();
    const root = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const uvA = new THREE.Vector2();
    const uvB = new THREE.Vector2();
    const uvC = new THREE.Vector2();

    const faceIndexByRef = new Map<OdysseyFace3, number>();
    const grassFaceIndexSet = new Set<number>();
    for(let i = 0; i < faces.length; i++){
      faceIndexByRef.set(faces[i], i);
      grassFaceIndexSet.add(i);
    }

    // Rebuild adjacency set using face.adjacent when present
    for(let i = 0; i < faces.length; i++){
      const face = faces[i];
      if(!face.adjacent) continue;
      // adjacency indices refer to walkable/aabb face lists — keep edge padding best-effort
    }

    const edgePadding = quadSize * 0.5;
    const maxAttempts = 8;
    // WOK verts are already world-space; AABB verts are local to room+aabb.
    const roomOffset = grassMeshOffset(source, room.position, aabb?.position);

    const uv2 = aabb?.tvectors?.[1];
    // Lightmap UVs are authored on the AABB/MDL mesh, not the WOK.
    const hasLightmapUV = !!(source === "aabb" && aabb?.textureMap2 && uv2?.length);

    const triangle = new THREE.Triangle();

    for(let k = 0; k < faces.length; k++){
      const face = faces[k];
      faceVertexPositions(face, source, aabbVertices, walkmesh, FA, FB, FC);
      triangle.set(FA, FB, FC);
      const area = triangle.getArea();
      const grassCount = computeFaceGrassCount(area, density);
      if(grassCount < 1) continue;

      normal.copy(face.normal);
      if(normal.lengthSq() < 1e-10){
        normal.subVectors(FB, FA).cross(tmp.subVectors(FC, FA));
        if(normal.lengthSq() < 1e-10){
          normal.set(0, 0, 1);
        }else{
          normal.normalize();
        }
      }else{
        normal.normalize();
      }

      side.subVectors(FB, FA);
      if(side.lengthSq() <= 1e-6){
        side.crossVectors(normal, new THREE.Vector3(0, 0, 1));
      }
      if(side.lengthSq() <= 1e-6){
        side.set(1, 0, 0);
      }
      side.normalize();

      const blockedAB = this.isBlockedEdge(face, 0, grassFaceIndexSet, faceIndexByRef);
      const blockedBC = this.isBlockedEdge(face, 1, grassFaceIndexSet, faceIndexByRef);
      const blockedCA = this.isBlockedEdge(face, 2, grassFaceIndexSet, faceIndexByRef);

      if(hasLightmapUV && uv2){
        uvA.set(uv2[face.a * 2], uv2[face.a * 2 + 1]);
        uvB.set(uv2[face.b * 2], uv2[face.b * 2 + 1]);
        uvC.set(uv2[face.c * 2], uv2[face.c * 2 + 1]);
      }

      for(let j = 0; j < grassCount; j++){
        let accepted = false;
        let wa = 0;
        let wb = 0;
        let wc = 0;

        for(let attempt = 0; attempt < maxAttempts; attempt++){
          wa = Math.random();
          wb = Math.random();
          wc = Math.random();
          const sum = wa + wb + wc;
          if(sum > 0){
            wa /= sum;
            wb /= sum;
            wc /= sum;
          }

          root.set(
            wa * FA.x + wb * FB.x + wc * FC.x,
            wa * FA.y + wb * FB.y + wc * FC.y,
            wa * FA.z + wb * FB.z + wc * FC.z
          );

          if(blockedAB && this.pointToSegmentDistance(root, FA, FB) < edgePadding) continue;
          if(blockedBC && this.pointToSegmentDistance(root, FB, FC) < edgePadding) continue;
          if(blockedCA && this.pointToSegmentDistance(root, FC, FA) < edgePadding) continue;

          accepted = true;
          break;
        }

        if(!accepted) continue;

        // Blade basis: X = side (width), Y = normal (up the blade), Z = bitangent
        right.copy(side);
        up.copy(normal);
        const bitangent = tmp.crossVectors(right, up).normalize();
        // Re-orthogonalize right
        right.crossVectors(up, bitangent).normalize();

        basis.makeBasis(right, up, bitangent);
        basis.setPosition(root);

        const lm = new THREE.Vector2(0, 0);
        if(hasLightmapUV){
          lm.set(
            uvA.x * wa + uvB.x * wb + uvC.x * wc,
            uvA.y * wa + uvB.y * wb + uvC.y * wc
          );
        }

        placements.push({
          matrix: basis.clone(),
          grassQuad: pickGrassTextureQuad(probability),
          lightmapUV: lm,
          instanceID: placements.length,
          worldX: root.x + roomOffset.x,
          worldY: root.y + roomOffset.y,
        });
      }
    }

    return placements;
  }

  private buildBins(
    room: AreaRoom,
    bladeGeom: THREE.BufferGeometry,
    material: THREE.ShaderMaterial,
    placements: BladePlacement[],
    source: GrassFaceSource,
    aabb: OdysseyModelNodeAABB | undefined
  ): GrassBin[] {
    const buckets = new Map<string, BladePlacement[]>();
    for(let i = 0; i < placements.length; i++){
      const p = placements[i];
      const key = binCellKey(p.worldX, p.worldY, GRASS_BIN_CELL_SIZE);
      let list = buckets.get(key);
      if(!list){
        list = [];
        buckets.set(key, list);
      }
      list.push(p);
    }

    // WOK verts are world-space already — leave mesh at origin.
    // AABB verts are room/aabb-local — offset the instanced mesh.
    const meshOffset = grassMeshOffset(source, room.position, aabb?.position);

    const bins: GrassBin[] = [];
    for(const list of buckets.values()){
      if(!list.length) continue;

      const cloned = bladeGeom.clone();
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.index = cloned.index;
      geometry.attributes.position = cloned.attributes.position;
      geometry.attributes.normal = cloned.attributes.normal;
      geometry.attributes.uv = cloned.attributes.uv;
      geometry.attributes.constraint = cloned.attributes.constraint;
      geometry.attributes.quadIdx = cloned.attributes.quadIdx;

      const count = list.length;
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.frustumCulled = true;
      mesh.userData.roomGrassVisible = true;
      mesh.position.copy(meshOffset);

      const instanceIds = new Float32Array(count);
      const grassQuads = new Float32Array(count);
      const lightmapUV = new Float32Array(count * 2);
      const center = new THREE.Vector3();

      for(let i = 0; i < count; i++){
        const p = list[i];
        mesh.setMatrixAt(i, p.matrix);
        instanceIds[i] = p.instanceID;
        grassQuads[i] = p.grassQuad;
        lightmapUV[i * 2] = p.lightmapUV.x;
        lightmapUV[i * 2 + 1] = p.lightmapUV.y;
        const local = new THREE.Vector3().setFromMatrixPosition(p.matrix);
        center.add(local);
      }
      center.multiplyScalar(1 / count);
      center.add(meshOffset);

      mesh.instanceMatrix.needsUpdate = true;
      geometry.setAttribute("instanceID", new THREE.InstancedBufferAttribute(instanceIds, 1));
      geometry.setAttribute("grassQuad", new THREE.InstancedBufferAttribute(grassQuads, 1));
      geometry.setAttribute("lightmapUV", new THREE.InstancedBufferAttribute(lightmapUV, 2));
      geometry.computeBoundingSphere();

      // three@0.149 frustum tests use geometry.boundingSphere (not mesh.boundingSphere).
      // InstancedMesh defaults frustumCulled=false for this reason — replace the unit-blade
      // sphere with one that covers every instance root in local space.
      const instanceBox = new THREE.Box3();
      const instancePos = new THREE.Vector3();
      const instanceMatrix = new THREE.Matrix4();
      for(let i = 0; i < count; i++){
        mesh.getMatrixAt(i, instanceMatrix);
        instancePos.setFromMatrixPosition(instanceMatrix);
        instanceBox.expandByPoint(instancePos);
      }
      const instanceSphere = new THREE.Sphere();
      instanceBox.getBoundingSphere(instanceSphere);
      const bladeRadius = geometry.boundingSphere?.radius ?? 1;
      instanceSphere.radius += bladeRadius;
      geometry.boundingSphere = instanceSphere;
      mesh.boundingSphere = instanceSphere.clone();

      const bin: GrassBin = { mesh, center, fade: 1 };
      mesh.onBeforeRender = () => {
        const u = material.uniforms?.binFade;
        if(u){
          u.value = bin.fade;
        }
      };

      bins.push(bin);
    }

    return bins;
  }

  private isBlockedEdge(
    face: OdysseyFace3,
    edgeIndex: number,
    grassFaceIndexSet: Set<number>,
    _faceIndexByRef: Map<OdysseyFace3, number>
  ): boolean {
    const adjacentFaceIndex = face.adjacent?.[edgeIndex];
    if(typeof adjacentFaceIndex !== "number" || adjacentFaceIndex < 0){
      return true;
    }
    return !grassFaceIndexSet.has(adjacentFaceIndex);
  }

  private readonly _edgeTmp = new THREE.Vector3();
  private readonly _pointTmp = new THREE.Vector3();
  private readonly _closestTmp = new THREE.Vector3();

  private pointToSegmentDistance(point: THREE.Vector3, segA: THREE.Vector3, segB: THREE.Vector3): number {
    this._edgeTmp.subVectors(segB, segA);
    this._pointTmp.subVectors(point, segA);
    const edgeLenSq = this._edgeTmp.lengthSq();
    if(edgeLenSq <= 0){
      return point.distanceTo(segA);
    }
    const t = Math.max(0, Math.min(1, this._pointTmp.dot(this._edgeTmp) / edgeLenSq));
    this._closestTmp.copy(segA).addScaledVector(this._edgeTmp, t);
    return point.distanceTo(this._closestTmp);
  }
}
