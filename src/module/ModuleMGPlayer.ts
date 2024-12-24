import { ModuleObject } from "./ModuleObject";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { GameState } from "../GameState";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import { Utility } from "../utility/Utility";
import { OdysseyModel, OdysseyModelAnimationManager } from "../odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
// import { NWScript } from "../nwscript/NWScript";
import { IModelListItem } from "../interface/module/minigame/IModelListItem";
import { MiniGameType } from "../enums/engine/MiniGameType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { MDLLoader } from "../loaders";
import type { ModuleRoom } from "./ModuleRoom";
import { ModuleMGGunBank } from "./ModuleMGGunBank";
import type { ModuleMGGunBullet } from "./ModuleMGGunBullet";
import type { ModuleMGEnemy } from "./ModuleMGEnemy";
import type { ModuleMGObstacle } from "./ModuleMGObstacle";

/**
* ModuleMGPlayer class.
* 
* Class representing the player in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleMGPlayer.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGPlayer extends ModuleObject {

  camera: OdysseyModel3D;
  models: OdysseyModel3D[] = [];
  track: OdysseyObject3D;
  animationManagers: OdysseyModelAnimationManager[];
  lastRoom: ModuleRoom;
  gun_hook: THREE.Object3D;

  gunBanks: ModuleMGGunBank[] = [];
  bullets: ModuleMGGunBullet[] = [];

  //debug sphere
  sphere_geom: THREE.Mesh;

  modelProps: IModelListItem[] = [];
  no_rotate: THREE.Group;
  speed_min: number;
  speed_max: number;
  accel_secs: number;
  accel_lateral_secs: number;
  lateralForce: number;
  invince: number;
  gear: number;
  gunTimer: number;
  jumpVelcolity: number;
  boostVelocity: number;
  falling: boolean;
  alive: boolean;
  tunnel: { neg: { x: number; y: number; z: number; }; pos: { x: number; y: number; z: number; }; };
  hit_points: any;
  max_hps: any;
  onCreateRun: boolean;
  sphere_radius: number;
  invince_period: number;
  bump_damage: any;
  cameraRotate: any;
  num_loops: any;

  cameraName: string = '';
  trackName: string = '';

  constructor(template: GFFObject){
    super();
    this.objectType |= ModuleObjectType.ModuleMGPlayer;
    console.log('ModuleMGPlayer', template, this);
    this.template = template;

    this.camera = null;
    this.gunBanks = [];
    this.modelProps = [];
    this.track = new OdysseyObject3D();
    this.model = this.container as any;

    this.bullets = [];

    this.no_rotate = new THREE.Group();

    this.animationManagers = [];

    this.speed = 0;
    this.speed_min = 0;
    this.speed_max = 0;
    this.accel_secs = 0;
    this.accel_lateral_secs = 0;
    this.lateralForce = 0;
    this.invince = 0;

    this.gear = -1;
    //this.timer = 0;
    this.gunTimer = 0;
    this.jumpVelcolity = 0;
    this.boostVelocity = 0;
    this.falling = true;
    this.alive = true;

    this.tunnel = {
      neg: {x: 0, y: 0, z: 0},
      pos: {x: 0, y: 0, z: 0}
    }

    this.setTrack(this.track);

    this._heartbeatTimerOffset = -2900;

    const geometry = new THREE.SphereGeometry( 1, 16, 16 );
    const material = new THREE.MeshBasicMaterial( { color: 0x0000FF } );
    material.transparent = true;
    material.opacity = 0.15;
    this.sphere_geom = new THREE.Mesh( geometry, material );

  }

  canMove(){
    return false;
  }

  getHP(){
    return this.hit_points;
  }

  getMaxHP(){
    return this.max_hps;
  }

  setTrack(model = new OdysseyObject3D()){
    console.log('track', model);
    this.track = model;
    this.rotation.reorder('YZX');

    this.rotate('x', 0);
    this.rotate('y', 0);
    this.rotate('z', 0);

    this.container.removeFromParent();

    try{
      this.track.getObjectByName('modelhook').add(this.container);
    }catch(e){
      console.error(e);
    }

    try{
      this.track.parent.add(this.no_rotate);
      this.no_rotate.position.copy(this.track.position);
      this.no_rotate.quaternion.copy(this.track.quaternion);
    }catch(e){
      console.error(e);
    }

    this.onCreateRun = false;

    this._heartbeatTimeout = 0;

  }

  update(delta: number = 0){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

    //super.update(delta);
    //Process the heartbeat timer
    if(GameState.module){
      this.triggerHeartbeat();
    }

    this.sphere.radius = this.sphere_radius;
    // this.model.parent.getWorldPosition(this.position);
    this.sphere.center.copy(this.position);

    this.sphere_geom.scale.setScalar(this.sphere_radius);
    this.sphere_geom.position.copy(this.sphere.center);

    for(let i = 0; i < this.animationManagers.length; i++){
      const aManager = this.animationManagers[i];
      if(
        aManager.currentAnimationState.loop || 
        ( !aManager.currentAnimationState.loop && !aManager.currentAnimationState.elapsedCount )
      ){
        aManager.updateAnimation(aManager.currentAnimation, delta);
      }
    }

    for(let i = 0; i < this.container.children.length; i++){
      const model = this.container.children[i];
      if(model instanceof OdysseyModel3D && model.bonesInitialized && model.visible){
        model.update(delta);
      }
    }

    //this.animationManagers
    this.forceVector.set(0, 0, 0);

    switch(GameState.module.area.miniGame.type){
      case 1:

        if(this.speed_min || this.speed){

          if(this.speed < this.speed_min){
            this.speed = this.speed_min;
          }

          this.speed += (this.accel_secs * delta);

          if(this.speed_max && (this.speed >= this.speed_max)){
            this.speed = this.speed_max;
          }

          this.forceVector.set( this.lateralForce * delta, this.speed * delta, 0 );

          //this.track.position.y += ;
          //this.model.position.z = this.jumpVelcolity;

        }


        this.track.updateMatrixWorld();
        //this.updateCollision(delta);
        this.track.position.add(this.forceVector);
        //this.model.box.setFromObject(this.model);

        const enemies = GameState.module.area.miniGame.enemies;
        for(let i = 0; i < enemies.length; i++){
          const enemy = enemies[i];
          if(enemy.sphere.containsPoint(this.sphere.center)){
            if(!enemy.collided){
              enemy.collided = true;
              this.onHitFollower(enemy);
            }
          }
        }

        if(this.jumpVelcolity > 0){
          this.jumpVelcolity -= (2 *delta);
        }else{
          this.jumpVelcolity = 0;
        }

        if(this.boostVelocity > 0){
          this.boostVelocity -= (2 *delta);
        }else{
          this.boostVelocity = 0;
        }

      break;
      case 2:

      break;
    }
        
    for(let i = 0; i < this.gunBanks.length; i++){
      this.gunBanks[i].update(delta);
    }
    
    // this.model.parent.getWorldPosition(this.position);

    this.sphere.center.copy(this.position);
    this.sphere_geom.position.copy(this.sphere.center);

    if(this.camera instanceof OdysseyModel3D && this.camera.bonesInitialized && this.camera.visible){
      this.camera.update(delta);
    }
    else if(!this.camera){
      let camerahook = this.container.getObjectByName('camerahook');
      if(camerahook)
        this.camera = camerahook.parent.parent as OdysseyModel3D;
    }
    
  }

  updatePaused(delta: number = 0){

  }

  damage(damage = 0){
    if(this.alive){
      this.hit_points -= damage;
      let model: OdysseyModel3D;
      for(let i = 0; i < this.container.children.length; i++){
        model = (this.container.children[i] as OdysseyModel3D);
        if(model instanceof OdysseyModel3D){
          if(model.bonesInitialized && model.visible){
            model.playAnimation('damage', false);
          }
        }
      }
      this.onDamaged();
    }
  }

  adjustHitPoints(nHP = 0, nAbsolute = 0){
    this.hit_points += nHP;
  }

  startInvulnerability(){
    this.invince = this.invince_period || 0;
  }

  shoot(){
    switch(GameState.module.area.miniGame.type){
      case MiniGameType.SWOOPRACE:
        this.jump();
      break;
      case MiniGameType.TURRET:
        this.fire();
      break;
    }
  }

  jump(){
    this.jumpVelcolity = 0.4;
    /*if(this.gear > -1 && !this.falling){
      this.jumpVelcolity = 0.4;
    }else{
      this.jumpVelcolity = 0;
    }*/
  }

  fire(){
    if(this.gunBanks.length){
      for(let i = 0; i < this.gunBanks.length; i++){
        this.gunBanks[i].fire();
      }
    }
    this.onFire();
  }

  rotate(axis = 'x', amount = 0){

    switch(axis){
      case 'x':

        this.rotation.x += amount;

        if(this.rotation.x > this.tunnel.pos.x)
          this.rotation.x = this.tunnel.pos.x;

        if(this.rotation.x < this.tunnel.neg.x)
          this.rotation.x = this.tunnel.neg.x;

      break;
      case 'y':

        this.rotation.y += amount;

        if(this.rotation.y > this.tunnel.pos.y)
          this.rotation.y = this.tunnel.pos.y;

        if(this.rotation.y < this.tunnel.neg.y)
          this.rotation.y = this.tunnel.neg.y;

      break;
      case 'z':

        this.rotation.z += amount;

        if(this.rotation.z > this.tunnel.pos.z)
          this.rotation.z = this.tunnel.pos.z;

        if(this.rotation.z < this.tunnel.neg.z)
          this.rotation.z = this.tunnel.neg.z;

      break;
    }

    this.rotation.x = Utility.NormalizeRadian(this.rotation.x);
    this.rotation.y = Utility.NormalizeRadian(this.rotation.y);
    this.rotation.z = Utility.NormalizeRadian(this.rotation.z);

  }

  playAnimation(name = '', bLooping = 0, bQueue = 0, bOverlay = 0){
    // const padding = '                                             ';
    //console.log(`play: ${name}${padding}`.substring(0, 20), `bLooping: ${bLooping ? 'true' : 'false'}${padding}`.substring(0, 20), `bQueue: ${bQueue ? 'true' : 'false'}${padding}`.substring(0, 20), `bOverlay: ${bOverlay ? 'true' : 'false'}${padding}`.substring(0, 20));
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      const anim = model.getAnimationByName(name);
      if(anim){

        //Check if this animation has already been applied
        const existingIndex = this.animationManagers.findIndex( am => am?.currentAnimation?.name == name );
        if(existingIndex >= 0){
          this.animationManagers.splice(existingIndex, 1);
        }

        if(bOverlay){
          const animManager = new OdysseyModelAnimationManager(model);
          animManager.setCurrentAnimation(anim, {
            loop: bLooping ? true : false,
            // blend: true,
            cFrame: 0,
            elapsed: 0,
            lastTime: 0,
            delta: 0,
            lastEvent: -1,
            events: []
          })
          this.animationManagers.push(animManager);
        }else{
          model.playAnimation(anim, false);
        }
      }
    }
  }

  removeAnimation(name = ''){
    // const padding = '                                             ';
    //console.log( `remove: ${name}${padding}`.substring(0, 20) );
    const existingIndex = this.animationManagers.findIndex( am => am?.currentAnimation?.name == name );
    if(existingIndex >= 0){
      this.animationManagers.splice(existingIndex, 1);
    }
  }

  updateCollision(delta = 0){

    if(!GameState.module || !GameState.module.area)
      return;

    let _axisFront = this.forceVector.clone();
    let _oPosition = this.position.clone();

    //this.getCurrentRoom();
    const hitdist = this.sphere_radius;
    const hitdist_half = hitdist/2;

    this.box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    this.box.translate(this.position);
    this.box.translate(_axisFront);

    const box = this.box.clone();

    //START Gravity
    GameState.raycaster.far = 10;
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.position.clone().add( ( scratchVec3 ) );
    GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    GameState.raycaster.ray.direction.set(0, 0,-1);

    let obj = undefined;

    if(!this.room) this.getCurrentRoom();

    if(this.room){

      //START: PLACEABLE COLLISION
      this.tmpPos = this.position.clone().add(this.forceVector);
      let plcEdgeLines = [];
      let face;
      let edge;
      let line;
      let closestPoint = new THREE.Vector3(0, 0, 0);
      let distance;
      let plcCollision = false;
      /*for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
        obj = this.room.placeables[j];
        if(obj && obj.walkmesh && obj.model && obj.model.visible){
          obj.box.setFromObject(obj.model);
          if(obj.box.intersectsBox(box) || obj.box.containsBox(box)){
            for(let l = 0, ll = obj.walkmesh.edgeKeys.length; l < ll; l++){
              edge = obj.walkmesh.edges[obj.walkmesh.edgeKeys[l]];
              edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
              distance = closestPoint.distanceTo(this.tmpPos);
              if(distance < hitdist_half){
                plcEdgeLines.push({
                  object: obj,
                  line: line,
                  closestPoint: closestPoint.clone(),
                  distance: distance,
                  maxDistance: hitdist_half,
                  position: this.position
                });
                plcCollision = true;
              }
            }
          }
        }
      }*/

      //END: PLACEABLE COLLISION
      
      //START: ROOM COLLISION
      if(!this.collisionData.groundFace){
        this.findWalkableFace();
      }

      //room walkable edge check
      let roomCollision = false;
      for (const [index, edge] of this.room.collisionData.walkmesh.edges) {
        if(edge && edge.transition == -1){
          edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
          distance = closestPoint.distanceTo(this.tmpPos);
          if(distance < hitdist_half){
            plcEdgeLines.push({
              object: this.room,
              line: edge.line,
              closestPoint: closestPoint.clone(),
              distance: distance,
              maxDistance: hitdist_half,
              position: this.position
            });
            roomCollision = true;
          }
        }
      }

      
        
      if(!(plcCollision && roomCollision)){
        if(plcEdgeLines.length){
          plcEdgeLines.sort((a, b) => (a.distance > b.distance) ? -1 : 1)
          let average = new THREE.Vector3();
          let edgeLine = undefined;
          let distanceOffset = 0;
          let force: THREE.Vector3;
          for(let i = 0, len = plcEdgeLines.length; i < len; i++){
            edgeLine = plcEdgeLines[i];
            distanceOffset = edgeLine.maxDistance - edgeLine.distance;
            force = edgeLine.closestPoint.clone().sub(edgeLine.position);
            force.multiplyScalar(distanceOffset * 2.5);
            force.z = 0;
            average.add( force.negate() );
          }
          this.position.copy(this.tmpPos);
          this.forceVector.copy(average.divideScalar(plcEdgeLines.length));
        }
      }else{
        this.forceVector.set(0, 0, 0);
      }
      //END: ROOM COLLISION

      //Check to see if we tp'd inside of a placeable
      if(this.forceVector.length()){
        this.tmpPos.copy(this.position).add(this.forceVector);
        for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
          obj = this.room.placeables[j];
          if(obj && obj.collisionData.walkmesh && obj.model && obj.model.visible){
            for(let i = 0, iLen = obj.collisionData.walkmesh.faces.length; i < iLen; i++){
              face = obj.collisionData.walkmesh.faces[i];
              if(face.triangle.containsPoint(this.tmpPos) && face.surfacemat.walk){
                //bail we should not be here
                this.forceVector.set(0, 0, 0);
                this.position.copy(_oPosition);
              }
            }
          }
        }
      
        //DETECT: ROOM TRANSITION
        for (const [index, edge] of this.room.collisionData.walkmesh.edges) {
          if(edge && edge.transition >= 0){
            if(
              Utility.LineLineIntersection(
                this.position.x,
                this.position.y,
                this.position.x + this.forceVector.x,
                this.position.y + this.forceVector.y,
                edge.line.start.x,
                edge.line.start.y,
                edge.line.end.x,
                edge.line.end.y
              )
            ){
              this.attachToRoom(GameState.module.area.rooms[edge.transition]);
              break;
            }
          }
        }

        //update creature position
        this.position.add(this.forceVector);
        //DETECT: GROUND FACE
        this.lastRoom = this.room;
        this.collisionData.lastGroundFace = this.collisionData.groundFace;
        //this.groundFace = undefined;
        if(this.room){
          let face = this.room.findWalkableFace(this);
          if(!face){
            this.findWalkableFace();
          }
        }

        if(!this.collisionData.groundFace){
          this.forceVector.set(0, 0, 0);
          this.position.copy(_oPosition);
          this.collisionData.groundFace = this.collisionData.lastGroundFace;
          this.attachToRoom(this.lastRoom);
          this.forceVector.set(0, 0, 0);
        }
      }
    }

    //END Gravity
    GameState.raycaster.far = Infinity;
    this.track.updateMatrixWorld();

    this.box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    this.box.translate(this.position);
    this.box.translate(this.forceVector);

  }

  getCurrentRoom(){
    if(this instanceof ModuleObject){
      this.room = undefined;
      let aabbFaces = [];
      let intersects;// = GameState.raycaster.intersectOctreeObjects( meshesSearch );
      const box = this.box.clone();

      this.rooms = [];
      for(let i = 0; i < GameState.module.area.rooms.length; i++){
        let room = GameState.module.area.rooms[i];
        let model = room.model;
        if(model instanceof OdysseyModel3D){
          if(model.box.containsPoint(this.position)){
            this.roomIds.push(i);
          }
        }
      }

      if(box){
        for(let j = 0, jl = this.rooms.length; j < jl; j++){
          let room = GameState.module.area.rooms[this.roomIds[j]];
          if(room && room.collisionData.walkmesh && room.collisionData.walkmesh.aabbNodes.length){
            aabbFaces.push({
              object: room, 
              faces: room.collisionData.walkmesh.getAABBCollisionFaces(box)
            });
          }
        }
      }
      
      let scratchVec3 = new THREE.Vector3(0, 0, 2);
      let playerFeetRay = this.position.clone().add(scratchVec3);
      GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
      GameState.raycaster.ray.direction.set(0, 0,-1);
      
      for(let j = 0, jl = aabbFaces.length; j < jl; j++){
        let castableFaces = aabbFaces[j];
        intersects = castableFaces.object.collisionData.walkmesh.raycast(GameState.raycaster, castableFaces.faces) || [];
        
        if(intersects.length){
          if(intersects[0].object.userData.moduleObject){
            this.attachToRoom(intersects[0].object.userData.moduleObject);
            return;
          }
        }
      }
      if(this.roomIds.length){
        this.attachToRoom(GameState.module.area.rooms[this.roomIds[0]]);
        return;
      }
      this.findWalkableFace();
    }
  }

  findWalkableFace(){
    let face;
    let room;
    for(let i = 0, il = GameState.module.area.rooms.length; i < il; i++){
      room = GameState.module.area.rooms[i];
      if(room.collisionData.walkmesh){
        for(let j = 0, jl = room.collisionData.walkmesh.walkableFaces.length; j < jl; j++){
          face = room.collisionData.walkmesh.walkableFaces[j];
          if(face.triangle.containsPoint(this.position)){
            this.collisionData.groundFace = face;
            this.collisionData.lastGroundFace = this.collisionData.groundFace;
            this.collisionData.surfaceId = this.collisionData.groundFace.walkIndex;
            this.attachToRoom(room);
            face.triangle.closestPointToPoint(this.position, this.collisionData.wm_c_point);
            this.position.z = this.collisionData.wm_c_point.z + .005;
          }
        }
      }
    }
    return face;
  }

  load(){
    this.initProperties();
    GameState.scene.add(this.sphere_geom);
  }

  loadCamera( onLoad?: Function ){
    if(this.cameraName){
      const resref = this.cameraName.replace(/\0[\s\S]*$/g,'').toLowerCase();
      MDLLoader.loader.load(resref).then(
        (mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            onComplete: (camera: OdysseyModel3D) => {
              try{
                this.camera = camera;
                camera.name = this.cameraName;
                this.container.add(camera);

                if(typeof onLoad === 'function')
                  onLoad();
              }catch(e){
                console.error(e);
                if(typeof onLoad === 'function')
                  onLoad();
              }
            },
            context: this.context,
            castShadow: true,
            receiveShadow: true
          });
        }
      );
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  loadModel (onLoad?: Function){
    let loop = new AsyncLoop({
      array: this.modelProps,
      onLoop: (item: IModelListItem, asyncLoop: AsyncLoop) => {
        const resref = item.model.replace(/\0[\s\S]*$/g,'').toLowerCase();
        MDLLoader.loader.load(resref).then((mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            onComplete: (model: OdysseyModel3D) => {
              try{
                if(item.rotating){
                  this.container.add(model);
                }else{
                  this.no_rotate.add(model);
                }
                this.models.push(model);
                model.name = item.model;

                if(this.camera && model.name == this.camera.name)
                  model.visible = false;

                asyncLoop.next();
              }catch(e){
                console.error(e);
                asyncLoop.next();
              }
            },
            context: this.context,
            castShadow: true,
            receiveShadow: true
          });
        })
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  loadGunBanks(onLoad?: Function){
    let loop = new AsyncLoop({
      array: this.gunBanks,
      onLoop: (gunbank: ModuleMGGunBank, asyncLoop: AsyncLoop) => {
        gunbank.load().then( () => {
          this.gun_hook = this.container.getObjectByName('gunbank'+gunbank.bankID);
          if(this.gun_hook instanceof THREE.Object3D){
            this.gun_hook.add(gunbank.model);
          }
          asyncLoop.next();
        });
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  onAnimEvent(){
    if(this.scripts.onAnimEvent instanceof NWScriptInstance){
      this.scripts.onAnimEvent.run(this, 0);
    }
  }

  onCreate(){
    if(this.scripts.onCreate instanceof NWScriptInstance){
      this.scripts.onCreate.run(this, 0);
    }
  }

  onDamaged(): boolean{
    if(this.scripts.onDamage instanceof NWScriptInstance){
      this.scripts.onDamage.run(this, 0);
    }
    return true;
  }

  onFire(){
    if(this.scripts.onFire instanceof NWScriptInstance){
      this.scripts.onFire.run(this, 0);
    }
  }

  onAccelerate(){
    if(this.scripts.onAccelerate instanceof NWScriptInstance){
      this.scripts.onAccelerate.run(this, 0);
    }
  }

  onHitBullet( bullet: ModuleMGGunBullet ){
    if(this.scripts.onHitBullet instanceof NWScriptInstance){
      const instance = this.scripts.onHitBullet;
      instance.mgBullet = bullet;
      instance.run(this, 0);
    }
  }

  onHitFollower( follower: ModuleMGEnemy ){
    if(this.scripts.onHitFollower instanceof NWScriptInstance){
      const instance = this.scripts.onHitFollower;
      instance.mgFollower = follower;
      instance.run(this, 0);
    }
  }

  onHitObstacle( obstacle: ModuleMGObstacle ){
    if(this.scripts.onHitObstacle instanceof NWScriptInstance){
      const instance = this.scripts.onHitObstacle;
      instance.mgObstacle = obstacle;
      instance.run(this, 0);
    }
  }

  onTrackLoop(){
    if(this.scripts.onTrackLoop instanceof NWScriptInstance){
      this.scripts.onTrackLoop.run(this, 0);
    }
  }

  loadScripts (){
    this.scripts = {
      onAccelerate: undefined,
      onAnimEvent: undefined,
      onBrake: undefined,
      onCreate: undefined,
      onDamage: undefined,
      onDeath: undefined,
      onFire: undefined,
      onHeartbeat: undefined,
      onHitBullet: undefined,
      onHitFollower: undefined,
      onHitObstacle: undefined,
      onHitWorld: undefined,
      onTrackLoop: undefined
    };

    let scriptsNode = this.template.getFieldByLabel('Scripts').getChildStructs()[0];
    if(scriptsNode){

      if(scriptsNode.hasField('OnAccelerate'))
        this.scripts.onAccelerate = scriptsNode.getFieldByLabel('OnAccelerate').getValue();
      
      if(scriptsNode.hasField('OnAnimEvent'))
        this.scripts.onAnimEvent = scriptsNode.getFieldByLabel('OnAnimEvent').getValue();

      if(scriptsNode.hasField('OnBrake'))
        this.scripts.onBrake = scriptsNode.getFieldByLabel('OnBrake').getValue();

      if(scriptsNode.hasField('OnCreate'))
        this.scripts.onCreate = scriptsNode.getFieldByLabel('OnCreate').getValue();

      if(scriptsNode.hasField('OnDamage'))
        this.scripts.onDamage = scriptsNode.getFieldByLabel('OnDamage').getValue();

      if(scriptsNode.hasField('OnDeath'))
        this.scripts.onDeath = scriptsNode.getFieldByLabel('OnDeath').getValue();

      if(scriptsNode.hasField('OnFire'))
        this.scripts.onFire = scriptsNode.getFieldByLabel('OnFire').getValue();

      if(scriptsNode.hasField('OnHeartbeat'))
        this.scripts.onHeartbeat = scriptsNode.getFieldByLabel('OnHeartbeat').getValue();
      
      if(scriptsNode.hasField('OnHitBullet'))
        this.scripts.onHitBullet = scriptsNode.getFieldByLabel('OnHitBullet').getValue();

      if(scriptsNode.hasField('OnHitFollower'))
        this.scripts.onHitFollower = scriptsNode.getFieldByLabel('OnHitFollower').getValue();

      if(scriptsNode.hasField('OnHitObstacle'))
        this.scripts.onHitObstacle = scriptsNode.getFieldByLabel('OnHitObstacle').getValue();

      if(scriptsNode.hasField('OnHitWorld'))
        this.scripts.onHitWorld = scriptsNode.getFieldByLabel('OnHitWorld').getValue();

      if(scriptsNode.hasField('OnTrackLoop'))
        this.scripts.onTrackLoop = scriptsNode.getFieldByLabel('OnTrackLoop').getValue();

    }

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = GameState.NWScript.Load(_script);
        this.scripts[key].caller = this;
      }
    }

  }

  initProperties(){
    if(this.template.RootNode.hasField('Accel_Secs'))
      this.accel_secs = this.template.getFieldByLabel('Accel_Secs').getValue();

    if(this.template.RootNode.hasField('Bump_Damage'))
      this.bump_damage = this.template.getFieldByLabel('Bump_Damage').getValue();

    if(this.template.RootNode.hasField('Camera'))
      this.cameraName = this.template.getFieldByLabel('Camera').getValue();

    if(this.template.RootNode.hasField('CameraRotate'))
      this.cameraRotate = this.template.getFieldByLabel('CameraRotate').getValue();

    if(this.template.RootNode.hasField('Hit_Points'))
      this.hit_points = this.template.getFieldByLabel('Hit_Points').getValue();

    if(this.template.RootNode.hasField('Invince_Period'))
      this.invince_period = this.template.getFieldByLabel('Invince_Period').getValue();

    if(this.template.RootNode.hasField('Max_HPs'))
      this.max_hps = this.template.getFieldByLabel('Max_HPs').getValue();

    if(this.template.RootNode.hasField('Maximum_Speed'))
      this.speed_max = this.template.getFieldByLabel('Maximum_Speed').getValue();

    if(this.template.RootNode.hasField('Minimum_Speed'))
      this.speed_min = this.template.getFieldByLabel('Minimum_Speed').getValue();

    if(this.template.RootNode.hasField('Num_Loops'))
      this.num_loops = this.template.getFieldByLabel('Num_Loops').getValue();

    if(this.template.RootNode.hasField('Sphere_Radius'))
      this.sphere_radius = this.template.getFieldByLabel('Sphere_Radius').getValue();

    if(this.template.RootNode.hasField('Track'))
      this.trackName = this.template.getFieldByLabel('Track').getValue();

    if(this.template.RootNode.hasField('TunnelXNeg'))
      this.tunnel.neg.x = THREE.MathUtils.degToRad(this.template.getFieldByLabel('TunnelXNeg').getValue());

    if(this.template.RootNode.hasField('TunnelXPos'))
      this.tunnel.pos.x = THREE.MathUtils.degToRad(this.template.getFieldByLabel('TunnelXPos').getValue());
    
    if(this.template.RootNode.hasField('TunnelYNeg'))
      this.tunnel.neg.y = THREE.MathUtils.degToRad(this.template.getFieldByLabel('TunnelYNeg').getValue());

    if(this.template.RootNode.hasField('TunnelYPos'))
      this.tunnel.pos.y = THREE.MathUtils.degToRad(this.template.getFieldByLabel('TunnelYPos').getValue());

    if(this.template.RootNode.hasField('TunnelZNeg'))
      this.tunnel.neg.z = THREE.MathUtils.degToRad(this.template.getFieldByLabel('TunnelZNeg').getValue());

    if(this.template.RootNode.hasField('TunnelZPos'))
      this.tunnel.pos.z = THREE.MathUtils.degToRad(this.template.getFieldByLabel('TunnelZPos').getValue());

    if(this.template.RootNode.hasField('Models')){
      let models = this.template.getFieldByLabel('Models').getChildStructs();
      for(let i = 0; i < models.length; i++){
        let modelStruct = models[i];
        this.modelProps.push({
          model: modelStruct.getFieldByLabel('Model').getValue(),
          rotating: !!modelStruct.getFieldByLabel('RotatingModel').getValue()
        });
      }
    }

    if(this.template.RootNode.hasField('Gun_Banks')){
      const gun_banks = this.template.getFieldByLabel('Gun_Banks').getChildStructs();
      for(let i = 0; i < gun_banks.length; i++){
        this.gunBanks.push(
          new ModuleMGGunBank(
            GFFObject.FromStruct(gun_banks[i]),
            this,
            true
          )
        );
      }

      this.initialized = true;
    }


    /*if(this.template.RootNode.hasField('CameraRotate'))
      this.cameraRotate = this.template.getFieldByLabel('CameraRotate').getValue();

    if(this.template.RootNode.hasField('Hit_Points'))
      this.hit_points = this.template.getFieldByLabel('Hit_Points').getValue();

    if(this.template.RootNode.hasField('Invince_Period'))
      this.invince_period = this.template.getFieldByLabel('Invince_Period').getValue();

    if(this.template.RootNode.hasField('Max_HPs'))
      this.max_hps = this.template.getFieldByLabel('Max_HPs').getValue();

    if(this.template.RootNode.hasField('Maximum_Speed'))
      this.maximum_speed = this.template.getFieldByLabel('Maximum_Speed').getValue();*/



  }


}
