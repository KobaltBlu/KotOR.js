import { ModuleObject } from "@/module/ModuleObject";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleEncounter } from "@/module/ModuleEncounter";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import type { ModuleSound } from "@/module/ModuleSound";
import type { ModuleTrigger } from "@/module/ModuleTrigger";
import * as THREE from "three";
import { GameState } from "@/GameState";
import { OdysseyFace3, OdysseyModel3D, OdysseyObject3D } from "@/three/odyssey";
import { Utility } from "@/utility/Utility";
import { OdysseyWalkMesh } from "@/odyssey";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { MDLLoader, ResourceLoader } from "@/loaders";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { VISObject } from "@/resource/VISObject";
import { IVISRoom } from "@/interface";
import type { GrassBin } from "@/managers/GrassManager";
import { CollisionContext } from "@/engine/CollisionContext";

type CollisionPlaceableBVHEntry = {
  placeable: ModulePlaceable;
  box: THREE.Box3;
  center: THREE.Vector3;
};

type CollisionPlaceableBVHNode = {
  box: THREE.Box3;
  left?: CollisionPlaceableBVHNode;
  right?: CollisionPlaceableBVHNode;
  entries?: CollisionPlaceableBVHEntry[];
};

class CollisionPlaceableBVH {
  private static readonly LEAF_SIZE = 8;
  private root?: CollisionPlaceableBVHNode;
  private _size = new THREE.Vector3();

  build(entries: CollisionPlaceableBVHEntry[]): void {
    this.root = entries.length ? this.buildNode(entries.slice()) : undefined;
  }

  query(box: THREE.Box3, out: ModulePlaceable[]): ModulePlaceable[] {
    this.queryNode(this.root, box, out);
    return out;
  }

  private buildNode(entries: CollisionPlaceableBVHEntry[]): CollisionPlaceableBVHNode {
    const nodeBox = new THREE.Box3().makeEmpty();
    for(let i = 0, len = entries.length; i < len; i++){
      nodeBox.union(entries[i].box);
    }

    if(entries.length <= CollisionPlaceableBVH.LEAF_SIZE){
      return { box: nodeBox, entries };
    }

    nodeBox.getSize(this._size);
    const axis = this._size.x >= this._size.y && this._size.x >= this._size.z
      ? 'x'
      : (this._size.y >= this._size.z ? 'y' : 'z');

    entries.sort((a, b) => a.center[axis] - b.center[axis]);
    const mid = Math.max(1, Math.floor(entries.length / 2));

    return {
      box: nodeBox,
      left: this.buildNode(entries.slice(0, mid)),
      right: this.buildNode(entries.slice(mid)),
    };
  }

  private queryNode(node: CollisionPlaceableBVHNode | undefined, box: THREE.Box3, out: ModulePlaceable[]): void {
    if(!node || !node.box.intersectsBox(box)) return;
    if(node.entries){
      for(let i = 0, len = node.entries.length; i < len; i++){
        const entry = node.entries[i];
        if(entry.box.intersectsBox(box)){
          out.push(entry.placeable);
        }
      }
      return;
    }

    this.queryNode(node.left, box, out);
    this.queryNode(node.right, box, out);
  }
}
/**
* ModuleRoom class.
*
* Class representing rooms found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file ModuleRoom.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleRoom {
  ambientScale: number = 0;
  envAudio: number = 0;
  /** ARE Rooms.DisableWeather — suppress weather FX in this room. */
  disableWeather: boolean = false;
  roomName: string;
  visObject: VISObject;
  box: THREE.Box3;
  area: ModuleArea;
  position: THREE.Vector3;
  model: OdysseyModel3D;
  objectType: number = ModuleObjectType.ModuleRoom;
  container: OdysseyObject3D;
  context: any;
  collisionContext: CollisionContext;

  doors: ModuleDoor[] = [];
  placeables: ModulePlaceable[] = [];
  collisionPlaceables: ModulePlaceable[] = [];
  private collisionPlaceablesDirty = true;
  private collisionPlaceablesScratch: ModulePlaceable[] = [];
  private collisionPlaceablesDynamic: ModulePlaceable[] = [];
  private collisionPlaceableBVHEntries: CollisionPlaceableBVHEntry[] = [];
  private collisionPlaceableBVH = new CollisionPlaceableBVH();
  creatures: ModuleCreature[] = [];
  triggers: ModuleTrigger[] = [];
  encounters: ModuleEncounter[] = [];
  sounds: ModuleSound[] = [];
  /** Parent group of grass bin meshes (owned by GrassManager). */
  grass?: THREE.Group;
  grassBins?: GrassBin[];

  linkedRoomData: IVISRoom[] = [];
  linkedRoomNames: string[] = [];
  linkedRooms: Map<string, ModuleRoom> = new Map<string, ModuleRoom>();
  linkedRoomsArray: ModuleRoom[] = [];

  constructor( roomName: string, area: ModuleArea ){
    this.roomName = roomName?.toLocaleLowerCase();
    this.area = area;
    this.context = GameState;

    this.container = new OdysseyObject3D();
    this.container.userData.moduleObject = this;
    this.position = this.container.position;
    this.box = new THREE.Box3();
    this.model = null;
    // Walkmesh ownership only — creature collision paths are unused on rooms.
    this.collisionContext = new CollisionContext(this as unknown as ModuleObject);
  }

  /** @deprecated Use collisionContext — alias during rename window. */
  get collisionManager(): CollisionContext {
    return this.collisionContext;
  }
  set collisionManager(value: CollisionContext){
    this.collisionContext = value;
  }

  setAmbientScale(scale: number){
    this.ambientScale = scale;
  }

  setEnvAudio(audio: number){
    this.envAudio = audio;
  }

  setDisableWeather(disabled: boolean){
    this.disableWeather = !!disabled;
  }

  isVisible(){
    return !!this.model?.visible;
  }

  #boxSize: THREE.Vector3 = new THREE.Vector3();
  detectChildObjects(){
    this.box.getSize(this.#boxSize);
    const box = this.box.clone().expandByVector(this.#boxSize);
    this.doors = [];
    this.placeables = [];
    this.sounds = [];
    this.markCollisionPlaceablesDirty();

    for(let i = 0, len = this.area.doors.length; i < len; i++){
      const object = this.area.doors[i] as ModuleDoor;
      if(object && (box.containsBox(object.box) || box.containsPoint(object.position) || box.intersectsSphere(object.sphere))){
        this.attachChildObject(object);
      }
    }

    for(let i = 0, len = this.area.placeables.length; i < len; i++){
      const object = this.area.placeables[i] as ModulePlaceable;
      if(object && (box.containsBox(object.box) || box.containsPoint(object.position) || box.intersectsSphere(object.sphere))){
        this.attachChildObject(object);
      }
    }

    for(let i = 0, len = this.area.sounds.length; i < len; i++){
      const object = this.area.sounds[i] as ModuleSound;
      if(!object.positional){ continue; }

      if(object && (box.containsBox(object.box) || box.containsPoint(object.position) || box.intersectsSphere(object.sphere))){
        this.attachChildObject(object);
      }
    }
  }

  attachChildObject(object: ModuleObject){
    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      if(this.creatures.indexOf(object as ModuleCreature) >= 0) return;
      this.creatures.push(object as ModuleCreature);
    }else if (BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
      if(this.placeables.indexOf(object as ModulePlaceable) >= 0) return;
      this.placeables.push(object as ModulePlaceable);
      this.markCollisionPlaceablesDirty();
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
      if(this.doors.indexOf(object as ModuleDoor) >= 0) return;
      this.doors.push(object as ModuleDoor);
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
      if(this.triggers.indexOf(object as ModuleTrigger) >= 0) return;
      this.triggers.push(object as ModuleTrigger);
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleEncounter)){
      if(this.encounters.indexOf(object as ModuleEncounter) >= 0) return;
      this.encounters.push(object as ModuleEncounter);
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleSound)){
      if(this.sounds.indexOf(object as ModuleSound) >= 0) return;
      this.sounds.push(object as ModuleSound);
    }
  }

  removeChildObject(object: ModuleObject){
    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      const idx = this.creatures.indexOf(object as ModuleCreature);
      if(idx >= 0){
        this.creatures.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
      const idx = this.placeables.indexOf(object as ModulePlaceable);
      if(idx >= 0){
        this.placeables.splice(idx, 1);
        this.markCollisionPlaceablesDirty();
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
      const idx = this.doors.indexOf(object as ModuleDoor);
      if(idx >= 0){
        this.doors.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
      const idx = this.triggers.indexOf(object as ModuleTrigger);
      if(idx >= 0){
        this.triggers.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleEncounter)){
      const idx = this.encounters.indexOf(object as ModuleEncounter);
      if(idx >= 0){
        this.encounters.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleSound)){
      const idx = this.sounds.indexOf(object as ModuleSound);
      if(idx >= 0){
        this.sounds.splice(idx, 1);
      }
    }
  }

  setLinkedRooms(array: IVISRoom[] = []){
    this.linkedRoomData = array;
    this.linkedRoomNames = array.map(room => room.name);
  }

  setPosition(x = 0, y = 0, z = 0){
    this.position.set(x, y, z);
  }

  markCollisionPlaceablesDirty(_reason?: string){
    this.collisionPlaceablesDirty = true;
  }

  private rebuildCollisionPlaceables(){
    this.collisionPlaceables.length = 0;
    this.collisionPlaceablesDynamic.length = 0;
    this.collisionPlaceableBVHEntries.length = 0;

    for(let i = 0, len = this.placeables.length; i < len; i++){
      const placeable = this.placeables[i];
      if(!placeable?.model?.visible) continue;
      const edges = placeable?.collisionManager?.walkmesh?.edges;
      const edgeCount = Array.isArray(edges) ? edges.length : (edges?.size ?? 0);
      if(edgeCount === 0) continue;

      if(placeable.collisionBoundsDirty || placeable.collisionMatrixDirty || !placeable.isStatic?.()){
        placeable.computeBoundingBox?.();
      }

      this.collisionPlaceables.push(placeable);
      if(placeable.isStatic?.()){
        this.collisionPlaceableBVHEntries.push({
          placeable,
          box: placeable.box.clone(),
          center: placeable.box.getCenter(new THREE.Vector3()),
        });
      }else{
        this.collisionPlaceablesDynamic.push(placeable);
      }
    }
    this.collisionPlaceableBVH.build(this.collisionPlaceableBVHEntries);
    this.collisionPlaceablesDirty = false;
  }

  getCollisionPlaceablesForBox(box: THREE.Box3, out: ModulePlaceable[] = this.collisionPlaceablesScratch): ModulePlaceable[] {
    out.length = 0;
    if(this.collisionPlaceablesDirty){
      this.rebuildCollisionPlaceables();
    }

    this.collisionPlaceableBVH.query(box, out);
    for(let i = 0, len = this.collisionPlaceablesDynamic.length; i < len; i++){
      const placeable = this.collisionPlaceablesDynamic[i];
      if(!placeable?.box || !placeable?.model?.visible) continue;
      if(placeable.collisionBoundsDirty || placeable.collisionMatrixDirty || !placeable.isStatic?.()){
        placeable.computeBoundingBox?.();
      }
      if(placeable.box.intersectsBox(box)){
        out.push(placeable);
      }
    }
    return out;
  }

  getVisisbleNeighbors(){  }

  update(delta: number = 0){
    if(this.model instanceof OdysseyModel3D){
      this.model.animateFrame = true;
      this.model.update(delta);
    }
  }

  show(showLinkedRooms = false){
    if(this.model){
      this.model.visible = true;
      this.model.userData.visActive = true;
    }

    GameState.grassManager?.setRoomVisible(this, true);

    if(showLinkedRooms){
      const linkedRooms = this.linkedRoomsArray;
      for(let i = 0, rLen = linkedRooms.length; i < rLen; i++){
        const room = linkedRooms[i];
        GameState.grassManager?.setRoomVisible(room, true);
        if(typeof room.model === 'object'){
          room.model.visible = true;
          room.model.userData.visActive = true;
        }
      }
    }

    //Add the walkmesh back to the scene
    if(this.collisionManager.walkmesh && !this.collisionManager.walkmesh.mesh.parent){
      GameState.group.room_walkmeshes.add(this.collisionManager.walkmesh.mesh);
    }else if(this.collisionManager.walkmesh && this.collisionManager.walkmesh.mesh.parent){
      this.collisionManager.walkmesh.mesh.removeFromParent();
      GameState.group.room_walkmeshes.add(this.collisionManager.walkmesh.mesh);
    }

    for(let i = 0, sLen = this.sounds.length; i < sLen; i++){
      this.sounds[i].audioEmitter.setDisabled(false);
    }
  }

  hide(hideLinkedRooms = false){
    if(this.model){
      this.model.visible = false;
      this.model.userData.visActive = false;
    }

    GameState.grassManager?.setRoomVisible(this, false);

    if(hideLinkedRooms){
      const linkedRooms = this.linkedRoomsArray;
      for(let i = 0, rLen = linkedRooms.length; i < rLen; i++){
        if(typeof linkedRooms[i].model != 'object'){
          continue;
        }
        linkedRooms[i].model.visible = false;
        linkedRooms[i].model.userData.visActive = false;
      }
    }

    //Remove the walkmesh back to the scene
    if(this.collisionManager.walkmesh && this.collisionManager.walkmesh.mesh.parent){
      this.collisionManager.walkmesh.mesh.removeFromParent();
    }

    for(let i = 0, sLen = this.sounds.length; i < sLen; i++){
      this.sounds[i].audioEmitter.setDisabled(true);
    }
  }

  /**
   * Link the rooms
   * @param rooms - The rooms to link
   */
  linkRooms(){
    for(let i = 0, iLen = this.linkedRoomData.length; i < iLen; i++){
      const room = this.area.visObject.getRoomByName(this.linkedRoomData[i].name);
      if(!room){
        console.warn('ModuleRoom.linkRooms: Linked room not found', this.linkedRoomData[i].name);
        continue;
      }
      this.addLinkedRoom(room);
    }
  }

  addLinkedRoom(room: ModuleRoom){
    this.linkedRooms.set(room.roomName, room);
    if(this.linkedRoomsArray.indexOf(room) >= 0) return;
    this.linkedRoomsArray.push(room);
  }

  removeLinkedRoom(room: ModuleRoom){
    this.linkedRooms.delete(room.roomName);
    const index = this.linkedRoomsArray.indexOf(room);
    if(index >= 0){
      this.linkedRoomsArray.splice(index, 1);
    }
  }

  async loadModel(): Promise<OdysseyModel3D> {
    //Check if the room name is NULL
    if(Utility.is2daNULL(this.roomName)){
      return this.model;
    }

    //Load the model
    const roomFile = await MDLLoader.loader.load(this.roomName);
    const room: OdysseyModel3D = await OdysseyModel3D.FromMDL(roomFile, {
      context: this.context,
      castShadow: false,
      receiveShadow: true,
      //Merge Static Geometry
      mergeStatic: !this.area.miniGame ? true : false
    });

    //Remove the old model
    if(this.model instanceof OdysseyModel3D){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
    }

    this.model = room;
    this.model.userData.moduleObject = this;
    this.container.add(this.model);
    this.box.setFromObject(this.container);

    //Load the animations
    if(this.model.odysseyAnimations.length){
      for(let animI = 0; animI < this.model.odysseyAnimations.length; animI++){
        if(this.model.odysseyAnimations[animI].name.indexOf('animloop') >= 0){
          this.model.animLoops.push(
            this.model.odysseyAnimations[animI]
          );
        }
      }
    }

    //Load the walkmesh
    try{
      if(!(this.collisionManager.walkmesh instanceof OdysseyWalkMesh)){
        const wok = await this.loadWalkmesh(this.roomName);
        if(wok){
          this.collisionManager.setWalkmesh(wok);
          wok.mesh.position.z += 0.001;
        }
      }
      this.seedBoxFromWalkmesh();
    }catch(e){
      console.error(e);
    }

    //Disable matrix update for static objects
    //room.disableMatrixUpdate;

    try{
      await GameState.grassManager?.buildForRoom(this);
    }catch(e){
      console.error(e);
    }

    return this.model;
  }

  async loadWalkmesh(resRef = ''): Promise<OdysseyWalkMesh> {
    try {
      const buffer = await ResourceLoader.loadResource(ResourceTypes['wok'], resRef);
      const wok = new OdysseyWalkMesh(new BinaryReader(buffer));
      wok.name = resRef;
      wok.moduleObject = this;
      this.model.wok = wok;
      return wok;
    }catch(e){
      console.error(e);
    }
  }

  /**
   * When setFromObject leaves room.box empty (common while the mesh is hidden),
   * copy the walkmesh world AABB so frustum cull / containment have real bounds.
   */
  seedBoxFromWalkmesh(): void {
    const wokBox = this.collisionManager?.walkmesh?.box;
    if(!wokBox || wokBox.isEmpty()){ return; }
    if(!this.box || this.box.isEmpty()){
      this.box.copy(wokBox);
    }
  }

  computeBoundingBox(force: boolean = false){
    if(this.container){
      this.container.updateMatrixWorld(force);
      this.container.updateMatrix();
      if(force){
        this.container.traverse( n => {
          n.updateMatrixWorld(true);
          n.updateMatrix();
        });
      }
    }

    if(this.model){
      this.model.updateMatrixWorld(force);
      this.model.updateMatrix();
    }

    if(this.model instanceof THREE.Object3D){
      this.box.setFromObject(this.model);
    }

    if(this.box?.isEmpty?.()){
      this.seedBoxFromWalkmesh();
    }
    return this.box;
  }

  containsPoint2d(point: any){

    if(!this.model)
      return false;

    return point.x < this.model.box.min.x || point.x > this.model.box.max.x ||
      point.y < this.model.box.min.y || point.y > this.model.box.max.y ? false : true;
  }

  containsPoint3d(point: any){

    if(!this.model)
      return false;

    return point.x < this.model.box.min.x || point.x > this.model.box.max.x ||
      point.y < this.model.box.min.y || point.y > this.model.box.max.y ||
      point.z < this.model.box.min.z || point.z > this.model.box.max.z ? false : true;
  }

  /**
   * @deprecated Room-local attach shim — prefer findWalkableAttachmentAt + applyWalkableAttachment.
   * No new callers.
   */
  findWalkableFace( object?: ModuleObject ) : OdysseyFace3 | undefined {
    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleObject) && this.collisionManager.walkmesh){
      for(let j = 0, jl = this.collisionManager.walkmesh.walkableFaces.length; j < jl; j++){
        const face = this.collisionManager.walkmesh.walkableFaces[j];
        // 2D test matches pathfinding (isPointWalkable); 3D containsPoint fails when Z is off-plane after combat.
        if(face.pointInFace2d(object.position)){
          object.collisionManager.groundFace = face;
          object.collisionManager.lastGroundFace = object.collisionManager.groundFace;
          object.collisionManager.surfaceId = object.collisionManager.groundFace.walkIndex;
          object.attachToRoom(this);

          face.triangle.closestPointToPoint(object.position, object.collisionManager.wm_c_point);
          object.position.z = object.collisionManager.wm_c_point.z + .005;
          return face;
        }
      }
    }
    return undefined;
  }

  destroy(): void {
    try{
      this.container?.removeFromParent();
    }catch(e){}

    if(this.model instanceof OdysseyModel3D){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
      this.model = undefined;
    }

    if(this.collisionManager?.walkmesh){
      try{
        const wmIdx = GameState.walkmeshList.indexOf(this.collisionManager.walkmesh.mesh);
        if(wmIdx >= 0){
          GameState.walkmeshList.splice(wmIdx, 1);
        }
      }catch(e){
        console.error(e);
      }
      this.collisionManager.walkmesh.dispose();
      this.collisionManager.setWalkmesh(undefined);
    }

    try{
      GameState.grassManager?.destroyForRoom(this);
    }catch(e){
      console.error(e);
    }

    this.area = undefined;
  }

}
