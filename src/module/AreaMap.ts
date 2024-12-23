import * as THREE from "three";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { MapNorthAxis } from "../enums/engine/MapNorthAxis";
import { ModuleWaypoint } from ".";

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
    this.mapZoom = 0;

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
    this.mapResY = Math.max(1, Math.floor((this.mapResX * 256) / 440));
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
    this.fogAlphaTexture = new THREE.DataTexture(this.fogAlphaPixelData, resX, resY, THREE.AlphaFormat);
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

  revealPosition(x: number = 0, y: number = 0, radius: number = 0){
    if(radius == -1){
      this.revealEntireMap();
      return;
    }

    radius = Math.abs(radius);
    const resX = (this.mapResX+1);
    const resY = (this.mapResY+1);

    const mapPos = this.toMapCoordinates(x, y);
    mapPos.x = THREE.MathUtils.clamp(mapPos.x, 0, 1);
    mapPos.y = 1 - THREE.MathUtils.clamp(mapPos.y, 0, 1);

    const gridX = Math.floor(resX * mapPos.x);
    const gridY = Math.floor(resY * mapPos.y);
    
    let needsUpdate = this.revealFogAtArrayIndex((resX * gridY) + gridX);

    //reveal radius
    for(let y = 1; y < radius; y++){
      for(let x = 1; x < radius; x++){
        const tY = gridY-y;
        if(tY >= 0){
          if(gridX-x >= 0){
            const tlIndex = (resX * (tY)) + (gridX-x);
            if(this.revealFogAtArrayIndex(tlIndex)){
              needsUpdate = true;
            }
          }
  
          const tIndex = (resX * (tY)) + (gridX);
          if(this.revealFogAtArrayIndex(tIndex)){
            needsUpdate = true;
          }
  
          if(gridX+x < resX){
            const trIndex = (resX * (tY)) + (gridX+x);
            if(this.revealFogAtArrayIndex(trIndex)){
              needsUpdate = true;
            }
          }
        }
  
        if(gridY >= 0 && gridY < resY){
          if(gridX-x >= 0){
            const mlIndex = (resX * (gridY)) + (gridX-x);
            if(this.revealFogAtArrayIndex(mlIndex)){
              needsUpdate = true;
            }
          }
  
          if(gridX+x < resX){
            const mrIndex = (resX * (gridY)) + (gridX+x);
            if(this.revealFogAtArrayIndex(mrIndex)){
              needsUpdate = true;
            }
          }
        }
  
        const bY = gridY+y;
        if(bY >= 0 && bY < resY){
          if(gridX-x >= 0){
            const blIndex = (resX * (bY)) + (gridX-x);
            if(this.revealFogAtArrayIndex(blIndex)){
              needsUpdate = true;
            }
          }
  
          const bIndex = (resX * (bY)) + (gridX);
          if(this.revealFogAtArrayIndex(bIndex)){
            needsUpdate = true;
          }
  
          if(gridX+x < resX){
            const brIndex = (resX * (bY)) + (gridX+x);
            if(this.revealFogAtArrayIndex(brIndex)){
              needsUpdate = true;
            }
          }
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
        needsUpdate = true;
      }
    }
    return needsUpdate;
  }

  revealEntireMap(){
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

    let byteIndex = 0;
    for(let i = 0; i < this.fogAlphaPixelData.length; i++){
      const bitIndex = i % 8;
      this.data[byteIndex] |= 1 << bitIndex;

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
      areaMap.mapZoom = struct.getFieldByLabel('MapZoom').getValue();
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
