import { ModuleObject } from "@/module/ModuleObject";
import { GFFObject } from "@/resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D } from "@/three/odyssey";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { ResourceLoader } from "@/loaders";
import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

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

  initProperties(){
    super.initProperties();

    this.actionQueue.clear();

    try{
      if(this.template.RootNode.hasField('ActionList')){
        const actionStructs = this.template.RootNode.getFieldByLabel('ActionList').getChildStructs();
        for(let i = 0, len = actionStructs.length; i < len; i++){
          const action = GameState.ActionFactory.FromStruct(actionStructs[i]);
          if(action){
            this.actionQueue.add(action);
          }
        }
      }
    }catch(e: any){
      console.error(e);
    }
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTW ';
    gff.RootNode.type = 5;

    const facing = this.getFacingVector();
    const hasFacingVector = facing.lengthSq() > 0;
    const xOrientation = hasFacingVector ? facing.x : this.xOrientation;
    const yOrientation = hasFacingVector ? facing.y : this.yOrientation;
    const zOrientation = hasFacingVector ? facing.z : this.zOrientation;

    gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Appearance') ).setValue(this.appearance);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.commandable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue(this.description);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'HasMapNote') ).setValue(this.hasMapNote ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo') ).setValue(this.linkedTo);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).setValue(this.localizedName);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'MapNote') ).setValue(this.mapNote);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'MapNoteEnabled') ).setValue(this.mapNoteEnabled ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') ).setValue(this.templateResRef || '');
    gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(xOrientation || 0);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(yOrientation || 0);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(zOrientation || 0);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

  destroy(): void {
    if(this.destroyed || this.destroying){
      return;
    }
    super.destroy();
    if(this.area) this.area.detachObject(this);

    if(this.hasMapNote){
      if(GameState.module){
        GameState.module.area.areaMap.removeMapNote(this);
      }
    }
  }

}
