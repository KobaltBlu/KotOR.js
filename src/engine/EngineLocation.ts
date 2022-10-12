import * as THREE from "three";

export default class EngineLocation {
  position: THREE.Vector3;
  rotation: THREE.Vector3;
  area: any;
  facing: number;

  constructor(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, area: any = undefined){
    this.position = new THREE.Vector3(x, y, z);
    this.rotation = new THREE.Vector3(rx, ry, rz);
    this.area = area;
    this.updateFacing();
  }

  getPosition(){
    return this.position;
  }

  setPosition(x = 0, y = 0, z = 0){
    this.position.set(x, y, z);
  }

  getRotation(){
    return this.rotation;
  }

  setRotation(rx = 0, ry = 0, rz = 0){
    this.rotation.set(rx, ry, rz);
    this.updateFacing();
  }

  //Set rotation from bearing in degrees
  setBearing( bearing = 0 ){
    let facing = bearing / 180;
    this.setFacing(facing);
  }

  //Bearing is facing in degrees
  getBearing(){
    return this.facing * 180;
  }

  //Set the facing value and then update the rotation values
  setFacing( facing = 0 ){
    this.facing = 0;
    let theta = facing;

    this.rotation.x = 1 * Math.cos(theta);
    this.rotation.y = 1 * Math.sin(theta);
    this.rotation.z = 0;
  }

  //Bearing is facing in radians
  getFacing(){
    return this.facing;
  }

  //Use the rotation values to update the facing value
  updateFacing(){
    this.facing = -Math.atan2(this.rotation.x, this.rotation.y);
  }

  getArea(){
    return this.area;
  }

  setArea(area: any){
    this.area = area;
  }

  //HACK
  getModel(){
    return this;
  }

}