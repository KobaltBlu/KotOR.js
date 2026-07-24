import * as THREE from "three";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { MapNorthAxis } from "@/enums/engine/MapNorthAxis";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import type { ModuleWaypoint } from "@/module/ModuleWaypoint";

/** Retail K1 logical map size (CSWSAreaMap / GetMapPixelFromWorldCoord). */
export const AREA_MAP_LOGICAL_SIZE_K1 = { width: 440, height: 256 } as const;
/** Retail TSL Aspyr logical map size (0x24C x 0x126). */
export const AREA_MAP_LOGICAL_SIZE_TSL = { width: 588, height: 294 } as const;

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
  mapPt1X: number;
  mapPt1Y: number;
  mapPt2X: number;
  mapPt2Y: number;
  mapZoom: number;
  dataSize: number;

  fogAlphaPixelData: Uint8Array;
  fogAlphaTexture: THREE.DataTexture;

  _mapCoordinates: THREE.Vector2 = new THREE.Vector2(0, 0);

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

  toMapCoordinates(x: number = 0, y: number = 0): THREE.Vector2 {
    let scaleX = 0, scaleY = 0;
    switch(this.northAxis){
      case MapNorthAxis.NORTH: //end_m01aa
        {
          scaleY = (this.mapPt1Y - this.mapPt2Y) / (this.worldPt1Y - this.worldPt2Y);
          scaleX = (this.mapPt1X - this.mapPt2X) / (this.worldPt1X - this.worldPt2X);

          this._mapCoordinates.x = (( x - this.worldPt1X) * scaleX) + this.mapPt1X;
          this._mapCoordinates.y = 1 - (((y - this.worldPt1Y) * scaleY) + this.mapPt1Y);
        }
      break;
      case MapNorthAxis.SOUTH: //152HAR
        {
          scaleY = (this.mapPt1Y - this.mapPt2Y) / (this.worldPt1Y - this.worldPt2Y);
          scaleX = (this.mapPt1X - this.mapPt2X) / (this.worldPt1X - this.worldPt2X);

          this._mapCoordinates.y = ((( x - this.worldPt1X) * scaleX) + this.mapPt1X);
          this._mapCoordinates.x = (((-y - this.worldPt1Y) * scaleY) + this.mapPt1Y);
        }
      break;
      case MapNorthAxis.EAST:
        {
          scaleX = (this.mapPt1Y - this.mapPt2Y) / (this.worldPt1X - this.worldPt2X);
			    scaleY = (this.mapPt1X - this.mapPt2X) / (this.worldPt1Y - this.worldPt2Y);

          this._mapCoordinates.x = (((y - this.worldPt1Y) * scaleY) + this.mapPt1X);
          this._mapCoordinates.y = (((x - this.worldPt1X) * scaleX) + this.mapPt1Y);
        }
      break;
      case MapNorthAxis.WEST: //end_m01ab
        {
          scaleX = (this.mapPt1Y - this.mapPt2Y) / (this.worldPt1X - this.worldPt2X);
			    scaleY = (this.mapPt1X - this.mapPt2X) / (this.worldPt1Y - this.worldPt2Y);

          this._mapCoordinates.x = (((y - this.worldPt1Y) * scaleY) + this.mapPt1X);
          this._mapCoordinates.y = 1 - (((x - this.worldPt1X) * scaleX) + this.mapPt1Y);
        }
      break;
    }
    return this._mapCoordinates;
  }

  getRevealedMapNotes(){
    return this.mapNotes.filter( (note) => {
      return this.isMapPositionExplored(note.position.x, note.position.y);
    })
  }

  isMapPositionExplored(x: number = 0, y: number = 0){
    const resX = (this.mapResX+1);
    const resY = (this.mapResY+1);

    const mapPos = this.toMapCoordinates(x, y);
    mapPos.x = THREE.MathUtils.clamp(mapPos.x, 0, 1);
    mapPos.y = 1 - THREE.MathUtils.clamp(mapPos.y, 0, 1);

    const gridX = Math.floor(resX * mapPos.x);
    const gridY = Math.floor(resY * mapPos.y);
    if(this.fogAlphaPixelData[(resX * gridY) + gridX] == 0){
      return true;
    }
    return false;
  }

  /**
   * Retail CSWSAreaMap::SetWorldPointExplored — default radius 1 (UpdateMapData).
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

    const mapPos = this.toMapCoordinates(x, y);
    mapPos.x = THREE.MathUtils.clamp(mapPos.x, 0, 1);
    mapPos.y = 1 - THREE.MathUtils.clamp(mapPos.y, 0, 1);

    const gridX = Math.floor(resX * mapPos.x);
    const gridY = Math.floor(resY * mapPos.y);

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
    mapStruct.addField( new GFFField(GFFDataType.INT, 'MapPt2Y') ).setValue(this.mapPt2Y);
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
    let dataStruct = new GFFStruct(14);

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

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let areaMap = new AreaMap();

      areaMap.mapPt1X = struct.getFieldByLabel('MapPt1X').getValue();
      areaMap.mapPt1Y = struct.getFieldByLabel('MapPt1Y').getValue();
      areaMap.mapPt2X = struct.getFieldByLabel('MapPt2X').getValue();
      areaMap.mapPt2Y = struct.getFieldByLabel('MapPt2Y').getValue();
      areaMap.mapResX = struct.getFieldByLabel('MapResX').getValue();
      areaMap.mapZoom = struct.getFieldByLabel('MapZoom').getValue() || 1;
      areaMap.northAxis = struct.getFieldByLabel('NorthAxis').getValue();
      areaMap.worldPt1X = struct.getFieldByLabel('WorldPt1X').getValue();
      areaMap.worldPt1Y = struct.getFieldByLabel('WorldPt1Y').getValue();
      areaMap.worldPt2X = struct.getFieldByLabel('WorldPt2X').getValue();
      areaMap.worldPt2Y = struct.getFieldByLabel('WorldPt2Y').getValue();

      areaMap.init();

      return areaMap;
    }
  }

}
