import { GameState } from "./GameState";
import { PartyManager } from "./managers/PartyManager";
import { ModuleDoor, ModuleObject, ModuleRoom } from "./module";
import { OdysseyWalkMesh } from "./odyssey";
import * as THREE from "three";
import { Utility } from "./utility/Utility";
import { ConfigClient } from "./utility/ConfigClient";
import { OdysseyFace3 } from "./three/odyssey";

interface AABBFaceData {
  object: ModuleObject,
  faces: OdysseyFace3[],
}

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

  constructor(object: ModuleObject){
    this.object = object;
  }

  updateCollision(delta = 0){
    
    if(!this.object.model || !GameState.module || !GameState.module.area)
      return;

    if(this.groundFace && this.object.room && this.object.room.model?.wok && this.object.room.model.wok.walkableFaces.indexOf(this.groundFace) == -1){
      this.findWalkableFace();
    }

    let _axisFront = this.object.AxisFront.clone();
    let _oPosition = this.object.position.clone();

    //this.object.getCurrentRoom();
    let hitdist = this.object.getAppearance().hitdist;
    let hitdist_half = hitdist/2;
    
    let box = new THREE.Box3()
    
    if(this.object.container && this.object.box){
      this.object.box.setFromObject(this.object.container);
      this.object.sphere = this.object.box.getBoundingSphere(this.object.sphere);
      box = this.object.box.clone();
      box.translate(_axisFront);
    }

    //START Gravity
    GameState.raycaster.far = 10;
    let falling = true;
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.object.position.clone().add( ( scratchVec3 ) );
    GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    GameState.raycaster.ray.direction.set(0, 0,-1);

    let aabbFaces: AABBFaceData[] = [];
    let intersects = [];
    let obj = undefined;

    //START: CREATURE COLLISION
    
    //Check creature collision
    let creature = undefined;
    const pd_cos = Math.cos(this.object.rotation.z + Math.PI/2);
    const pd_sin = Math.sin(this.object.rotation.z + Math.PI/2);
    if(true || ConfigClient.options?.Game?.debug?.creature_collision){
      for(let i = 0, len = GameState.module.area.creatures.length; i < len; i++){
        creature = GameState.module.area.creatures[i];
        if(creature){
          let position = this.object.position.clone().add(this.object.AxisFront);
          
          if(creature == this.object || creature.isDead())
            continue;

          if(!creature.getAppearance())
            continue;

          let distance = position.distanceTo(creature.position);
          if( distance < hitdist ){
            let pDistance = hitdist - distance;
            scratchVec3.set(
              pDistance * pd_cos,
              pDistance * pd_sin,
              0 
            );
            position.sub(scratchVec3);
            if(this.object.AxisFront.clone().normalize().length() > 0){
              let ahead = position.clone().add(this.object.AxisFront.clone().normalize());
              let avoidance_force = ahead.clone().sub(creature.position).normalize().multiplyScalar(0.5*delta);
              avoidance_force.z = 0;
              this.object.AxisFront.copy(avoidance_force);
            }
            break;
          }
        }
      }
    }

    //Check party collision
    if(true || ConfigClient.options?.Game?.debug?.creature_collision){
      for(let i = 0, len = PartyManager.party.length; i < len; i++){
        creature = PartyManager.party[i];
        if(creature){
          let position = this.object.position.clone().add(this.object.AxisFront);

          if(creature == this.object || creature.isDead())
            continue;

          let distance = position.distanceTo(creature.position);
          if(distance < hitdist){
            let pDistance = hitdist - distance;
            scratchVec3.set(
              pDistance * Math.cos(this.object.rotation.z + Math.PI/2), 
              pDistance * Math.sin(this.object.rotation.z + Math.PI/2), 
              0 
            );
            this.object.position.sub(scratchVec3);
            if(this.object.AxisFront.clone().normalize().length() > 0){
              let ahead = position.clone().add(this.object.AxisFront.clone().normalize());
              let avoidance_force = ahead.clone().sub(creature.position).normalize().multiplyScalar(0.5*delta);
              avoidance_force.z = 0;
              this.object.AxisFront.copy(avoidance_force);
            }
            break;
          }
        }
      }
    }

    //END: CREATURE COLLISION

    if(this.object.room){

      //START: DOOR COLLISION

      if(true || ConfigClient.options?.Game?.debug?.door_collision){
        for(let j = 0, jl = this.object.room.doors.length; j < jl; j++){
          obj = this.object.room.doors[j];
          if(obj && obj.collisionData.walkmesh && !obj.isOpen()){
            aabbFaces.push({
              object: obj,
              faces: obj.collisionData.walkmesh.faces
            });
          }
        }
      }

      let worldCollide = false;
      let collider = undefined;
      let world_collisions = [];
      let castableFaces: AABBFaceData;
      let intersect: THREE.Intersection;
      let dot = 0;
      for(let i = 0; i < 12; i++){
        GameState.raycaster.ray.direction.set(ModuleObject.DX_LIST[i], ModuleObject.DY_LIST[i], 0);
        for(let k = 0, kl = aabbFaces.length; k < kl; k++){
          if(!castableFaces.object?.collisionData?.walkmesh) continue;
          playerFeetRay.copy(this.object.position).add(this.object.AxisFront);
          GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);

          castableFaces = aabbFaces[k];
          castableFaces.object.collisionData.walkmesh.mesh.visible = true;
          intersects = castableFaces.object.collisionData.walkmesh.raycast(GameState.raycaster, castableFaces.faces) || [];
          if (intersects && intersects.length > 0 ) {
            for(let j = 0, jLen = intersects.length; j < jLen; j++){
              intersect = intersects[j];
              if(intersect.distance < hitdist_half){
                if(intersect.face.materialIndex == 7 || intersect.face.materialIndex == 2){

                  if(intersect.object.userData.moduleObject instanceof ModuleDoor){
                    this.blockingObject = intersect.object.userData.moduleObject;
                  }

                  if(!collider || collider.distance < intersect.distance)
                    collider = intersect;

                  world_collisions.push(collider);
                  dot = _axisFront.clone().dot(intersect.face.normal);
                  
                  if(dot){
                    this.object.AxisFront.add(
                      intersect.face.normal.clone().multiplyScalar(-dot)
                    );
                  }
                  worldCollide = true;
                }
              }
            }
          }
        }
      }

      //END: DOOR COLLISION

      //START: PLACEABLE COLLISION
      this.object.tmpPos = this.object.position.clone().add(this.object.AxisFront);
      let plcEdgeLines = [];
      let face;
      let edge;
      let line;
      let closestPoint = new THREE.Vector3(0, 0, 0);
      let distance;
      let plcCollision = false;
      let reflectAngle = new THREE.Vector3(0, 0, 0);
      let reflectForce = new THREE.Vector3(0, 0, 0);
      for(let j = 0, jl = this.object.room.placeables.length; j < jl; j++){
        obj = this.object.room.placeables[j];
        if(obj && obj.collisionData.walkmesh && obj.model && obj.model.visible){
          obj.box.setFromObject(obj.container);
          if(obj.box.intersectsBox(box) || obj.box.containsBox(box)){
            for (const [index, edge] of obj.room.collisionData.walkmesh.edges) {
              edge.line.closestPointToPoint(this.object.tmpPos, true, closestPoint);
              distance = closestPoint.distanceTo(this.object.tmpPos);
              if(distance < hitdist_half){
                reflectAngle.copy(this.object.tmpPos).sub(closestPoint);
                reflectAngle.z = 0;
                reflectForce.copy(reflectAngle);
                reflectAngle.normalize();
                plcEdgeLines.push({
                  edge: edge,
                  object: obj,
                  line: line,
                  closestPoint: closestPoint.clone(),
                  distance: distance,
                  maxDistance: hitdist_half,
                  position: this.object.position,
                  reflectAngle: reflectAngle.clone(),
                  reflectForce: reflectForce.clone(),
                });
                plcCollision = true;
              }
            }
          }
        }
      }

      //END: PLACEABLE COLLISION
      
      //START: ROOM COLLISION
      if(!this.groundFace){
        this.findWalkableFace();
      }

      //room walkable edge check
      let roomCollision = false;
      for (const [index, edge] of this.object.room.collisionData.walkmesh.edges) {
        if(edge && edge.transition == -1){
          edge.line.closestPointToPoint(this.object.tmpPos, true, closestPoint);
          distance = closestPoint.distanceTo(this.object.tmpPos);
          if(distance < hitdist_half){
            plcEdgeLines.push({
              object: this.object.room,
              line: edge.line,
              closestPoint: closestPoint.clone(),
              distance: distance,
              maxDistance: hitdist_half,
              position: this.object.position
            });
            roomCollision = true;
          }
        }
      }

      
        
      if(!((plcCollision || worldCollide) && roomCollision)){
        if(plcEdgeLines.length){
          plcEdgeLines.sort((a, b) => (a.distance > b.distance) ? -1 : 1)
          let average = new THREE.Vector3();
          let edgeLine = undefined;
          let distanceOffset = 0;
          let force = new THREE.Vector3(0, 0, 0);
          let forceCount = 1;
          let originBias = _oPosition.clone().sub(this.object.tmpPos);
          // average.sub(this.object.AxisFront).multiplyScalar(0.1);
          // average.add(originBias);
          for(let i = 0, len = plcEdgeLines.length; i < len; i++){
            edgeLine = plcEdgeLines[i];
            //Attempt: 3

            // force.copy(edgeLine.reflectAngle).multiplyScalar(hitdist_half);
            // force.add(edgeLine.reflectForce);
            // force.z = 0;
            // average.add( force );
            // forceCount++;

            //Attempt: 2
            // let dot = _axisFront.clone().dot(edgeLine.edge.normal);
            // if(dot){
            //   force.copy(_axisFront);
            //   force.add(
            //     edgeLine.edge.normal.clone().multiplyScalar(-dot)
            //   );
            //   average.add( force );
            //   forceCount++;
            // }

            //Attempt: 1
            distanceOffset = edgeLine.maxDistance - edgeLine.distance;
            force = edgeLine.closestPoint.clone().sub(edgeLine.position);
            force.multiplyScalar(distanceOffset * 2.5);
            force.z = 0;
            average.add( force.negate() );
            // forceCount++;
          }
          this.object.position.copy(this.object.tmpPos);
          this.object.AxisFront.copy(average.divideScalar(plcEdgeLines.length));
        }
      }else{
        this.object.AxisFront.set(0, 0, 0);
      }
      //END: ROOM COLLISION

      //Check to see if we tp'd inside of a placeable
      if(this.object.AxisFront.length()){
        this.object.tmpPos.copy(this.object.position).add(this.object.AxisFront);
        for(let j = 0, jl = this.object.room.placeables.length; j < jl; j++){
          obj = this.object.room.placeables[j];
          if(obj && obj.collisionData.walkmesh && obj.model && obj.model.visible){
            for(let i = 0, iLen = obj.collisionData.walkmesh.faces.length; i < iLen; i++){
              face = obj.collisionData.walkmesh.faces[i];
              if(face.triangle.containsPoint(this.object.tmpPos) && face.surfacemat.walk){
                //bail we should not be here
                this.object.AxisFront.set(0, 0, 0);
                this.object.position.copy(_oPosition);
              }
            }
          }
        }
      
        //DETECT: ROOM TRANSITION
      for (const [index, edge] of this.object.room.collisionData.walkmesh.edges) {
          if(edge && edge.transition >= 0){
            if(
              Utility.LineLineIntersection(
                this.object.position.x,
                this.object.position.y,
                this.object.position.x + this.object.AxisFront.x,
                this.object.position.y + this.object.AxisFront.y,
                edge.line.start.x,
                edge.line.start.y,
                edge.line.end.x,
                edge.line.end.y
              )
            ){
              this.object.attachToRoom(GameState.module.area.rooms[edge.transition]);
              break;
            }
          }
        }
        
        if(this.object.lastDoorEntered){
          this.object.lastDoorEntered.testTransitionLineCrosses(this.object);
        }

        //update creature position
        this.object.position.add(this.object.AxisFront);
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
          this.object.AxisFront.set(0, 0, 0);
          this.object.position.copy(_oPosition);
          this.groundFace = this.lastGroundFace;
          this.object.attachToRoom(this.lastRoom);
          this.object.AxisFront.set(0, 0, 0);
        }
      }
    }

    //END Gravity
    GameState.raycaster.far = Infinity;

  }

  findWalkableFace(object?: ModuleObject){
    let objectPos = this.object.position;
    let face;
    let room;
    for(let i = 0, il = GameState.module.area.rooms.length; i < il; i++){
      room = GameState.module.area.rooms[i];
      if(room.collisionData.walkmesh){
        for(let j = 0, jl = room.collisionData.walkmesh.walkableFaces.length; j < jl; j++){
          face = room.collisionData.walkmesh.walkableFaces[j];
          if(face.triangle.containsPoint(objectPos)){
            this.groundFace = face;
            this.lastGroundFace = this.groundFace;
            this.surfaceId = this.groundFace.walkIndex;
            this.object.attachToRoom(room);
            face.triangle.closestPointToPoint(objectPos, this.wm_c_point);
            objectPos.z = this.wm_c_point.z + .005;
          }
        }
      }
    }
    return face;
  }

  roomCheck(delta: number = 0){
    if(!this.object.room){
      if(!this.roomCheckTimer || this.roomCheckTimer <= 0){
        this.roomCheckTimer = 1;
        this.findWalkableFace();
      }
      this.roomCheckTimer -= delta;
    }
    this.object.setModelVisibility();
  }

}