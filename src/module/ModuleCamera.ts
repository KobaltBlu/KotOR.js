/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";

/* @file
 * The ModuleCamera class.
 */

export class ModuleCamera extends ModuleObject {
  cameraID: any;
  fov: any;
  height: any;
  micRange: any;
  orientation: THREE.Quaternion = new THREE.Quaternion;
  pitch: any;

  constructor ( gff = new GFFObject() ) {
    super();
    this.id = -1;
    this.template = gff;
  }

  Load( onLoad?: Function ){

    this.InitProperties( () => {

      //console.log('ModuleCamera', 'Loaded')
      if(onLoad != null)
        onLoad(this);

    });
    
  }

  InitProperties( onLoad?: Function ){

    if(this.template.RootNode.HasField('CameraID'))
      this.cameraID = this.template.GetFieldByLabel('CameraID').GetValue();

    if(this.template.RootNode.HasField('FieldOfView'))
      this.fov = this.template.GetFieldByLabel('FieldOfView').GetValue();

    if(this.template.RootNode.HasField('Height'))
      this.height = this.template.GetFieldByLabel('Height').GetValue();

    if(this.template.RootNode.HasField('MicRange'))
      this.micRange = this.template.GetFieldByLabel('MicRange').GetValue();

    if(this.template.RootNode.HasField('Orientation'))
      this.orientation = this.template.GetFieldByLabel('Orientation').GetOrientation();

    if(this.template.RootNode.HasField('Pitch'))
      this.pitch = this.template.GetFieldByLabel('Pitch').GetValue();

    if(this.template.RootNode.HasField('Position'))
      this.position.copy(this.template.GetFieldByLabel('Position').GetVector());

    this.initialized = true;

    if(typeof onLoad == 'function')
      onLoad();

  }

  save(){
    let gff = new GFFObject();
    gff.RootNode.Type = 14;

    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'CameraID') ).SetValue(this.cameraID);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'FieldOfView') ).SetValue(this.fov);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Height') ).SetValue(this.height);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'MicRange') ).SetValue(this.micRange);
    gff.RootNode.AddField( new GFFField(GFFDataType.ORIENTATION, 'Orientation') ).SetValue( this.template.GetFieldByLabel('Orientation').GetOrientation() );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Pitch') ).SetValue(this.pitch);
    gff.RootNode.AddField( new GFFField(GFFDataType.VECTOR, 'Position') ).SetValue( this.template.GetFieldByLabel('Position').GetVector() );

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){

    let instance = new GFFStruct(4);
    
    instance.AddField(
      new GFFField(GFFDataType.INT, 'CameraID', this.cameraID)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'FieldOfView', this.fov)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'Height', this.height)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'MicRange', this.micRange)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.ORIENTATION, 'Orientation', this.orientation)
    )
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'Pitch', this.position.z)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.VECTOR, 'Position', this.position)
    );

    return instance;

  }

}
