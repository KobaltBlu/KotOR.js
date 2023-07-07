/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D } from "../three/odyssey";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFStruct } from "../resource/GFFStruct";
import { CExoLocString } from "../resource/CExoLocString";
import { ResourceLoader } from "../loaders";
import { GameState } from "../GameState";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";

/* @file
 * The ModuleWaypoint class.
 */

export class ModuleWaypoint extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType = ModuleObjectType.ModuleWaypoint;

    this.template = gff;
    this.InitProperties();

  }

  SetFacingVector(facing = new THREE.Vector3()){
    if(this.model instanceof OdysseyModel3D)
      this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.getXOrientation(), this.getYOrientation()));
  }

  GetFacingVector(){
    if(this.model instanceof OdysseyModel3D){
      let facing = new THREE.Vector3(0, 1, 0);
      facing.applyQuaternion(this.model.quaternion);
      return facing;
    }
    return new THREE.Vector3(0, 0, 0);
  }

  getXOrientation(){
    return this.xOrientation;
  }

  getYOrientation(){
    return this.yOrientation;
  }

  getZOrientation(){
    return this.zOrientation;
  }

  getTag(){
    return this.tag;
  }

  getTemplateResRef(){
    return this.templateResRef;
  }

  Load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utw'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        this.InitProperties();
      }else{
        console.error('Failed to load ModuleWaypoint template');
        if(this.template instanceof GFFObject){
          this.InitProperties();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
    }
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTW ';
    gff.RootNode.Type = 5;

    gff.RootNode.AddField( new GFFField(GFFDataType.LIST,  'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE,  'Commandable') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE,  'HasMapNote') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'LocalizedName') ).SetValue(this.locName);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new GFFField(GFFDataType.LIST,  'VarTable') );
    
    if(this.template.RootNode.HasField('XOrientation')){
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('XOrientation').GetValue());
    }else{
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue(0);
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue(this.position.x);
    
    if(this.template.RootNode.HasField('YOrientation')){
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('YOrientation').GetValue());
    }else{
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue(0);
    }
    
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue(this.position.y);
    
    if(this.template.RootNode.HasField('ZOrientation'))
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue());
    
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }

  destroy(): void {
    super.destroy();

    if(this.hasMapNote){
      if(GameState.module){
        GameState.module.area.areaMap.removeMapNote(this);
      }
    }
  }

  toToolsetInstance(){

    let instance = new GFFStruct(8);
    
    instance.AddField(
      new GFFField(GFFDataType.BYTE, 'Appearance', this.appearance)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.CEXOLOCSTRING, 'Description')
    ).CExoLocString = new CExoLocString();
    
    instance.AddField(
      new GFFField(GFFDataType.BYTE, 'HasMapNote', this.hasMapNote)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.BYTE, 'LinkedToFlags', this.linkedToFlags)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'LinkedToModule', this.linkedToModule)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.CEXOLOCSTRING, 'MapNote')
    ).CExoLocString = this.mapNote;
    
    instance.AddField(
      new GFFField(GFFDataType.BYTE, 'MapNoteEnabled', this.mapNoteEnabled)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'Tag', this.tag)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', this.xOrientation)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', this.yOrientation)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

}
