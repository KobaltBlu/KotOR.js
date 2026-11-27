import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { AreaMap } from "@engine/module/area/AreaMap";
import { TextureLoader } from "@engine/loaders";
import { TPCObject } from "@core/resource/TPCObject";
import type { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";

/** JSON-safe area map texture + calibration for Dev Tools Scene view. */
export interface AreaMapOverlaySnapshot {
  available: boolean;
  textureDataUrl: string;
  /** Native lbl_map* pixel size (often 512×256). */
  textureWidth: number;
  textureHeight: number;
  logicalWidth: number;
  logicalHeight: number;
  northAxis: number;
  worldPt1X: number;
  worldPt1Y: number;
  worldPt2X: number;
  worldPt2Y: number;
  mapPt1X: number;
  mapPt1Y: number;
  mapPt2X: number;
  mapPt2Y: number;
  areaResRef: string;
}

export function emptyAreaMapOverlay(): AreaMapOverlaySnapshot {
  return {
    available: false,
    textureDataUrl: '',
    textureWidth: 0,
    textureHeight: 0,
    logicalWidth: 0,
    logicalHeight: 0,
    northAxis: 0,
    worldPt1X: 0,
    worldPt1Y: 0,
    worldPt2X: 0,
    worldPt2Y: 0,
    mapPt1X: 0,
    mapPt1Y: 0,
    mapPt2X: 0,
    mapPt2Y: 0,
    areaResRef: '',
  };
}

/** Build an AreaMap from an overlay snapshot (no fog / reveal data). */
export function areaMapFromOverlay(snap: AreaMapOverlaySnapshot): AreaMap {
  const map = new AreaMap();
  map.northAxis = snap.northAxis | 0;
  map.worldPt1X = snap.worldPt1X;
  map.worldPt1Y = snap.worldPt1Y;
  map.worldPt2X = snap.worldPt2X;
  map.worldPt2Y = snap.worldPt2Y;
  map.mapPt1X = snap.mapPt1X;
  map.mapPt1Y = snap.mapPt1Y;
  map.mapPt2X = snap.mapPt2X;
  map.mapPt2Y = snap.mapPt2Y;
  return map;
}

/**
 * World → display UV via AreaMap.toMapCoordinates (same path as in-game minimap).
 */
export function worldToOverlayMapUV(
  snap: AreaMapOverlaySnapshot,
  worldX: number,
  worldY: number
): { u: number; v: number; valid: boolean } {
  if(!snap.available){
    return { u: 0, v: 0, valid: false };
  }
  const map = areaMapFromOverlay(snap);
  const uv = map.toMapCoordinates(worldX, worldY);
  const u = uv.x;
  const v = uv.y;
  const valid = Number.isFinite(u) && Number.isFinite(v) && u >= 0 && u <= 1 && v >= 0 && v <= 1;
  return { u, v, valid };
}

/**
 * World → native texture pixel space for Dev Tools TopDownMap pins.
 * Uses toMapCoordinates UV × texture size (matches LBL_MapView display UV).
 */
export function worldToOverlayMapPoint(
  snap: AreaMapOverlaySnapshot,
  worldX: number,
  worldY: number
): { x: number; y: number; valid: boolean } {
  const texW = snap.textureWidth > 0 ? snap.textureWidth : snap.logicalWidth;
  const texH = snap.textureHeight > 0 ? snap.textureHeight : snap.logicalHeight;
  if(!snap.available || !texW || !texH){
    return { x: -1, y: -1, valid: false };
  }
  const { u, v, valid } = worldToOverlayMapUV(snap, worldX, worldY);
  return {
    x: u * texW,
    y: v * texH,
    valid,
  };
}

/**
 * Encode RGBA for TopDownMap. FlipY required (TPC row order → canvas / pin space).
 */
function rgbaToDataUrl(pixels: Uint8Array, width: number, height: number): string | null {
  if(width <= 0 || height <= 0 || !pixels?.length){ return null; }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if(!ctx){ return null; }
  try{
    const rgba = flipYRgba(pixels, width, height);
    const copy = new Uint8ClampedArray(rgba.length);
    copy.set(rgba);
    ctx.putImageData(new ImageData(copy, width, height), 0, 0);
    // JPEG keeps IPC payloads small enough for the debugger WebSocket.
    return canvas.toDataURL('image/jpeg', 0.92);
  }catch(e){
    console.warn('area map texture encode failed', e);
    return null;
  }
}

function flipYRgba(pixels: Uint8Array, width: number, height: number): Uint8Array {
  const stride = width * 4;
  const out = new Uint8Array(pixels.length);
  let dst = 0;
  for(let src = pixels.length - stride; src >= 0; src -= stride){
    out.set(pixels.subarray(src, src + stride), dst);
    dst += stride;
  }
  return out;
}

/**
 * OdysseyCompressedTexture.image is only {width,height} — decompress TPC mip0 to RGBA.
 * Matches Forge TextureCanvas / TabImageViewer decode path (not TextureLoader.Load alone).
 */
async function loadMapTextureDataUrl(resRef: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try{
    const result = await TextureLoader.tpcLoader.findTPC(resRef);
    if(result?.buffer){
      const tpc = new TPCObject({
        filename: resRef,
        file: result.buffer,
        pack: result.pack,
      });
      const dds = tpc.getDDS(false, { stitchCycleFrames: true });
      const mip = dds?.mipmaps?.[0];
      if(mip?.data && mip.width > 0 && mip.height > 0){
        const dataUrl = rgbaToDataUrl(Uint8Array.from(mip.data), mip.width, mip.height);
        if(dataUrl){
          return { dataUrl, width: mip.width, height: mip.height };
        }
      }
    }
  }catch(e){
    // Fall through to TextureLoader (TGA override / uncompressed).
  }

  try{
    const texture = await TextureLoader.Load(resRef);
    if(texture){
      const dataUrl = textureImageToDataUrl(texture);
      const img: any = (texture as any).image ?? (texture as any).mipmaps?.[0];
      const width = Number(img?.width || 0) | 0;
      const height = Number(img?.height || 0) | 0;
      if(dataUrl && width > 0 && height > 0){
        return { dataUrl, width, height };
      }
    }
  }catch(e){
    console.warn('loadMapTextureDataUrl: TextureLoader failed', resRef, e);
  }
  return null;
}

function textureImageToDataUrl(texture: OdysseyTexture | THREE.Texture): string | null {
  const img: any = (texture as any).image
    ?? (texture as any).source?.data
    ?? (texture as any).mipmaps?.[0];
  if(!img){ return null; }

  const width = Number(img.width || img.videoWidth || 0) | 0;
  const height = Number(img.height || img.videoHeight || 0) | 0;
  if(width <= 0 || height <= 0){ return null; }

  // Compressed TPC mipmaps are DXT byte arrays — not drawable / not raw RGBA.
  if(img.data && !(img instanceof ImageData) && !(img instanceof HTMLCanvasElement) && !(img instanceof HTMLImageElement)){
    const expected = width * height * 4;
    if(img.data.length === expected){
      return rgbaToDataUrl(Uint8Array.from(img.data), width, height);
    }
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if(!ctx){ return null; }

  try{
    if(typeof ImageData !== 'undefined' && img instanceof ImageData){
      ctx.putImageData(img, 0, 0);
    }else{
      ctx.drawImage(img as CanvasImageSource, 0, 0);
    }
    return canvas.toDataURL('image/jpeg', 0.92);
  }catch(e){
    console.warn('area map texture encode failed', e);
    return null;
  }
}

/**
 * Capture the current area's lbl_map* texture and WorldPt/MapPt calibration for Dev Tools.
 */
export async function snapshotAreaMapOverlay(): Promise<AreaMapOverlaySnapshot> {
  const empty = emptyAreaMapOverlay();
  const area = GameState.module?.area;
  const areaMap = area?.areaMap;
  if(!area || !areaMap || !(areaMap.mapResX > 0)){
    return empty;
  }

  const logical = AreaMap.getLogicalMapSize();
  const resRef = `lbl_map${area.name || ''}`;
  let textureDataUrl = '';
  let textureWidth = 0;
  let textureHeight = 0;
  try{
    const loaded = await loadMapTextureDataUrl(resRef);
    if(loaded){
      textureDataUrl = loaded.dataUrl;
      textureWidth = loaded.width;
      textureHeight = loaded.height;
    }
  }catch(e){
    console.warn('snapshotAreaMapOverlay: failed to load', resRef, e);
  }

  const calibration = {
    areaResRef: String(area.name || ''),
    logicalWidth: logical.width,
    logicalHeight: logical.height,
    textureWidth,
    textureHeight,
    northAxis: areaMap.northAxis | 0,
    worldPt1X: areaMap.worldPt1X,
    worldPt1Y: areaMap.worldPt1Y,
    worldPt2X: areaMap.worldPt2X,
    worldPt2Y: areaMap.worldPt2Y,
    mapPt1X: areaMap.mapPt1X,
    mapPt1Y: areaMap.mapPt1Y,
    mapPt2X: areaMap.mapPt2X,
    mapPt2Y: areaMap.mapPt2Y,
  };

  if(!textureDataUrl){
    return { ...empty, ...calibration };
  }

  return {
    available: true,
    textureDataUrl,
    ...calibration,
  };
}
