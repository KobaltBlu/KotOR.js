import * as THREE from "three";
import { GameState } from "../GameState";
import { EngineMode } from "../enums/engine/EngineMode";
import { Utility } from "../utility/Utility";
import type { ModuleArea, ModuleMGPlayer } from "../module";
import { MiniGameType } from "../enums/engine/MiniGameType";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ResolutionManager } from "../managers/ResolutionManager";

/**
 * FollowerCamera class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file FollowerCamera.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FollowerCamera {

  static DEFAULT_FOV = 55;

  static camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera( 55, ResolutionManager.getViewportWidth() / ResolutionManager.getViewportHeight(), 0.01, 15000 );
  static box: THREE.Box3 = new THREE.Box3();

  static turning: boolean = false;

  static facing: number = 0;
  static dir: number = 0;
  static maxDistance: number = 1;
  static distance: number = 0;

  //style
  static pitch: number = 0;
  static height: number = 0;
  static fov: number = 55;

  static speed: number = 0;
  static maxSpeed: number = 2.5;
  static minSpeed: number = 0;
  static rampSpeed: number = 10;

  static cameraStyle: any = {};

  static raycaster: THREE.Raycaster = new THREE.Raycaster();

  static setCameraStyle(cameraStyle: any = {}){
    FollowerCamera.cameraStyle = cameraStyle;
    if(typeof cameraStyle.pitch !== 'undefined') FollowerCamera.pitch = cameraStyle.pitch == '****' ? 0 : parseInt(cameraStyle.pitch);
    if(typeof cameraStyle.height !== 'undefined') FollowerCamera.height = cameraStyle.height == '****' ? 0 : parseFloat(cameraStyle.height);
    if(typeof cameraStyle.distance !== 'undefined') FollowerCamera.distance = FollowerCamera.maxDistance = cameraStyle.distance == '****' ? 0 : parseFloat(cameraStyle.distance);

    FollowerCamera.pitch = THREE.MathUtils.degToRad(this.pitch);
  }

  static setCameraFOV(fov: number = 55){
    FollowerCamera.fov = FollowerCamera.camera.fov = fov;
    FollowerCamera.resize();
  }

  static update(delta: number = 0, area: ModuleArea){
    if(FollowerCamera.turning && FollowerCamera.speed < FollowerCamera.maxSpeed){
      FollowerCamera.speed += FollowerCamera.rampSpeed * delta;

      if(FollowerCamera.speed > FollowerCamera.maxSpeed)
      FollowerCamera.speed = FollowerCamera.maxSpeed;
    }else if(FollowerCamera.speed > FollowerCamera.minSpeed){
      FollowerCamera.speed -= FollowerCamera.rampSpeed * delta;

      if(FollowerCamera.speed < 0)
      FollowerCamera.speed = 0;
    }

    if(FollowerCamera.speed > 0){
      FollowerCamera.facing = (Utility.NormalizeRadian(FollowerCamera.facing + (FollowerCamera.speed * FollowerCamera.dir) * delta))
    }

    FollowerCamera.turning = false;

    let followee = GameState.getCurrentPlayer();
    if(!followee) return;

    let offsetHeight = 0;

    if(GameState.Mode == EngineMode.MINIGAME){
      offsetHeight = 1;
    }else{
      if( followee.getAppearance().cameraheightoffset >= 0 ){
        offsetHeight = followee.getAppearance().cameraheightoffset;
      }
    }
    
    let camHeight = (1.35 + FollowerCamera.height)-offsetHeight;
    let distance = FollowerCamera.maxDistance * GameState.CameraDebugZoom;

    FollowerCamera.raycaster.far = 10;
    FollowerCamera.raycaster.ray.direction.set(Math.cos(FollowerCamera.facing), Math.sin(FollowerCamera.facing), 0).normalize();
    FollowerCamera.raycaster.ray.origin.set(followee.position.x, followee.position.y, followee.position.z + camHeight);

    let aabbFaces = [];
    let intersects;

    FollowerCamera.box.min.copy(FollowerCamera.raycaster.ray.origin);
    FollowerCamera.box.max.copy(FollowerCamera.raycaster.ray.origin);
    FollowerCamera.box.expandByScalar(distance * 1.5);
    
    if(followee.room && followee.room.collisionData.walkmesh && followee.room.collisionData.walkmesh.aabbNodes.length){
      aabbFaces.push({
        object: followee.room, 
        faces: followee.room.collisionData.walkmesh.getAABBCollisionFaces(FollowerCamera.box)
      });
    }

    for(let j = 0, jl = area.doors.length; j < jl; j++){
      let door = area.doors[j];
      if(door && door.collisionData.walkmesh && !door.isOpen()){
        if(door.box.intersectsBox(FollowerCamera.box) || door.box.containsBox(FollowerCamera.box)){
          aabbFaces.push({
            object: door,
            faces: door.collisionData.walkmesh.faces
          });
        }
      }
    }
    
    for(let k = 0, kl = aabbFaces.length; k < kl; k++){
      let castableFaces = aabbFaces[k];
      intersects = castableFaces.object.collisionData.walkmesh.raycast(FollowerCamera.raycaster, castableFaces.faces) || [];
      if ( intersects.length > 0 ) {
        for(let i = 0; i < intersects.length; i++){
          if(intersects[i].distance < distance){
            distance = intersects[i].distance * .75;
          }
        }
      }
    }

    FollowerCamera.raycaster.far = Infinity;

    if(GameState.Mode == EngineMode.MINIGAME){
      if(BitWise.InstanceOf(followee?.objectType, ModuleObjectType.ModuleMGPlayer)){
        ( (followee: ModuleMGPlayer) => {
          followee.camera.camerahook.getWorldPosition(FollowerCamera.camera.position);
          followee.camera.camerahook.getWorldQuaternion(FollowerCamera.camera.quaternion);

          switch(area.miniGame.type){
            case MiniGameType.SWOOPRACE:
              FollowerCamera.camera.fov = area.miniGame.cameraViewAngle;
            break;
            case MiniGameType.TURRET:
              FollowerCamera.camera.fov = area.miniGame.cameraViewAngle;
            break;
          }
          FollowerCamera.camera.fov = area.miniGame.cameraViewAngle;
        })(followee as any);
      }
    }else{
      FollowerCamera.camera.position.copy(followee.position);

      //If the distance is greater than the last distance applied to the camera. 
      //Increase the distance by the frame delta so it will grow overtime until it
      //reaches the max allowed distance wether by collision or camera settings.
      if(distance > FollowerCamera.distance){
        distance = FollowerCamera.distance += 2 * delta;
      }

      if(distance > FollowerCamera.maxDistance * GameState.CameraDebugZoom){
        distance = (FollowerCamera.maxDistance * GameState.CameraDebugZoom);
      }
        
      FollowerCamera.camera.position.x += distance * Math.cos(FollowerCamera.facing);
      FollowerCamera.camera.position.y += distance * Math.sin(FollowerCamera.facing);
      FollowerCamera.camera.position.z += camHeight;

      FollowerCamera.distance = distance;
    
      FollowerCamera.camera.rotation.order = 'YZX';
      FollowerCamera.camera.rotation.set(FollowerCamera.pitch, 0, FollowerCamera.facing+Math.PI/2);
    }
    
    FollowerCamera.camera.updateProjectionMatrix();
  }

  static resize(){
    const width = ResolutionManager.getViewportWidth();
    const height = ResolutionManager.getViewportHeight();
    FollowerCamera.camera.fov = FollowerCamera.fov;
    FollowerCamera.camera.aspect = width / height;
    FollowerCamera.camera.updateProjectionMatrix();
  }

}

