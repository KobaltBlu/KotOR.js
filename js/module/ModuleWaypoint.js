/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleWaypoint class.
 */

class ModuleWaypoint extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super();

    this.template = gff;



  }

  SetFacingVector(facing = new THREE.Vector3()){
    if(this.model != THREE.AuroraModel)
      this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.getXOrientation(), this.getYOrientation()));
  }

  GetFacingVector(){
    if(this.model != THREE.AuroraModel){
      let facing = new THREE.Vector3(0, 1, 0);
      facing.applyQuaternion(this.model.quaternion);
      return facing;
    }
    return new THREE.Vector3(0, 0, 0);
  }

  /*GetPosition(){
    return new THREE.Vector3(this.getXPosition(), this.getYPosition(), this.getZPosition());
  }

  GetFacing(){

    if(this.template.model != THREE.AuroraModel){
      this.template.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.getXOrientation(), this.getYOrientation()));
      return this.template.model.rotation.z
    }

    return 0;
  }*/

  getXPosition(){
    return this.position.x;
  }

  getYPosition(){
    return this.position.y;
  }

  getZPosition(){
    return this.position.z;
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

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields

      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: UTWObject.ResType,
        onLoad: (gff) => {
          this.template.Merge(gff);
          this.InitProperties();
          if(onLoad != null)
            onLoad(this.template);
        },
        onFail: () => {
          console.error('Failed to load waypoint template');
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      if(onLoad != null)
        onLoad(this.template);
    }
  }

}

module.exports = ModuleWaypoint;
