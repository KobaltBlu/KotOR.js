import { GFFStruct } from "../resource/GFFStruct";

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

  //MapWidth = 440;
  //MapHeight = 256;

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