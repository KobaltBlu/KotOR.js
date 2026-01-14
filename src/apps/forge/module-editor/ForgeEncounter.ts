import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";
import * as THREE from "three";

export class ForgeEncounter extends ForgeGameObject {
  vertices: THREE.Vector3[] = [];
  spawnPointList: KotOR.EncounterSpawnPointEntry[] = [];

  constructor(){
    super();
  }

  async load(){
    
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(7);
    const geometryField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Geometry'));
    for(let i = 0, len = this.vertices.length; i < len; i++){
      const geometryStruct = new KotOR.GFFStruct(3);
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointX', this.vertices[i].x));
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointY', this.vertices[i].y));
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointZ', this.vertices[i].z));
      geometryField?.addChildStruct(geometryStruct);
    }
    const spawnPointListField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SpawnPointList'));
    for(let i = 0, len = this.spawnPointList.length; i < len; i++){
      const spawnPointStruct = new KotOR.GFFStruct(3);
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', this.spawnPointList[i].position.x));
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', this.spawnPointList[i].position.y));
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', this.spawnPointList[i].position.z));
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Orientation', this.spawnPointList[i].orientation));
      spawnPointListField?.addChildStruct(spawnPointStruct);
    }
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.vertices = [];
    const geometryField = strt.getFieldByLabel('Geometry');
    if(geometryField){
      for(let i = 0, len = geometryField.getChildStructs().length; i < len; i++){
        const geometryStruct = geometryField.getChildStructs()[i];
        this.vertices.push(new THREE.Vector3(geometryStruct.getFieldByLabel('PointX').getValue() as number, geometryStruct.getFieldByLabel('PointY').getValue() as number, geometryStruct.getFieldByLabel('PointZ').getValue() as number));
      }
    }
    this.spawnPointList = [];
    const spawnPointListField = strt.getFieldByLabel('SpawnPointList');
    if(spawnPointListField){
      for(let i = 0, len = spawnPointListField.getChildStructs().length; i < len; i++){
        const spawnPointStruct = spawnPointListField.getChildStructs()[i];
        const entry: KotOR.EncounterSpawnPointEntry = KotOR.EncounterSpawnPointEntry.FromStruct(spawnPointStruct)!;
        if(entry instanceof KotOR.EncounterSpawnPointEntry){
          this.spawnPointList.push(entry);
        }
      }
    }
    this.rotation.z = strt.getFieldByLabel('XOrientation').getValue() as number;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('YOrientation').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('ZOrientation').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }

}