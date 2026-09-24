import * as THREE from "three";
import type { OdysseyModel3D } from "@/three/odyssey/OdysseyModel3D";
import { enableOdysseyLightmapDefines, syncOdysseyMapTransforms } from "@/shaders/chunks/OdysseyLighting";

interface AtlasRect {
  u: number;
  v: number;
  su: number;
  sv: number;
}

export function atlasRectFromPlacement(
  placement: { x: number; y: number; w: number; h: number },
  atlasW: number,
  atlasH: number,
): AtlasRect {
  return {
    u: placement.x / atlasW,
    // Canvas placements are top-down, while a flipY=true texture's UV origin
    // is bottom-left. Convert the cell's bottom edge into texture UV space.
    v: 1 - ((placement.y + placement.h) / atlasH),
    su: placement.w / atlasW,
    sv: placement.h / atlasH,
  };
}

function diffuseFingerprint(mat: THREE.Material): string {
  const sm = mat as THREE.ShaderMaterial;
  const ud = (mat as any).userData || {};
  const mapName = ud.map || sm.uniforms?.map?.value?.name || "NONE";
  const defines = sm.defines ? Object.keys(sm.defines).filter((k) => k !== "USE_LIGHTMAP").sort().join(",") : "";
  return [
    mapName,
    defines,
    mat.transparent ? 1 : 0,
    mat.blending | 0,
    mat.side | 0,
    mat.depthWrite === false ? 0 : 1,
  ].join("|");
}

function getLightmapTexture(mat: THREE.Material): THREE.Texture | null {
  const sm = mat as THREE.ShaderMaterial;
  return (sm.uniforms?.lightMap?.value as THREE.Texture) || null;
}

function nextPow2(n: number): number {
  let p = 1;
  while(p < n){ p <<= 1; }
  return p;
}

function textureImageSize(t: THREE.Texture): { w: number; h: number } {
  const img = t.image as { width?: number; height?: number; videoWidth?: number; videoHeight?: number } | undefined;
  const w = (img?.width | 0) || (img?.videoWidth | 0) || 64;
  const h = (img?.height | 0) || (img?.videoHeight | 0) || 64;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

/** Blit a source lightmap into the atlas canvas (handles canvas / image / ImageBitmap). */
function blitLightmap(
  ctx: CanvasRenderingContext2D,
  tex: THREE.Texture,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const img = tex.image as any;
  if(!img){ return false; }
  try {
    ctx.drawImage(img as CanvasImageSource, x, y, w, h);
    return true;
  }catch(_e){
    // fall through
  }
  // DataTexture / raw pixel buffer
  const data = img.data as ArrayLike<number> | undefined;
  const iw = img.width | 0;
  const ih = img.height | 0;
  if(data && iw > 0 && ih > 0){
    try {
      const tmp = document.createElement("canvas");
      tmp.width = iw;
      tmp.height = ih;
      const tctx = tmp.getContext("2d");
      if(!tctx){ return false; }
      const rgba = data instanceof Uint8ClampedArray
        ? data
        : new Uint8ClampedArray(data as ArrayLike<number>);
      // Only handle RGBA8-sized buffers
      if(rgba.length >= iw * ih * 4){
        tctx.putImageData(new ImageData(rgba.length === iw * ih * 4 ? rgba : new Uint8ClampedArray(rgba.buffer.slice(0, iw * ih * 4)), iw, ih), 0, 0);
        ctx.drawImage(tmp, x, y, w, h);
        return true;
      }
    }catch(_e2){
      return false;
    }
  }
  return false;
}

/**
 * Pack lightmap images into one CanvasTexture. Returns normalized UV rects
 * (u,v = bottom-left origin, su,sv = scale) in the same flipY=true space as
 * OdysseyTexture lightmaps.
 */
export function packLightmapAtlas(textures: THREE.Texture[]): { atlas: THREE.CanvasTexture; rects: AtlasRect[] } | null {
  if(!textures.length){ return null; }

  const sizes = textures.map((t) => textureImageSize(t));

  // Shelf pack
  const maxDim = Math.max(...sizes.map((s) => Math.max(s.w, s.h)));
  let atlasW = nextPow2(Math.min(4096, Math.max(maxDim, 256)));
  let x = 0;
  let y = 0;
  let rowH = 0;
  const placements: { x: number; y: number; w: number; h: number }[] = [];

  for(let i = 0; i < sizes.length; i++){
    const { w, h } = sizes[i];
    if(x + w > atlasW){
      x = 0;
      y += rowH;
      rowH = 0;
    }
    placements.push({ x, y, w, h });
    x += w;
    rowH = Math.max(rowH, h);
  }
  const atlasH = nextPow2(y + rowH);

  if(typeof document === "undefined"){
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext("2d");
  if(!ctx){ return null; }
  // Opaque black — transparent cells read as zero light
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, atlasW, atlasH);

  const rects: AtlasRect[] = [];
  let blitted = 0;
  for(let i = 0; i < textures.length; i++){
    const p = placements[i];
    if(blitLightmap(ctx, textures[i], p.x, p.y, p.w, p.h)){
      blitted++;
    }
    rects.push(atlasRectFromPlacement(p, atlasW, atlasH));
  }

  if(blitted < 1){
    return null;
  }

  const atlas = new THREE.CanvasTexture(canvas);
  atlas.name = "odysseyLightmapAtlas";
  // Must match OdysseyTexture lightmaps or remapped uv1 samples upside-down.
  atlas.flipY = true;
  atlas.needsUpdate = true;
  atlas.magFilter = THREE.LinearFilter;
  atlas.minFilter = THREE.LinearFilter;
  atlas.wrapS = THREE.ClampToEdgeWrapping;
  atlas.wrapT = THREE.ClampToEdgeWrapping;
  return { atlas, rects };
}

function remapVertexUv2(
  uv2: THREE.BufferAttribute,
  vi: number,
  rect: AtlasRect,
): void {
  const arr = uv2.array as Float32Array;
  const o = vi * 2;
  arr[o] = arr[o] * rect.su + rect.u;
  arr[o + 1] = arr[o + 1] * rect.sv + rect.v;
}

/** Remap every unique vertex referenced by the given geometry groups once. */
function remapGroupsUv2(
  geo: THREE.BufferGeometry,
  uv2: THREE.BufferAttribute,
  groups: Array<{ start: number; count: number }>,
  rect: AtlasRect,
): void {
  const index = geo.index;
  const touched = new Set<number>();
  if(index){
    for(let g = 0; g < groups.length; g++){
      const grp = groups[g];
      const end = grp.start + grp.count;
      for(let i = grp.start; i < end; i++){
        const vi = index.getX(i);
        if(touched.has(vi)){ continue; }
        touched.add(vi);
        remapVertexUv2(uv2, vi, rect);
      }
    }
  }else{
    for(let g = 0; g < groups.length; g++){
      const grp = groups[g];
      const end = grp.start + grp.count;
      for(let vi = grp.start; vi < end; vi++){
        if(touched.has(vi)){ continue; }
        touched.add(vi);
        remapVertexUv2(uv2, vi, rect);
      }
    }
  }
}

/**
 * Collapse a room `mergedMesh` multi-material list by atlasing lightmaps that
 * share the same diffuse fingerprint. Returns number of material slots removed.
 */
export function collapseMergedMeshLightmaps(model: OdysseyModel3D): number {
  const mesh = model.mergedMesh;
  if(!mesh || !Array.isArray(mesh.material)){ return 0; }
  if(mesh.userData.odysseyLightmapAtlasDone){ return 0; }

  const mats = mesh.material as THREE.Material[];
  const geo = mesh.geometry as THREE.BufferGeometry;
  if(!geo?.groups?.length || mats.length < 2){ return 0; }

  const uv2 = geo.getAttribute("uv1") as THREE.BufferAttribute | undefined;
  if(!uv2){ return 0; }

  // One material may own several groups after mergeStatic (shared ShaderMaterial).
  const groupsByMat = new Map<number, Array<{ start: number; count: number; materialIndex?: number }>>();
  for(let g = 0; g < geo.groups.length; g++){
    const grp = geo.groups[g];
    const mi = grp.materialIndex ?? 0;
    let list = groupsByMat.get(mi);
    if(!list){
      list = [];
      groupsByMat.set(mi, list);
    }
    list.push(grp);
  }

  const buckets = new Map<string, number[]>();
  for(let i = 0; i < mats.length; i++){
    const mat = mats[i];
    if(!mat){ continue; }
    const lm = getLightmapTexture(mat);
    if(!lm?.image){ continue; }
    const fp = diffuseFingerprint(mat);
    let list = buckets.get(fp);
    if(!list){
      list = [];
      buckets.set(fp, list);
    }
    list.push(i);
  }

  let removed = 0;
  const newMats = mats.slice();
  const remapIndex = mats.map((_, i) => i);

  for(const [, indices] of buckets){
    if(indices.length < 2){ continue; }

    const textures: THREE.Texture[] = [];
    const usable: number[] = [];
    for(const mi of indices){
      const lm = getLightmapTexture(newMats[mi]);
      if(!lm?.image){ continue; }
      // Skip already-atlased sources (should not happen on first pass).
      if((lm as any).name === "odysseyLightmapAtlas"){ continue; }
      textures.push(lm);
      usable.push(mi);
    }
    if(usable.length < 2){ continue; }

    const packed = packLightmapAtlas(textures);
    if(!packed){ continue; }

    const keep = usable[0];
    const keepMat = newMats[keep] as THREE.ShaderMaterial;
    if(keepMat.uniforms?.lightMap){
      keepMat.uniforms.lightMap.value = packed.atlas;
      syncOdysseyMapTransforms(keepMat.uniforms, 'lightMap', packed.atlas);
    }
    enableOdysseyLightmapDefines(keepMat, true);
    keepMat.uniformsNeedUpdate = true;
    keepMat.userData.odysseyLightmapAtlas = true;

    for(let u = 0; u < usable.length; u++){
      const mi = usable[u];
      const groups = groupsByMat.get(mi);
      if(groups?.length){
        remapGroupsUv2(geo, uv2, groups, packed.rects[u]);
      }

      if(mi !== keep){
        remapIndex[mi] = keep;
        removed++;
      }
    }
    uv2.needsUpdate = true;
  }

  if(removed <= 0){
    return 0;
  }

  // Compact: keep materials that are still canonical targets
  const keepSet = new Set<number>();
  for(let i = 0; i < remapIndex.length; i++){
    keepSet.add(remapIndex[i]);
  }
  const compact: THREE.Material[] = [];
  const oldToNew = new Map<number, number>();
  for(const oldIdx of [...keepSet].sort((a, b) => a - b)){
    oldToNew.set(oldIdx, compact.length);
    compact.push(newMats[oldIdx]);
  }

  for(let g = 0; g < geo.groups.length; g++){
    const grp = geo.groups[g];
    const oldMi = grp.materialIndex ?? 0;
    const canon = remapIndex[oldMi] ?? oldMi;
    const ni = oldToNew.get(canon);
    if(typeof ni === "number"){
      grp.materialIndex = ni;
    }
  }

  mesh.material = compact.length === 1 ? compact[0] : compact;
  mesh.userData.odysseyLightmapAtlasDone = true;

  if(Array.isArray(model.materials)){
    for(let i = 0; i < compact.length; i++){
      if(!model.materials.includes(compact[i])){
        model.materials.push(compact[i]);
      }
    }
  }

  return removed;
}

/** Atlas lightmaps on every room merged mesh in an area. */
export function collapseAreaRoomLightmaps(rooms: { model?: OdysseyModel3D }[]): number {
  let total = 0;
  for(let i = 0; i < rooms.length; i++){
    const m = rooms[i]?.model;
    if(m){ total += collapseMergedMeshLightmaps(m); }
  }
  return total;
}
