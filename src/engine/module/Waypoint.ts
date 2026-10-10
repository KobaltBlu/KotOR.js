import { GameObject } from "@engine/module/GameObject";
import { GFFObject } from "@core/resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { ResourceLoader } from "@engine/loaders";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import EngineLocation from "@engine/runtime/EngineLocation";
import { GameState } from "@engine/runtime/GameState";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { waypointSerializer } from "@engine/module/serialization/WaypointSerializer";

/**
* Waypoint class.
*
* Class representing a waypoint object found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Waypoint.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Waypoint extends GameObject {

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= GameObjectType.Waypoint;

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
      this.area
    );
  }

  load(){
    // GIT entries only carry TemplateResRef until load; seed before UTW-merge.
    this.seedResRefsFromTemplate();

    if(this.getTemplateResRef()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'TemplateResRef',
        resourceKey: 'utw',
        runtimeResRef: this.getTemplateResRef(),
      });
      if(!merged){
        console.error('Failed to load Waypoint template');
      }
      if(this.template instanceof GFFObject){
        this.initProperties();
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
    }
  }

  initProperties(){
    const needsRegister = !this.initialized;
    waypointSerializer.deserialize(this, this.template);
    this.loadActionList();
    if(needsRegister){
      GameState.GameObjectManager.RegisterObject(this);
    }
  }

  save(){
    const gff = waypointSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

  destroy(): void {
    if(this.hasMapNote){
      this.area?.areaMap?.removeMapNote(this);
    }
    super.destroy();
  }

}
