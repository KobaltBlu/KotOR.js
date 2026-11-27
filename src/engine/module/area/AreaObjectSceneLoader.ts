import * as THREE from "three";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { PlaceableLightmapBaker } from "@engine/managers/PlaceableLightmapBaker";
import { invalidateStaticBlockerGrid } from "@engine/pathfinding/static-blocker-grid";
import type { Area } from "@engine/module/Area";
import { AreaRoom } from "@engine/module/area/AreaRoom";
import { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";
import { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import { MDLLoader } from "@engine/loaders/MDLLoader";
import { Utility } from "@core/utility/Utility";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";

/**
 * Per-type scene asset loaders for area rooms and GIT object lists.
 * Orchestration order lives in AreaSceneBootstrap.
 */
export class AreaObjectSceneLoader {
  /**
   * Load the area's rooms
   */
  static async loadRooms(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Rooms');
    area.walkEdges = [];
    area.walkFaces = [];

    const groups = context.getSceneGroups();
    const walkmeshList = context.getWalkmeshList();
    const collisionList = context.getCollisionList();

    // Start every room MDL/MDX read up front so the I/O overlaps; the build loop
    // below stays sequential and joins each in-flight load.
    void MDLLoader.loader.prefetch(
      area.rooms
        .map((room) => room.roomName)
        .filter((name) => !Utility.is2daNULL(name)),
    );

    for(let i = 0; i < area.rooms.length; i++){
      const room = area.rooms[i];
      const model = await room.loadModel();
      if(model instanceof OdysseyModel3D){
        if(room.collisionManager.walkmesh instanceof OdysseyWalkMesh){
          walkmeshList.push( room.collisionManager.walkmesh.mesh );
          groups.room_walkmeshes.add( room.collisionManager.walkmesh.mesh );
        }

        if(typeof model.walkmesh != 'undefined'){
          collisionList.push(model.walkmesh);
        }

        if(typeof model.wok != 'undefined'){
          area.walkEdges = [...area.walkEdges, ...model.wok.edges.values()];
          area.walkFaces = [...area.walkFaces, ...model.wok.walkableFaces];
        }

        model.name = room.roomName;
        groups.rooms.add(room.container);

        room.computeBoundingBox();
        room.model.updateMatrix();
        if(room.collisionManager.walkmesh?.mesh){
          room.collisionManager.walkmesh.mesh.matrixAutoUpdate = false;
          room.collisionManager.walkmesh.mesh.updateMatrix();
          room.collisionManager.walkmesh.mesh.updateMatrixWorld(true);
        }
      }
    }

    for(let j = 0; j < area.rooms.length; j++){
      area.rooms[j].linkRooms();
    }

    //Room Linking Pass 2
    for(let i = 0, iLen = area.rooms.length; i < iLen; i++ ){
      let room1 = area.rooms[i];
      //Look for all rooms that can see this room
      for(let j = 0, jLen = area.rooms.length; j < jLen; j++){
        let room2 = area.rooms[j];
        if(room2 instanceof AreaRoom){
          const room1_room_links = area.visObject.getRoom(room1.roomName)?.rooms || [];
          const room2_room_links = area.visObject.getRoom(room2.roomName)?.rooms || [];
          const room2_links_to_room1 = room2_room_links.indexOf(room1.roomName) >= 0;
          const room1_links_to_room2 = room1_room_links.indexOf(room2.roomName) >= 0;

          const should_link = room2_links_to_room1 || room1_links_to_room2;
          if(should_link && !room1.linkedRooms.has(room2.roomName)){
            room1.addLinkedRoom(room2);
          }

          if(should_link && !room2.linkedRooms.has(room1.roomName)){
            room2.addLinkedRoom(room1);
          }
        }
      }
      area.walkmesh_rooms = [room1].concat(Array.from(room1.linkedRooms.values()));
    }
  }

  /**
   * Load the area's doors
   */
  static async loadDoors(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Doors');
    const groups = context.getSceneGroups();
    for(let i = 0; i < area.doors.length; i++){
      const door = area.doors[i];
      try{
        door.load();
        door.rotation.set(0, 0, door.getBearing());
        door.facing = door.getBearing();
        const model = await door.loadModel();
        door.computeBoundingBox();
        const dwk = await door.loadWalkmesh(model.name);

        try{
          model.userData.walkmesh = dwk;
        }catch(e){
          console.error('Failed to add dwk', model.name, dwk, e);
        }

        if(door.model instanceof OdysseyModel3D){
          door.box.setFromObject(door.model);
        }

        if(door.openState){
          door.model.playAnimation('opened1', true);
        }
        door.getCurrentRoom();
        groups.doors.add( door.container );
      }catch(e){
        console.error(e);
      }
    }
    invalidateStaticBlockerGrid(area);
  }

  /**
   * Load the area's placeables
   */
  static async loadPlaceables(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Placeables');
    const groups = context.getSceneGroups();
    const walkmeshList = context.getWalkmeshList();
    for(let i = 0; i < area.placeables.length; i++){
      const plc = area.placeables[i];
      plc.load();
      plc.position.set(plc.getX(), plc.getY(), plc.getZ());
      plc.rotation.set(0, 0, plc.getBearing());
      const model = await plc.loadModel();
      groups.placeables.add( plc.container );
      const pwk = await plc.loadWalkmesh(model.name);
      walkmeshList.push( pwk.mesh );
      plc.computeBoundingBox();

      if(pwk.mesh instanceof THREE.Object3D){
        // Verts stay local; LocalToWorld is matrixWorld (pose + BWM header.position).
        plc.syncWalkmeshMatrix();
        groups.room_walkmeshes.add( pwk.mesh );
      }

      plc.getCurrentRoom();
      plc.position.set(plc.getX(), plc.getY(), plc.getZ());
      plc.markCollisionBoundsDirty('placement');
      plc.computeBoundingBox();
      plc.room?.markCollisionPlaceablesDirty?.();
    }
    // Any query during load built the blocker grid from unposed objects
    // (position 0,0 / empty boxes) — rebuild now that placeables are placed.
    invalidateStaticBlockerGrid(area);
    // Bake placeable lightmaps after all models are posed (rooms already registered lights).
    try{
      PlaceableLightmapBaker.bakeArea(area, context.getLightManager());
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Load the area's waypoints
   */
  static async loadWaypoints(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Waypoints');
    const groups = context.getSceneGroups();
    for(let i = 0; i < area.waypoints.length; i++){
      const waypnt = area.waypoints[i];
      waypnt.load();
      const wpObj = new THREE.Object3D();
      wpObj.name = waypnt.getTag();
      wpObj.position.copy(waypnt.position);
      wpObj.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()));
      waypnt.rotation.z = Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()) + Math.PI/2;
      groups.waypoints.add(wpObj);

      let _distance = 1000000000;
      let _currentRoom = null;
      let roomCenter = new THREE.Vector3();
      for(let i = 0; i < groups.rooms.children.length; i++){
        let room = groups.rooms.children[i];
        if(room instanceof OdysseyModel3D){
          if(room.box.containsPoint(wpObj.position)){
            room.box.getCenter(roomCenter);
            let distance = wpObj.position.distanceTo(roomCenter);
            if(distance < _distance){
              _distance = distance;
              _currentRoom = room;
            }
          }
        }
      }
      wpObj.userData.area = _currentRoom;
      area.areaMap.addMapNote(waypnt);
    }
  }

  /**
   * Load the area's encounters
   */
  static async loadEncounters(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Encounters');
    const groups = context.getSceneGroups();
    for(let i = 0; i < area.encounters.length; i++){
      const encounter = area.encounters[i];
      try{
        encounter.load();
        let _distance = 1000000000;
        let _currentRoom = null;
        let roomCenter = new THREE.Vector3();
        for(let i = 0; i < groups.rooms.children.length; i++){
          let room = groups.rooms.children[i];
          if(room instanceof OdysseyModel3D){
            if(room.box.containsPoint(encounter.mesh.position)){
              room.box.getCenter(roomCenter);
              let distance = encounter.mesh.position.distanceTo(roomCenter);
              if(distance < _distance){
                _distance = distance;
                _currentRoom = room;
              }
            }
          }
        }
        encounter.mesh.userData.area = _currentRoom;
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's Area of Effects
   */
  static async loadAreaEffects(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading AreaEffects');
    const groups = context.getSceneGroups();
    for(let i = 0; i < area.areaOfEffects.length; i++){
      try{
        const aoe = area.areaOfEffects[i];
        aoe.load();
        groups.effects.add( aoe.container );
      }catch(e){
        console.error(e);
      }
    }
    for(let i = 0; i < area.areaOfEffects.length; i++){
      const aoe = area.areaOfEffects[i];
      if(
        Number.isFinite(aoe.linkedToObjectId) &&
        aoe.linkedToObjectId !== GameObjectConstant.OBJECT_INVALID
      ){
        aoe.linkedToObject = context.getObjectById(aoe.linkedToObjectId);
      }
    }
  }

  /**
   * Load the area's triggers
   */
  static async loadTriggers(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Triggers');
    const groups = context.getSceneGroups();
    for(let i = 0; i < area.triggers.length; i++){
      try{
        const trig = area.triggers[i];
        trig.load();
        let _distance = 1000000000;
        let _currentRoom = null;
        let roomCenter = new THREE.Vector3();
        for(let i = 0; i < groups.rooms.children.length; i++){
          let room = groups.rooms.children[i];
          if(room instanceof OdysseyModel3D){
            if(room.box.containsPoint(trig.mesh.position)){
              room.box.getCenter(roomCenter);
              let distance = trig.mesh.position.distanceTo(roomCenter);
              if(distance < _distance){
                _distance = distance;
                _currentRoom = room;
              }
            }
          }
        }
        trig.mesh.userData.area = _currentRoom;
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's creatures
   */
  static async loadCreatures(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Creatures');
    const groups = context.getSceneGroups();
    for(let i = 0; i < area.creatures.length; i++){
      try{
        const creature = area.creatures[i];
        creature.load();
        const model = await creature.loadModel();
        creature.model.userData.gameObject = creature;

        creature.setFacing(-Math.atan2(creature.getXOrientation(), creature.getYOrientation()), true);

        model.hasCollision = true;
        model.name = creature.getTag();
        groups.creatures.add( creature.container );

        creature.getCurrentRoom();
        creature.settleWalkableAttachment();
        creature.update(0.0000000000000000000001);
        creature.computeBoundingBox();
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load ground items (GIT List) — scene placement after creatures.
   * Placement matches ActionDropItem (model under placeables group).
   */
  static async loadItems(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Items');
    const groups = context.getSceneGroups();
    for(let i = 0; i < area.items.length; i++){
      try{
        const item = area.items[i];
        item.placedInWorld = true;
        item.load();
        const model = await item.loadModel();
        if(!model){ continue; }
        model.userData.gameObject = item;
        model.name = item.getTag();
        model.position.copy(item.position);
        if(model.parent !== groups.placeables){
          groups.placeables.add(model);
        }
        item.getCurrentRoom();
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's stores
   */
  static async loadStores(area: Area): Promise<void> {
    console.log('Loading Stores');
    for(let i = 0; i < area.stores.length; i++){
      try{
        const store = area.stores[i];
        store.load();
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's sounds
   */
  static async loadsounds(area: Area): Promise<void> {
    console.log('Loading Sound Emitter');
    for(let i = 0; i < area.sounds.length; i++){
      try{
        const sound = area.sounds[i];
        sound.load();
        await sound.loadSound();
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's static cameras
   */
  static async loadCameras(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Loading Cameras');
    const staticCameras = context.getStaticCameras();
    for(let i = 0; i < area.cameras.length; i++){
      const camera = area.cameras[i];
      camera.load();
      staticCameras.push(camera.perspectiveCamera);
    }
  }
}
