import * as THREE from "three";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { MapNorthAxis } from "../enums/engine/MapNorthAxis";
import { ModuleWaypoint } from "./";

export class AreaMap {
  data: Buffer;
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
    this.data = Buffer.alloc(4);

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
  }

  setResX( mapResX = 0 ){
    this.mapResX = mapResX;
    this.generateResY();
  }

  generateResY(){
    this.mapResY = Math.floor((this.mapResX * 256) / 440);
  }

  generateMapData(){
    let dataSize = (this.mapResY + 1) * (this.mapResX + 1) / 33;

    this.data = Buffer.alloc(dataSize);
  }

  loadDataStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      this.data = struct.GetFieldByLabel('AreaMapData').GetVoid();
      this.dataSize = struct.GetFieldByLabel('AreaMapDataSize').GetValue();
      this.mapResX = struct.GetFieldByLabel('AreaMapResX').GetValue();
      this.mapResY = struct.GetFieldByLabel('AreaMapResY').GetValue();

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
      case MapNorthAxis.SOUTH:
        {
          scaleY = (this.mapPt1Y - this.mapPt2Y) / (this.worldPt1Y - this.worldPt2Y);
          scaleX = (this.mapPt1X - this.mapPt2X) / (this.worldPt1X - this.worldPt2X);

          this._mapCoordinates.x = (((x - this.worldPt1X) * scaleX) + this.mapPt1X);
          this._mapCoordinates.y = (((y - this.worldPt1Y) * scaleY) + this.mapPt1Y);
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

  export(): GFFStruct {
    let mapStruct = new GFFStruct(14);

    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'MapPt1X') ).SetValue(this.mapPt1X);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'MapPt1Y') ).SetValue(this.mapPt1Y);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'MapPt2X') ).SetValue(this.mapPt2X);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'MapPt2Y') ).SetValue(this.mapPt2Y);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'MapResX') ).SetValue(this.mapResX);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'MapZoom') ).SetValue(this.mapZoom);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'NorthAxis') ).SetValue(this.northAxis);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt1X') ).SetValue(this.worldPt1X);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt1Y') ).SetValue(this.worldPt1Y);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt2X') ).SetValue(this.worldPt2X);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt2Y') ).SetValue(this.worldPt2Y);

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

    dataStruct.AddField( new GFFField(GFFDataType.VOID, 'AreaMapData') ).SetData(this.data);
    dataStruct.AddField( new GFFField(GFFDataType.DWORD, 'AreaMapDataSize') ).SetValue(this.dataSize);
    dataStruct.AddField( new GFFField(GFFDataType.INT, 'AreaMapResX') ).SetValue(this.mapResX);
    dataStruct.AddField( new GFFField(GFFDataType.INT, 'AreaMapResY') ).SetValue(this.mapResY);
    
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

      areaMap.mapPt1X = struct.GetFieldByLabel('MapPt1X').GetValue();
      areaMap.mapPt1Y = struct.GetFieldByLabel('MapPt1Y').GetValue();
      areaMap.mapPt2X = struct.GetFieldByLabel('MapPt2X').GetValue();
      areaMap.mapPt2Y = struct.GetFieldByLabel('MapPt2Y').GetValue();
      areaMap.mapResX = struct.GetFieldByLabel('MapResX').GetValue();
      areaMap.mapZoom = struct.GetFieldByLabel('MapZoom').GetValue();
      areaMap.northAxis = struct.GetFieldByLabel('NorthAxis').GetValue();
      areaMap.worldPt1X = struct.GetFieldByLabel('WorldPt1X').GetValue();
      areaMap.worldPt1Y = struct.GetFieldByLabel('WorldPt1Y').GetValue();
      areaMap.worldPt2X = struct.GetFieldByLabel('WorldPt2X').GetValue();
      areaMap.worldPt2Y = struct.GetFieldByLabel('WorldPt2Y').GetValue();

      areaMap.init();

      return areaMap;
    }
  }

}
