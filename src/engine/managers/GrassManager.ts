import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { WindManager } from "@engine/managers/WindManager";
import { TextureLoader } from "@engine/loaders";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { OdysseyModelNodeAABB } from "@engine/odyssey/OdysseyModelNodeAABB";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import type { AreaRoom } from "@engine/module/area/AreaRoom";
import {
  GRASS_ALPHA_TEST_DEFAULT,
  GRASS_BIN_CELL_SIZE,
  GRASS_BLADE_SEGMENTS,
  GRASS_CLUMP_CARDS,
  GRASS_DENSITY_SCALE,
  binCellKey,
  colorFromAreDword,
  computeFaceGrassCount,
  computeGrassBoundaryEdges,
  computeGrassLodFraction,
  faceVertexPositions,
  grassInstanceRank,
  grassMeshOffset,
  grassValueNoise,
  grassVisibleInstanceCount,
  normalizeGrassProbability,
  pickGrassTextureQuad,
  resolveGrassFaces,
  shuffleInPlace,
  triangleR2Barycentric,
  type GrassFaceSource,
} from "@engine/managers/grass/grassHelpers";
import { GrassTrampleField } from "@engine/managers/grass/GrassTrampleField";

export type GrassBin = {
  mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  center: THREE.Vector3;
  /** Current LOD keep-fraction (0 = culled). */
  fade: number;
  /** World-space bounds of blade roots, for nearest-distance LOD. */
  box?: THREE.Box3;
  /** Total instances in the bin; mesh.count is the visible prefix. */
  total?: number;
};

type BladePlacement = {
  matrix: THREE.Matrix4;
  grassQuads: [number, number, number];
  lightmapUV: THREE.Vector2;
  seed: number;
  brightness: number;
  dryness: number;
  worldX: number;
  worldY: number;
};

type TrampleBody = {
  position: THREE.Vector3;
  area?: unknown;
  isDead?: () => boolean;
  getHitRadius?: () => number;
  getPersonalSpace?: () => number;
};

/** Blend of face normal -> world up for blade growth direction. */
const GRASS_UPRIGHT_BIAS = 0.7;
/** Fraction of quadSize over which blades taper down at grass borders. */
const GRASS_EDGE_TAPER = 0.6;

/**
 * Scene-level grass: ARE params, WOK/AABB placement, spatial bins, GPU wind.
 */
export class GrassManager {
  context: any;
  private rooms = new Map<object, GrassBin[]>();
  private _camPos = new THREE.Vector3();
  private _closest = new THREE.Vector3();
  private static _instance: GrassManager | null = null;

  /** Persistent trample field shared by every grass material. */
  readonly trample = new GrassTrampleField();
  /** Shared uniform objects so every room material sees the same values. */
  private readonly timeUniform = { value: 0 };
  private readonly trampleMapUniform = { value: this.trample.texture as THREE.Texture };
  private readonly trampleWindowUniform = { value: this.trample.window };
  private readonly lastBodyPos = new WeakMap<object, THREE.Vector2>();

  init(context: any): void {
    this.context = context;
  }

  clear(): void {
    for(const bins of this.rooms.values()){
      this.disposeBins(bins);
    }
    this.rooms.clear();
    this.trample.clear();
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

    const bladeGeom = this.createClumpGeometry(quadSize);
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

  /** Per-frame LOD, trample simulation and clock; call after WindManager.update. */
  update(delta: number = 0): void {
    const cam = GameState.currentCamera;
    if(cam){
      cam.getWorldPosition(this._camPos);
    }else{
      this._camPos.copy(GameState.currentCameraPosition || this._camPos);
    }

    if(!this.rooms.size){
      return;
    }

    this.timeUniform.value = (this.timeUniform.value + delta) % 3600;

    for(const bins of this.rooms.values()){
      for(let i = 0; i < bins.length; i++){
        const bin = bins[i];
        const total = bin.total ?? bin.mesh.count;
        let dist: number;
        if(bin.box){
          bin.box.clampPoint(this._camPos, this._closest);
          dist = this._closest.distanceTo(this._camPos);
        }else{
          dist = bin.center.distanceTo(this._camPos);
        }
        const keep = computeGrassLodFraction(dist);
        bin.fade = keep;
        bin.mesh.count = grassVisibleInstanceCount(total, keep);
        bin.mesh.visible = bin.mesh.count > 0 && bin.mesh.userData.roomGrassVisible !== false;
      }
    }

    this.updateTrample(delta);
  }

  private updateTrample(delta: number): void {
    const field = this.trample;
    field.setFocus(this._camPos.x, this._camPos.y);

    const area = GameState.module?.area as any;
    const bodies = new Set<TrampleBody>();
    const creatures: TrampleBody[] | undefined = area?.creatures;
    if(creatures){
      for(let i = 0; i < creatures.length; i++) bodies.add(creatures[i]);
    }
    const party: TrampleBody[] | undefined = (GameState.PartyManager as any)?.party;
    if(party){
      for(let i = 0; i < party.length; i++) bodies.add(party[i]);
    }

    const dt = Math.max(delta, 1e-4);
    for(const body of bodies){
      if(!body?.position) continue;
      if(area && body.area && body.area !== area) continue;
      const pos = body.position;
      let last = this.lastBodyPos.get(body);
      if(!last){
        last = new THREE.Vector2(pos.x, pos.y);
        this.lastBodyPos.set(body, last);
      }
      let vx = (pos.x - last.x) / dt;
      let vy = (pos.y - last.y) / dt;
      // Teleports / spawns are not footsteps.
      if(vx * vx + vy * vy > 30 * 30){
        vx = 0;
        vy = 0;
      }
      last.set(pos.x, pos.y);

      const dead = body.isDead?.() === true;
      const radius = this.bodyFootprint(body) * (dead ? 1.4 : 1);
      // Moving feet press hard; standing bodies still flatten what's under them.
      const speed = Math.hypot(vx, vy);
      const weight = dead ? 0.95 : Math.min(1, 0.7 + speed * 0.15);
      field.stamp(pos.x, pos.y, radius, vx, vy, weight, delta);
    }

    field.update(delta);
  }

  private bodyFootprint(body: TrampleBody): number {
    let r = 0.5;
    try{
      const hit = body.getHitRadius?.();
      const personal = body.getPersonalSpace?.();
      r = Math.max(typeof hit === "number" ? hit : 0, typeof personal === "number" ? personal : 0, 0.3);
    }catch(_e){
      r = 0.5;
    }
    // Legs and body part grass well beyond the collision radius.
    return Math.min(Math.max(r * 2.2, 0.7), 3.5);
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

  /**
   * Clump of crossed cards (60 degrees apart), each split into vertical
   * segments so the shader can curve it. uv.y doubles as height-along-blade.
   */
  private createClumpGeometry(quadSize: number): THREE.BufferGeometry {
    const cards = GRASS_CLUMP_CARDS;
    const segs = GRASS_BLADE_SEGMENTS;
    const rows = segs + 1;
    const vertsPerCard = rows * 2;
    const half = quadSize * 0.5;

    const positions = new Float32Array(cards * vertsPerCard * 3);
    const uvs = new Float32Array(cards * vertsPerCard * 2);
    const quadIdx = new Float32Array(cards * vertsPerCard);
    const indices: number[] = [];

    for(let c = 0; c < cards; c++){
      const angle = (c / cards) * Math.PI;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      // Nudge each card off-centre so clumps don't read as perfect stars.
      const ox = Math.cos(angle + 1.9) * quadSize * 0.08;
      const oz = Math.sin(angle + 1.9) * quadSize * 0.08;
      const base = c * vertsPerCard;
      for(let r = 0; r < rows; r++){
        const t = r / segs;
        // Cards taper slightly toward the tip.
        const w = half * (1 - 0.12 * t);
        for(let side = 0; side < 2; side++){
          const v = base + r * 2 + side;
          const sgn = side === 0 ? -1 : 1;
          positions[v * 3] = ox + dx * w * sgn;
          positions[v * 3 + 1] = t * quadSize;
          positions[v * 3 + 2] = oz + dz * w * sgn;
          uvs[v * 2] = side;
          uvs[v * 2 + 1] = t;
          quadIdx[v] = c;
        }
        if(r < segs){
          const i0 = base + r * 2;
          indices.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geom.setAttribute("quadIdx", new THREE.BufferAttribute(quadIdx, 1));
    geom.setIndex(indices);
    geom.computeBoundingBox();
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
          ambientColor: { value: ambient },
          diffuseColor: { value: diffuse },
          quadSize: { value: quadSize },
          grassStiffness: { value: 1.0 },
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
    // Shared by reference (UniformsUtils.merge would clone them).
    material.uniforms.time = this.timeUniform;
    material.uniforms.grassTrampleMap = this.trampleMapUniform;
    material.uniforms.grassTrampleWindow = this.trampleWindowUniform;
    return material;
  }

  private async loadTextures(
    material: THREE.ShaderMaterial,
    textureName: string,
    lightmapName?: string
  ): Promise<void> {
    const diffuseMap: OdysseyTexture = await TextureLoader.Load(textureName);
    if(diffuseMap){
      // Dense fields shimmer badly without mips; the shader compensates
      // mip alpha so distant blades don't dissolve under the cutoff.
      const hasMips = (diffuseMap.mipmaps?.length ?? 0) > 1 ||
        (diffuseMap.generateMipmaps && !(diffuseMap as any).isCompressedTexture);
      const minFilter = hasMips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      if(diffuseMap.minFilter !== minFilter || diffuseMap.magFilter !== THREE.LinearFilter){
        diffuseMap.minFilter = minFilter;
        diffuseMap.magFilter = THREE.LinearFilter;
        diffuseMap.needsUpdate = true;
      }
      material.uniforms.map.value = diffuseMap;
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
    const up = new THREE.Vector3();
    const right = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const root = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const bary = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const uvA = new THREE.Vector2();
    const uvB = new THREE.Vector2();
    const uvC = new THREE.Vector2();
    const worldUp = new THREE.Vector3(0, 0, 1);
    const triangle = new THREE.Triangle();

    const boundary = computeGrassBoundaryEdges(faces, source, aabbVertices, walkmesh);
    const taper = quadSize * GRASS_EDGE_TAPER;
    // WOK verts are already world-space; AABB verts are local to room+aabb.
    const roomOffset = grassMeshOffset(source, room.position, aabb?.position);

    const uv2 = aabb?.tvectors?.[1];
    // Lightmap UVs are authored on the AABB/MDL mesh, not the WOK.
    const hasLightmapUV = !!(source === "aabb" && aabb?.textureMap2 && uv2?.length);

    for(let k = 0; k < faces.length; k++){
      const face = faces[k];
      faceVertexPositions(face, source, aabbVertices, walkmesh, FA, FB, FC);
      triangle.set(FA, FB, FC);
      const grassCount = computeFaceGrassCount(triangle.getArea(), density, GRASS_DENSITY_SCALE);
      if(grassCount < 1) continue;

      if(face.normal){
        normal.copy(face.normal);
      }else{
        normal.set(0, 0, 0);
      }
      if(normal.lengthSq() < 1e-10){
        triangle.getNormal(normal);
        if(normal.lengthSq() < 1e-10) normal.set(0, 0, 1);
      }
      normal.normalize();
      if(normal.z < 0) normal.negate();
      // Grass grows toward the sky, leaning only a little with the slope.
      up.copy(normal).lerp(worldUp, GRASS_UPRIGHT_BIAS).normalize();

      const edges = boundary[k];

      if(hasLightmapUV && uv2){
        uvA.set(uv2[face.a * 2], uv2[face.a * 2 + 1]);
        uvB.set(uv2[face.b * 2], uv2[face.b * 2 + 1]);
        uvC.set(uv2[face.c * 2], uv2[face.c * 2 + 1]);
      }

      const offU = Math.random();
      const offV = Math.random();
      for(let j = 0; j < grassCount; j++){
        triangleR2Barycentric(j, offU, offV, bary);
        const wa = bary.x;
        const wb = bary.y;
        const wc = bary.z;
        root.set(
          wa * FA.x + wb * FB.x + wc * FC.x,
          wa * FA.y + wb * FB.y + wc * FC.y,
          wa * FA.z + wb * FB.z + wc * FC.z
        );

        // Taper toward borders with paths/walls instead of a hard bald strip.
        let edgeScale = 1;
        if(edges){
          let d = Infinity;
          if(edges & 1) d = Math.min(d, this.pointToSegmentDistance(root, FA, FB));
          if(edges & 2) d = Math.min(d, this.pointToSegmentDistance(root, FB, FC));
          if(edges & 4) d = Math.min(d, this.pointToSegmentDistance(root, FC, FA));
          if(d < taper){
            const t = d / taper;
            if(t < 0.12) continue;
            edgeScale = 0.3 + 0.7 * t * t * (3 - 2 * t);
          }
        }

        const wx = root.x + roomOffset.x;
        const wy = root.y + roomOffset.y;
        // Meadow-scale height patches + per-clump jitter.
        const patch = grassValueNoise(wx * 0.11, wy * 0.11);
        const heightScale = (0.7 + 0.55 * patch) * (0.85 + Math.random() * 0.3) * edgeScale;
        const widthScale = (0.85 + Math.random() * 0.3) * (0.6 + 0.4 * edgeScale);

        // Random yaw about the growth axis.
        const yaw = Math.random() * Math.PI * 2;
        tmp.set(Math.cos(yaw), Math.sin(yaw), 0);
        right.copy(tmp).addScaledVector(up, -tmp.dot(up)).normalize();
        forward.crossVectors(right, up).normalize();

        basis.makeBasis(
          right.multiplyScalar(widthScale),
          tmp.copy(up).multiplyScalar(heightScale),
          forward.multiplyScalar(widthScale)
        );
        basis.setPosition(root);

        const lm = new THREE.Vector2(0, 0);
        if(hasLightmapUV){
          lm.set(
            uvA.x * wa + uvB.x * wb + uvC.x * wc,
            uvA.y * wa + uvB.y * wb + uvC.y * wc
          );
        }

        const dryPatch = grassValueNoise(wx * 0.07 + 31.7, wy * 0.07 - 12.3);
        placements.push({
          matrix: basis.clone(),
          grassQuads: [
            pickGrassTextureQuad(probability),
            pickGrassTextureQuad(probability),
            pickGrassTextureQuad(probability),
          ],
          lightmapUV: lm,
          seed: Math.random(),
          brightness: 0.86 + Math.random() * 0.22,
          dryness: Math.max(0, dryPatch - 0.55) * 1.6 * (0.6 + Math.random() * 0.4),
          worldX: wx,
          worldY: wy,
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

    const bladeHeight = bladeGeom.boundingBox
      ? Math.max(bladeGeom.boundingBox.max.y - bladeGeom.boundingBox.min.y, 1e-3)
      : 1;

    const bins: GrassBin[] = [];
    for(const list of buckets.values()){
      if(!list.length) continue;
      // Random order: any prefix is an even subset, so LOD can draw a prefix.
      shuffleInPlace(list);

      const cloned = bladeGeom.clone();
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.index = cloned.index;
      geometry.attributes.position = cloned.attributes.position;
      geometry.attributes.uv = cloned.attributes.uv;
      geometry.attributes.quadIdx = cloned.attributes.quadIdx;

      const count = list.length;
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.frustumCulled = true;
      mesh.userData.roomGrassVisible = true;
      mesh.position.copy(meshOffset);

      const grassQuads = new Float32Array(count * 3);
      const bladeParams = new Float32Array(count * 4);
      const lightmapUV = new Float32Array(count * 2);
      const center = new THREE.Vector3();
      const box = new THREE.Box3();
      const local = new THREE.Vector3();

      for(let i = 0; i < count; i++){
        const p = list[i];
        mesh.setMatrixAt(i, p.matrix);
        grassQuads[i * 3] = p.grassQuads[0];
        grassQuads[i * 3 + 1] = p.grassQuads[1];
        grassQuads[i * 3 + 2] = p.grassQuads[2];
        bladeParams[i * 4] = grassInstanceRank(i, count);
        bladeParams[i * 4 + 1] = p.seed;
        bladeParams[i * 4 + 2] = p.brightness;
        bladeParams[i * 4 + 3] = p.dryness;
        lightmapUV[i * 2] = p.lightmapUV.x;
        lightmapUV[i * 2 + 1] = p.lightmapUV.y;
        local.setFromMatrixPosition(p.matrix);
        center.add(local);
        box.expandByPoint(local);
      }
      center.multiplyScalar(1 / count);

      mesh.instanceMatrix.needsUpdate = true;
      geometry.setAttribute("grassQuads", new THREE.InstancedBufferAttribute(grassQuads, 3));
      geometry.setAttribute("bladeParams", new THREE.InstancedBufferAttribute(bladeParams, 4));
      geometry.setAttribute("lightmapUV", new THREE.InstancedBufferAttribute(lightmapUV, 2));

      // Frustum sphere: every root plus the tallest (widened, bent) blade.
      const instanceSphere = new THREE.Sphere();
      box.getBoundingSphere(instanceSphere);
      instanceSphere.radius += bladeHeight * 2.4;
      geometry.boundingSphere = instanceSphere;
      mesh.boundingSphere = instanceSphere.clone();

      center.add(meshOffset);
      box.translate(meshOffset);

      bins.push({ mesh, center, fade: 1, box, total: count });
    }

    return bins;
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
