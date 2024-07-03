import { GameState } from "./GameState";
import type { ModuleCreature, ModuleDoor, ModuleObject, ModuleRoom } from "./module";
import { OdysseyWalkMesh } from "./odyssey";
import * as THREE from "three";
import { Utility } from "./utility/Utility";
import { ConfigClient } from "./utility/ConfigClient";
import { OdysseyFace3 } from "./three/odyssey";
import { ModuleDoorAnimState } from "./enums/module/ModuleDoorAnimState";
import { BitWise } from "./utility/BitWise";
import { ModuleObjectType } from "./enums";

interface AABBFaceData {
  object: ModuleObject,
  faces: OdysseyFace3[],
}

/**
 * CollisionData class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CollisionData.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CollisionData {
  object: ModuleObject;
  blockingTimer: number = 0;
  lastBlockingObject: ModuleObject;
  blockingObject: ModuleObject;
  walkmesh: OdysseyWalkMesh;
  surfaceId: any;
  groundFace: any;
  lastGroundFace: any;
  wm_c_point: THREE.Vector3 = new THREE.Vector3();
  lastRoom: ModuleRoom;
  groundTilt = new THREE.Vector3();

  roomCheckTimer: any;

  
  static DIR_COUNT: number = 12;
  static DX_LIST: number[] = [1,  0.15425144988758405, -0.9524129804151563, -0.4480736161291702, 0.8141809705265618,  0.6992508064783751, -0.5984600690578581, -0.8838774731823718,  0.32578130553514806, 0.9843819506325049, -0.022096619278683942, -0.9911988217552068];
  static DY_LIST: number[] = [0, -0.9880316240928618,  -0.3048106211022167,  0.8939966636005579, 0.5806111842123143, -0.7148764296291646, -0.8011526357338304,  0.46771851834275896, 0.9454451549211168, -0.1760459464712114, -0.9997558399011495,   -0.13238162920545193];

  box = new THREE.Box3()
  rayLine3 = new THREE.Line3();
  aabbFaces: AABBFaceData[] = [];
  intersects: THREE.Intersection[] = [];
  intersect: THREE.Intersection;
  castableFaces: AABBFaceData;
  scratchVec3 = new THREE.Vector3(0, 0, 2);
  closestPoint = new THREE.Vector3(0, 0, 0);

  world_collisions: THREE.Intersection[] = [];

  constructor(object: ModuleObject){
    this.object = object;
  }

  dot: number = 0;
  _reflectAngle = new THREE.Vector3(0, 0, 0);
  reflectAngle = new THREE.Vector3(0, 0, 0);
  reflect(line: THREE.Line3){
    //line.vector()
    const vx = line.end.x - line.start.x;
    const vy = line.end.y - line.start.y;

    //line.vector().perp()
    let px = -vy;
    let py =  vx;

    //line.vector().perp().norm()
    const mag = Math.sqrt(px * px + py * py);
    const r = 1/mag;

    px = px * r;
    py = py * r;

    //cross(point - start)
    const cx = this.object.position.x - line.start.x;
    const cy = this.object.position.y - line.start.y;

    const d = vx * cy - vy * cx;
    const side = (d < 0) ? -1 : (d > 0) ? 1 : 0;

    //reflection angle
    px *= side;
    py *= side;

    this._reflectAngle.set(px, py, 0);
    // this.dot = _axisFront.clone().dot(this.reflectAngle);
    
    return this._reflectAngle;
    // this.object.forceVector.add(
    //   this.reflectAngle.clone().multiplyScalar((hitdist_half-distance) + 0.01)
    // );
  }
  
  _axisFront = new THREE.Vector3();
  _oPosition = new THREE.Vector3();
  playerFeetRay = new THREE.Vector3(0, 0, 0);
  updateCollision(delta = 0){
    
    if(!this.object || !this.object.model || !this.object.room || !GameState.module || !this.object.area){
      return;
    }

    if(this.groundFace && this.object.room && this.object.room.model?.wok && this.object.room.model.wok.walkableFaces.indexOf(this.groundFace) == -1){
      this.findWalkableFace();
    }

    this._axisFront.copy(this.object.forceVector);
    this._oPosition.copy(this.object.position);

    //this.object.getCurrentRoom();
    let hitdist = 1;
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){ 
      hitdist = (this.object as ModuleCreature).getAppearance().hitdist; 
    }
    const hitdist_half = hitdist/2;
    
    this.box.min.set(0, 0, 0);
    this.box.max.set(0, 0, 0);
    
    if(this.object.container && this.object.box){
      this.object.box.setFromObject(this.object.container);
      this.object.sphere = this.object.box.getBoundingSphere(this.object.sphere);
      this.box = this.object.box.clone();
      this.box.translate(this._axisFront);
    }

    //START Gravity
    GameState.raycaster.far = 10;

    this.scratchVec3.set(0, 0, 2);
    this.playerFeetRay = this.object.position.clone().add(this.scratchVec3);
    GameState.raycaster.ray.origin.copy(this.playerFeetRay);
    GameState.raycaster.ray.direction.set(0, 0, -1);

    this.rayLine3.start.copy(this._oPosition);
    this.rayLine3.end.copy(this._oPosition).add(this._axisFront);

    this.aabbFaces = [];
    this.intersects = [];
    let obj = undefined;
    
    //--------------------//
    // CREATURE COLLISION //
    //--------------------//

    let creature = undefined;
    const pd_cos = Math.cos(this.object.rotation.z + Math.PI/2);
    const pd_sin = Math.sin(this.object.rotation.z + Math.PI/2);
    if(true || ConfigClient.options?.Game?.debug?.creature_collision){
      for(let i = 0, len = GameState.module.area.creatures.length; i < len; i++){
        creature = GameState.module.area.creatures[i];
        if(!creature){
          continue;
        }

        let position = this.object.position.clone().add(this.object.forceVector);
        
        if(creature == this.object || creature.isDead())
          continue;

        if(!creature.getAppearance())
          continue;

        let distance = position.distanceTo(creature.position);
        if( distance >= hitdist ){
          continue;
        }

        let pDistance = hitdist - distance;
        this.scratchVec3.set( pDistance * pd_cos, pDistance * pd_sin, 0 );
        position.sub(this.scratchVec3);
        
        if(!this.object.forceVector.clone().normalize().length()){
          continue;
        }

        let ahead = position.clone().add(this.object.forceVector.clone().normalize());
        let avoidance_force = ahead.clone().sub(creature.position).normalize().multiplyScalar(0.5*delta);
        avoidance_force.z = 0;
        this.object.forceVector.copy(avoidance_force);
        
        break;
      }
    }

    //-----------------//
    // PARTY COLLISION //
    //-----------------//

    if(true || ConfigClient.options?.Game?.debug?.creature_collision){
      for(let i = 0, len = GameState.PartyManager.party.length; i < len; i++){
        creature = GameState.PartyManager.party[i];
        if(!creature){
          continue;
        }

        let position = this.object.position.clone().add(this.object.forceVector);

        if(creature == this.object || creature.isDead()){
          continue;
        }

        let distance = position.distanceTo(creature.position);
        if(distance >= hitdist){
          continue;
        }

        let pDistance = hitdist - distance;
        this.scratchVec3.set(
          pDistance * Math.cos(this.object.rotation.z + Math.PI/2), 
          pDistance * Math.sin(this.object.rotation.z + Math.PI/2), 
          0 
        );
        this.object.position.sub(this.scratchVec3);
        if(!this.object.forceVector.clone().normalize().length()){
          continue;
        }

        let ahead = position.clone().add(this.object.forceVector.clone().normalize());
        let avoidance_force = ahead.clone().sub(creature.position).normalize().multiplyScalar(0.5*delta);
        avoidance_force.z = 0;
        this.object.forceVector.copy(avoidance_force);
        break;
      }
    }

    //----------------//
    // DOOR COLLISION //
    //----------------//

    if(true || ConfigClient.options?.Game?.debug?.door_collision){
      for(let j = 0, jl = this.object.room.doors.length; j < jl; j++){
        obj = this.object.room.doors[j];
        if(obj && obj.collisionData.walkmesh && !obj.isOpen() && !obj.collisionDelay
        ){
          this.aabbFaces.push({
            object: obj,
            faces: obj.collisionData.walkmesh.faces
          });
        }
      }
    }

    let worldCollide = false;
    let collider = undefined;
    this.world_collisions = [];
    let dot = 0;
    let count = 0;
    for(let i = 0; i < CollisionData.DIR_COUNT; i++){
      GameState.raycaster.ray.direction.set(CollisionData.DX_LIST[i], CollisionData.DY_LIST[i], 0);
      for(let j = 0, len = this.aabbFaces.length; j < len; j++){
        this.castableFaces = this.aabbFaces[j];
        if(!this.castableFaces.object?.collisionData?.walkmesh){
          continue;
        }

        this.playerFeetRay.copy(this.object.position).add(this.object.forceVector);
        GameState.raycaster.ray.origin.copy(this.playerFeetRay);

        this.castableFaces.object.collisionData.walkmesh.mesh.visible = true;
        this.intersects = this.castableFaces.object.collisionData.walkmesh.raycast(GameState.raycaster, this.castableFaces.faces) || [];
        if (!this.intersects || !this.intersects.length ) {
          continue;
        }

        for(let k = 0, len2 = this.intersects.length; k < len2; k++){
          this.intersect = this.intersects[k];
          if(this.intersect.distance >= hitdist_half){
            continue;
          }

          if(this.intersect.face.materialIndex != 7 && this.intersect.face.materialIndex != 2){
            continue;
          }

          if(this.intersect.object.userData.moduleObject instanceof GameState.Module.ModuleArea.ModuleDoor){
            this.blockingObject = this.intersect.object.userData.moduleObject;
          }

          if(!collider || collider.distance < this.intersect.distance)
            collider = this.intersect;

          this.world_collisions.push(collider);
          dot = this._axisFront.clone().dot(this.intersect.face.normal);
          
          if(dot){
            this.object.forceVector.add(
              this.intersect.face.normal.clone().multiplyScalar(hitdist_half - this.intersect.distance)
            );
            count++;
          }
          worldCollide = true;
        }
      }
    }
    
    //---------------------//
    // PLACEABLE COLLISION //
    //---------------------//

    this.object.tmpPos = this.object.position.clone().add(this.object.forceVector);
    this.closestPoint.set(0, 0, 0);
    let face;
    let distance;
    let plcCollision = false;
    for(let i = 0, len = this.object.room.placeables.length; i < len; i++){
      obj = this.object.room.placeables[i];
      if(!obj || !obj.collisionData.walkmesh || !obj.model || !obj.model.visible){
        continue;
      }

      obj.box.setFromObject(obj.container);
      if(!obj.box.intersectsBox(this.box) && !obj.box.containsBox(this.box)){
        continue;
      }

      for (const [index, edge] of obj.collisionData.walkmesh.edges) {
        edge.line.closestPointToPoint(this.object.tmpPos, true, this.closestPoint);
        distance = this.closestPoint.distanceTo(this.object.tmpPos);
        if(distance >= hitdist_half){
          continue;
        }

        this.reflectAngle.copy(this.reflect(edge.line));
        this.object.forceVector.add(
          this.reflectAngle.clone().multiplyScalar((hitdist_half - distance) + 0.01)
        );

        // this.reflectAngle.set(px, py, 0);
        // dot = _axisFront.clone().dot(this.reflectAngle);
        
        // this.object.forceVector.add(
        //   this.reflectAngle.clone().multiplyScalar((hitdist_half-distance) + 0.01)
        // );

        worldCollide = true;
        plcCollision = true;
        count++;
      }
    }
    
    //----------------//
    // ROOM COLLISION //
    //----------------//

    if(!this.groundFace){
      this.findWalkableFace();
    }
    
    let roomCollision = false;
    for (const [index, edge] of this.object.room.collisionData.walkmesh.edges) {
      if(!edge || edge.transition >= 0){
        continue;
      }
      
      edge.line.closestPointToPoint(this.object.tmpPos, true, this.closestPoint);
      distance = this.closestPoint.distanceTo(this.object.tmpPos);
      if(distance >= hitdist_half){
        continue;
      }

      this.reflectAngle.copy(this.reflect(edge.line));
      this.object.forceVector.add(
        this.reflectAngle.clone().multiplyScalar((hitdist_half - distance) + 0.01)
      );

      // this.reflectAngle.set(px, py, 0);
      // dot = _axisFront.clone().dot(this.reflectAngle);
      
      // this.object.forceVector.add(
      //   this.reflectAngle.clone().multiplyScalar((hitdist_half-distance) + 0.01)
      // );

      roomCollision = true;
      count++;
    }

    if(count){
      this.object.forceVector.divideScalar(count);
    }

    //Check to see if we tp'd inside of a placeable
    if(!this.object.forceVector.length()){
      return;
    }

    this.object.tmpPos.copy(this.object.position).add(this.object.forceVector);
    for(let i = 0, len = this.object.room.placeables.length; i < len; i++){
      obj = this.object.room.placeables[i];
      if(obj && obj.collisionData.walkmesh && obj.model && obj.model.visible){
        for(let i = 0, iLen = obj.collisionData.walkmesh.faces.length; i < iLen; i++){
          face = obj.collisionData.walkmesh.faces[i];
          if(face.triangle.containsPoint(this.object.tmpPos) && face.surfacemat.walk){
            //bail we should not be here
            // this.object.forceVector.set(0, 0, 0);
            // this.object.position.copy(_oPosition);
          }
        }
      }
    }
  
    //-----------------//
    // ROOM TRANSITION //
    //-----------------//

    for (const [index, edge] of this.object.room.collisionData.walkmesh.edges) {
      if(!edge || edge.transition == -1){
        continue;
      }

      if(
        Utility.LineLineIntersection(
          this.object.position.x,
          this.object.position.y,
          this.object.position.x + this.object.forceVector.x,
          this.object.position.y + this.object.forceVector.y,
          edge.line.start.x, 
          edge.line.start.y, 
          edge.line.end.x, 
          edge.line.end.y 
        )
      ){
        this.object.attachToRoom(this.object.area.rooms[edge.transition]);
        break;
      }
    }
    
    if(this.object.lastDoorEntered){
      this.object.lastDoorEntered.testTransitionLineCrosses(this.object);
    }

    //update creature position
    this.object.position.add(this.object.forceVector);
    //DETECT: GROUND FACE
    this.lastRoom = this.object.room;
    this.lastGroundFace = this.groundFace;
    this.groundFace = undefined;
    if(this.object.room){
      let face = this.object.room.findWalkableFace(this.object);
      if(!face){
        this.findWalkableFace();
      }
    }

    if(!this.groundFace){
      this.object.forceVector.set(0, 0, 0);
      this.object.position.copy(this._oPosition);
      this.groundFace = this.lastGroundFace;
      this.object.attachToRoom(this.lastRoom);
      this.object.forceVector.set(0, 0, 0);
    }

    //END Gravity
    GameState.raycaster.far = Infinity;

  }

  findWalkableFace(object?: ModuleObject){
    let objectPos = this.object.position;
    let face;
    let room;
    for(let i = 0, il = this.object.area.rooms.length; i < il; i++){
      room = this.object.area.rooms[i];
      if(!room.collisionData.walkmesh){
        continue;
      }

      for(let j = 0, jl = room.collisionData.walkmesh.walkableFaces.length; j < jl; j++){
        face = room.collisionData.walkmesh.walkableFaces[j];
        if(!face.triangle.containsPoint(objectPos)){
          continue;
        }
        this.groundFace = face;
        this.lastGroundFace = this.groundFace;
        this.surfaceId = this.groundFace.walkIndex;
        this.object.attachToRoom(room);
        face.triangle.closestPointToPoint(objectPos, this.wm_c_point);
        objectPos.z = this.wm_c_point.z + .005;
      }
    }
    return face;
  }

  roomCheck(delta: number = 0){
    if(!this.object.room && this.object.area){
      if(!this.roomCheckTimer || this.roomCheckTimer <= 0){
        this.roomCheckTimer = 1;
        this.findWalkableFace();
      }
      this.roomCheckTimer -= delta;
    }
    this.object.setModelVisibility();
  }

}