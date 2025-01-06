import { ModuleObject } from "./ModuleObject";
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

/**
* ModuleWaypoint class.
* 
* Class representing a waypoint object found in modules areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleWaypoint.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleWaypoint extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleWaypoint;

    this.template = gff;
    this.initProperties();

  }

  setFacingVector(facing = new THREE.Vector3()){
    if(this.model instanceof OdysseyModel3D)
      this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.getXOrientation(), this.getYOrientation()));
  }

  getFacingVector(){
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

  load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utw'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
      }else{
        console.error('Failed to load ModuleWaypoint template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
    }
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTW ';
    gff.RootNode.type = 5;

    gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE,  'Commandable') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE,  'HasMapNote') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'LocalizedName') ).setValue(this.locName);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.LIST,  'VarTable') );
    
    if(this.template.RootNode.hasField('XOrientation')){
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(this.template.RootNode.getFieldByLabel('XOrientation').getValue());
    }else{
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(0);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    
    if(this.template.RootNode.hasField('YOrientation')){
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(this.template.RootNode.getFieldByLabel('YOrientation').getValue());
    }else{
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(0);
    }
    
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    
    if(this.template.RootNode.hasField('ZOrientation'))
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(this.template.RootNode.getFieldByLabel('ZOrientation').getValue());
    
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

  destroy(): void {
    super.destroy();
    if(this.area) this.area.detachObject(this);

    if(this.hasMapNote){
      if(GameState.module){
        GameState.module.area.areaMap.removeMapNote(this);
      }
    }
  }

  toToolsetInstance(){

    let instance = new GFFStruct(8);
    
    instance.addField(
      new GFFField(GFFDataType.BYTE, 'Appearance', this.appearance)
    );
    
    instance.addField(
      new GFFField(GFFDataType.CEXOLOCSTRING, 'Description')
    ).cexoLocString = new CExoLocString();
    
    instance.addField(
      new GFFField(GFFDataType.BYTE, 'HasMapNote', this.hasMapNote)
    );
    
    instance.addField(
      new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo)
    );
    
    instance.addField(
      new GFFField(GFFDataType.BYTE, 'LinkedToFlags', this.linkedToFlags)
    );
    
    instance.addField(
      new GFFField(GFFDataType.RESREF, 'LinkedToModule', this.linkedToModule)
    );
    
    instance.addField(
      new GFFField(GFFDataType.CEXOLOCSTRING, 'MapNote')
    ).cexoLocString = this.mapNote;
    
    instance.addField(
      new GFFField(GFFDataType.BYTE, 'MapNoteEnabled', this.mapNoteEnabled)
    );
    
    instance.addField(
      new GFFField(GFFDataType.RESREF, 'Tag', this.tag)
    );
    
    instance.addField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', this.xOrientation)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', this.yOrientation)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

}
