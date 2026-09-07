import { ModuleObject } from "@/module/ModuleObject";
import { GFFObject } from "@/resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D } from "@/three/odyssey";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFStruct } from "@/resource/GFFStruct";
import { CExoLocString } from "@/resource/CExoLocString";
import { ResourceLoader } from "@/loaders";
import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import EngineLocation from "@/engine/EngineLocation";

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
    // Defer initProperties until loadWaypoints → load (Load* + AddToArea).

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

  /**
   * GetScriptLocation — copy live X/Y/ZOrientation from the waypoint
   * (GIT fields), not a bearing rebuild.
   */
  getLocation(){
    return new EngineLocation(
      this.position.x, this.position.y, this.position.z,
      this.getXOrientation(), this.getYOrientation(), this.getZOrientation() || 0,
      this.area || GameState?.module?.area
    );
  }

  getTag(){
    return this.tag;
  }

  getTemplateResRef(){
    return this.templateResRef;
  }

  load(){
    // GIT entries only carry TemplateResRef until load; initProperties is deferred,
    // so read the GFF field before choosing the UTW-merge path (same as ModuleTrigger).
    if(!this.templateResRef && this.template?.RootNode?.hasField('TemplateResRef')){
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();
    }

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

    const localizedName = this.localizedName instanceof CExoLocString
      ? this.localizedName
      : (this.locName instanceof CExoLocString ? this.locName : new CExoLocString());
    const mapNote = this.mapNote instanceof CExoLocString ? this.mapNote : new CExoLocString();

    gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE,  'Commandable') ).setValue(this.commandable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE,  'HasMapNote') ).setValue(this.hasMapNote ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).setValue(localizedName);
    if(this.hasMapNote){
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'MapNote') ).setValue(mapNote);
      gff.RootNode.addField( new GFFField(GFFDataType.BYTE,  'MapNoteEnabled') ).setValue(this.mapNoteEnabled ? 1 : 0);
    }
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    this.writeNamedVarTable(gff.RootNode);

    // SaveWaypoint — live orientation, not template snapshot
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(this.getXOrientation());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(this.getYOrientation());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(this.getZOrientation());
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

}
