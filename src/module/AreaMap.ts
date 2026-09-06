import * as THREE from "three";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { MapNorthAxis } from "@/enums/engine/MapNorthAxis";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import type { ModuleWaypoint } from "@/module/ModuleWaypoint";

/** Retail K1 logical map size (retail / GetMapPixelFromWorldCoord). */
export const AREA_MAP_LOGICAL_SIZE_K1 = { width: 440, height: 256 } as const;
/** Retail TSL Aspyr logical map size (0x24C x 0x126). */
export const AREA_MAP_LOGICAL_SIZE_TSL = { width: 588, height: 294 } as const;

export interface AreaMapPixelResult {
  x: number;
  y: number;
  valid: boolean;
}

/**
* AreaMap class.
*
* Class representing the logic that powers mini and large game maps ingame.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file AreaMap.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class AreaMap {
  data: Uint8Array;
  mapResX: number;
  mapResY: number;
  northAxis: number;
  worldPt1X: number;
  worldPt1Y: number;
  worldPt2X: number;
  worldPt2Y: number;
  /** Map corner UVs in [0,1] (ARE FLOAT MapPt*), or normalized from INT pixels on load. */
  mapPt1X: number;
  mapPt1Y: number;
  mapPt2X: number;
  mapPt2Y: number;
  mapZoom: number;
  dataSize: number;

  fogAlphaPixelData: Uint8Array;
  fogAlphaTexture: THREE.DataTexture;

  _mapCoordinates: THREE.Vector2 = new THREE.Vector2(0, 0);
  _mapPixels: AreaMapPixelResult = { x: -1, y: -1, valid: false };

  mapNotes: ModuleWaypoint[] = [];

  eventListeners: {
    mapNoteAdded: Function[],
    mapNoteRemoved: Function[],
  } = {
    mapNoteAdded: [],
    mapNoteRemoved: []
  };

  constructor(){
    this.data = new Uint8Array(4);

    this.mapResX = 0;
    this.mapResY = 0;
    this.northAxis = 0;
    this.worldPt1X = 0;
    this.worldPt1Y = 0;
    this.worldPt2X = 0;
    this.worldPt2Y = 0;
    this.mapPt1X = 0;
    this.mapPt1Y = 0;
    this.mapPt2X = 0;
    this.mapPt2Y = 0;
    this.mapZoom = 1;

  }

  /** Retail logical map pixel size for the active game. */
  static getLogicalMapSize(): { width: number, height: number } {
    // Use ApplicationProfile (not GameState) to avoid circular init via @/module barrel.
    if(ApplicationProfile.GameKey == GameEngineType.TSL){
      return { width: AREA_MAP_LOGICAL_SIZE_TSL.width, height: AREA_MAP_LOGICAL_SIZE_TSL.height };
    }
    return { width: AREA_MAP_LOGICAL_SIZE_K1.width, height: AREA_MAP_LOGICAL_SIZE_K1.height };
  }

  /**
   * Retail NorthAxis world transform (CSWSAreaMap::Initialize / GetMapPixelFromWorldCoord).
   * NORTH identity, EAST negate both, SOUTH (y,-x), WEST (-y,x).
   */
  static transformWorldByNorthAxis(x: number, y: number, northAxis: number): { x: number, y: number } {
    switch(northAxis){
      case MapNorthAxis.EAST:
        return { x: -x, y: -y };
      case MapNorthAxis.SOUTH:
        return { x: y, y: -x };
      case MapNorthAxis.WEST:
        return { x: -y, y: x };
      case MapNorthAxis.NORTH:
      default:
        return { x, y };
    }
  }

  init(){
    this.generateResY();
    this.generateMapData();
  }

  setResX( mapResX = 0 ){
    this.mapResX = mapResX;
    this.generateResY();
    this.generateMapData();
  }

  generateResY(){
    const { width, height } = AreaMap.getLogicalMapSize();
    this.mapResY = Math.max(1, Math.floor((this.mapResX * height) / width));
  }

  generateMapData(){
    this.dataSize = (Math.ceil(((this.mapResX+1) * (this.mapResY+1)) / 32) * 32) / 8;
    this.data = new Uint8Array(this.dataSize);
    this.generateAlphaTexture();
  }

  generateAlphaTexture(){
    const resX = this.mapResX+1;
    const resY = this.mapResY+1;
    this.fogAlphaPixelData = new Uint8Array(resX * resY);
    this.fogAlphaTexture = new THREE.DataTexture(this.fogAlphaPixelData as any, resX, resY, THREE.AlphaFormat);
    this.fogAlphaTexture.minFilter = THREE.LinearFilter;
    this.fogAlphaTexture.magFilter = THREE.LinearFilter;
    this.fogAlphaTexture.flipY = true;
    this.fogAlphaTexture.needsUpdate = true;

    const stride = resX;
    const totalBits = stride * resY;

    let byteIndex = 0;
    for(let i = 0; i < totalBits; i++){
      const bitIndex = i % 8;
      const explored = !!(this.data[byteIndex] & 1 << bitIndex);
      this.fogAlphaPixelData[i * 1] = !explored ? 255 : 0;
      
      if(!((i+1) % 8)){
        byteIndex++;
      }
    }
  }

  loadDataStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      this.data = struct.getFieldByLabel('AreaMapData').getVoid();
      this.dataSize = struct.getFieldByLabel('AreaMapDataSize').getValue();
      this.mapResX = struct.getFieldByLabel('AreaMapResX').getValue();
      this.mapResY = struct.getFieldByLabel('AreaMapResY').getValue();
      this.generateAlphaTexture();      
    }
  }

  addMapNote(note: ModuleWaypoint){
    if(!note) return;
    if(this.mapNotes.indexOf(note) >= 0) return;
    if(!note.hasMapNote) return;

    this.mapNotes.push(note);
    this.processEventListener('mapNoteAdded', [note]);
  }

  removeMapNote(note: ModuleWaypoint){
    if(!note) return;
    const index = this.mapNotes.indexOf(note);
    if(index >= 0){
      this.mapNotes.splice(index, 1);
      this.processEventListener('mapNoteRemoved', [note]);
    }
  }

  /**
   * Retail GetMapPixelFromWorldCoord — returns logical map pixels and in-bounds validity.
   * Pass `logicalSize` when the caller already knows K1/TSL size (e.g. Dev Tools IPC).
   */
  toMapPixels(
    x: number = 0,
    y: number = 0,
    logicalSize?: { width: number, height: number }
  ): AreaMapPixelResult {
    const { width, height } = logicalSize || AreaMap.getLogicalMapSize();
    const mapPt1Xpx = Math.trunc(this.mapPt1X * width);
    const mapPt1Ypx = Math.trunc(this.mapPt1Y * height);
    const mapPt2Xpx = Math.trunc(this.mapPt2X * width);
    const mapPt2Ypx = Math.trunc(this.mapPt2Y * height);

    const w1 = AreaMap.transformWorldByNorthAxis(this.worldPt1X, this.worldPt1Y, this.northAxis);
    const w2 = AreaMap.transformWorldByNorthAxis(this.worldPt2X, this.worldPt2Y, this.northAxis);
    const local = AreaMap.transformWorldByNorthAxis(x, y, this.northAxis);

    const denomX = mapPt2Xpx - mapPt1Xpx;
    const denomY = mapPt2Ypx - mapPt1Ypx;
    if(denomX == 0 || denomY == 0){
      this._mapPixels.x = -1;
      this._mapPixels.y = -1;
      this._mapPixels.valid = false;
      return this._mapPixels;
    }

    const scaleX = (w2.x - w1.x) / denomX;
    const scaleY = (w2.y - w1.y) / denomY;
    if(scaleX == 0 || scaleY == 0){
      this._mapPixels.x = -1;
      this._mapPixels.y = -1;
      this._mapPixels.valid = false;
      return this._mapPixels;
    }

    const offsetX = w1.x - mapPt1Xpx * scaleX;
    const offsetY = w1.y - mapPt1Ypx * scaleY;

    const pixelX = Math.trunc((local.x - offsetX) / scaleX + 0.5);
    const pixelY = Math.trunc((local.y - offsetY) / scaleY + 0.5);

    // Raw pixels kept for UV conversion even when OOB (retail returns -1,-1 to callers).
    this._mapPixels.x = pixelX;
    this._mapPixels.y = pixelY;
    this._mapPixels.valid = pixelX >= 0 && pixelX <= width && pixelY >= 0 && pixelY <= height;
    return this._mapPixels;
  }

  /**
   * World XY → map UV for LBL_MapView.
   * X matches retail GetMapPixelFromWorldCoord / logical width.
   * Y is flipped: retail/AurGUI map pixels are top-origin (Y-down), while the
   * Three.js map scene is bottom-origin (Y-up) with the TGA on the plane.
   */
  toMapCoordinates(x: number = 0, y: number = 0): THREE.Vector2 {
    const { width, height } = AreaMap.getLogicalMapSize();
    const pix = this.toMapPixels(x, y);
    this._mapCoordinates.x = pix.x / width;
    this._mapCoordinates.y = 1 - (pix.y / height);
    return this._mapCoordinates;
  }

  /**
   * Retail GetGridPixelFromMapPixel — map pixels → fog grid cell.
   */
  toGridPixels(mapPixelX: number, mapPixelY: number): { x: number, y: number, valid: boolean } {
    const { width, height } = AreaMap.getLogicalMapSize();
    if(mapPixelX < 0 || mapPixelX > width || mapPixelY < 0 || mapPixelY > height){
      return { x: -1, y: -1, valid: false };
    }
    if(!this.mapResX || !this.mapResY){
      return { x: -1, y: -1, valid: false };
    }

    const gridX = Math.trunc(mapPixelX / (width / this.mapResX) + 0.5);
    const gridY = Math.trunc(mapPixelY / (height / this.mapResY) + 0.5);
    return { x: gridX, y: gridY, valid: true };
  }

  getRevealedMapNotes(){
    return this.mapNotes.filter( (note) => {
      return this.isMapPositionExplored(note.position.x, note.position.y);
    })
  }

  isMapPositionExplored(x: number = 0, y: number = 0){
    const resX = (this.mapResX+1);
    const resY = (this.mapResY+1);

    const pix = this.toMapPixels(x, y);
    if(!pix.valid) return false;

    const grid = this.toGridPixels(pix.x, pix.y);
    if(!grid.valid) return false;

    const gridX = THREE.MathUtils.clamp(grid.x, 0, resX - 1);
    const gridY = THREE.MathUtils.clamp(grid.y, 0, resY - 1);
    if(this.fogAlphaPixelData[(resX * gridY) + gridX] == 0){
      return true;
    }
    return false;
  }

  /**
   * Retail SetWorldPointExplored — default radius 1 (UpdateMapData).
   * Radius uses a manhattan diamond of grid cells; -1 reveals the entire map.
   */
  revealPosition(x: number = 0, y: number = 0, radius: number = 1){
    if(radius == -1){
      this.revealEntireMap();
      return;
    }

    if(!this.mapResX) return;

    radius = Math.abs(radius);
    const resX = (this.mapResX+1);
    const resY = (this.mapResY+1);

    const pix = this.toMapPixels(x, y);
    if(!pix.valid) return;

    const grid = this.toGridPixels(pix.x, pix.y);
    if(!grid.valid) return;

    const gridX = grid.x;
    const gridY = grid.y;

    let needsUpdate = false;
    for(let dx = -radius; dx <= radius; dx++){
      const dyLimit = radius - Math.abs(dx);
      for(let dy = -dyLimit; dy <= dyLimit; dy++){
        const gx = gridX + dx;
        const gy = gridY + dy;
        if(gx < 0 || gy < 0 || gx >= resX || gy >= resY) continue;
        if(this.revealFogAtArrayIndex((resX * gy) + gx)){
          needsUpdate = true;
        }
      }
    }

    if(needsUpdate) this.fogAlphaTexture.needsUpdate = true;
  }

  revealFogAtArrayIndex(index: number = 0){
    let needsUpdate = false;
    if(index >= 0 && index < this.fogAlphaPixelData.length){
      if(this.fogAlphaPixelData[index]){
        this.fogAlphaPixelData[index] = 0;
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        if(byteIndex < this.data.length){
          this.data[byteIndex] |= (1 << bitIndex);
        }
        needsUpdate = true;
      }
    }
    return needsUpdate;
  }

  revealEntireMap(){
    this.data.fill(0xFF);
    this.fogAlphaPixelData.fill(0);
    this.fogAlphaTexture.needsUpdate = true;
  }

  dispose(){
    for(let i = 0; i < this.mapNotes.length; i++){
      this.processEventListener('mapNoteRemoved', [this.mapNotes[i]]);
    }
  }

  export(): GFFStruct {
    let mapStruct = new GFFStruct(14);

    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'MapPt1X') ).setValue(this.mapPt1X);
    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'MapPt1Y') ).setValue(this.mapPt1Y);
    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'MapPt2X') ).setValue(this.mapPt2X);
    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'MapPt2Y') ).setValue(this.mapPt2Y);
    mapStruct.addField( new GFFField(GFFDataType.INT, 'MapResX') ).setValue(this.mapResX);
    mapStruct.addField( new GFFField(GFFDataType.INT, 'MapZoom') ).setValue(this.mapZoom);
    mapStruct.addField( new GFFField(GFFDataType.INT, 'NorthAxis') ).setValue(this.northAxis);
    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'WorldPt1X') ).setValue(this.worldPt1X);
    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'WorldPt1Y') ).setValue(this.worldPt1Y);
    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'WorldPt2X') ).setValue(this.worldPt2X);
    mapStruct.addField( new GFFField(GFFDataType.FLOAT, 'WorldPt2Y') ).setValue(this.worldPt2Y);

    return mapStruct;
  }

  exportData(){
    // Retail SaveMaps — AreaMap struct type 0x65 (101)
    let dataStruct = new GFFStruct(0x65);

    this.data.fill(0);
    let byteIndex = 0;
    for(let i = 0; i < this.fogAlphaPixelData.length; i++){
      const bitIndex = i % 8;
      // Explored cells have fog alpha 0
      if(this.fogAlphaPixelData[i] == 0){
        this.data[byteIndex] |= 1 << bitIndex;
      }

      if(!((i+1) % 8)){
        byteIndex++;
      }
    }

    dataStruct.addField( new GFFField(GFFDataType.VOID, 'AreaMapData') ).setData(this.data);
    dataStruct.addField( new GFFField(GFFDataType.DWORD, 'AreaMapDataSize') ).setValue(this.dataSize);
    dataStruct.addField( new GFFField(GFFDataType.INT, 'AreaMapResX') ).setValue(this.mapResX);
    dataStruct.addField( new GFFField(GFFDataType.INT, 'AreaMapResY') ).setValue(this.mapResY);
    
    return dataStruct;
  }

  addEventListener(name: 'mapNoteRemoved'|'mapNoteAdded', callback: Function){
    if(!(typeof callback === 'function')) return;

    const list = this.eventListeners[name];
    if(!Array.isArray(list)) return;

    if(list.indexOf(callback) >= 0) return;
    list.push(callback);
  }

  removeEventListener(name: 'mapNoteRemoved'|'mapNoteAdded', callback: Function){
    if(!(typeof callback === 'function')) return;

    const list = this.eventListeners[name];
    if(!Array.isArray(list)) return;

    const index = list.indexOf(callback);
    if(index == -1) return;

    list.splice(index, 1);
  }

  processEventListener(name: 'mapNoteRemoved'|'mapNoteAdded', args: any[]){
    const list = this.eventListeners[name];
    if(!Array.isArray(list)) return;

    for(let i = 0, len = list.length; i < len; i++){
      list[i](...args);
    }
  }

  /**
   * Load ARE MapPt as UV. FLOAT fields are already UV; INT fields are logical pixels
   * (retail LoadAreaHeader) and are normalized by logical map size.
   */
  static readMapPtUV(struct: GFFStruct, label: string, logicalSize: number, fallback = 0): number {
    const field = struct.getFieldByLabel(label);
    if(!field){
      return fallback;
    }
    const value = field.getValue();
    if(typeof value !== 'number' || !Number.isFinite(value)){
      return fallback;
    }
    if(field.getType() == GFFDataType.FLOAT){
      return value;
    }
    // INT (and other integer types): already in logical pixels
    if(logicalSize > 0){
      return value / logicalSize;
    }
    return fallback;
  }

  static FromStruct( struct: GFFStruct ): AreaMap | undefined {
    if(!struct || typeof struct.getFieldByLabel !== 'function'){
      return undefined;
    }

    const readNumber = (label: string, fallback = 0): number => {
      const field = struct.getFieldByLabel(label);
      if(!field){
        return fallback;
      }
      const value = field.getValue();
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    };

    const { width, height } = AreaMap.getLogicalMapSize();
    const areaMap = new AreaMap();
    areaMap.mapPt1X = AreaMap.readMapPtUV(struct, 'MapPt1X', width);
    areaMap.mapPt1Y = AreaMap.readMapPtUV(struct, 'MapPt1Y', height);
    areaMap.mapPt2X = AreaMap.readMapPtUV(struct, 'MapPt2X', width);
    areaMap.mapPt2Y = AreaMap.readMapPtUV(struct, 'MapPt2Y', height);
    areaMap.mapResX = readNumber('MapResX');
    areaMap.mapZoom = readNumber('MapZoom', 1) || 1;
    areaMap.northAxis = readNumber('NorthAxis');
    areaMap.worldPt1X = readNumber('WorldPt1X');
    areaMap.worldPt1Y = readNumber('WorldPt1Y');
    areaMap.worldPt2X = readNumber('WorldPt2X');
    areaMap.worldPt2Y = readNumber('WorldPt2Y');
    areaMap.init();
    return areaMap;
  }

}
