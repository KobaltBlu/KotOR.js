import { ModuleObject } from "./ModuleObject";
import type { ModuleArea, ModuleCreature, ModuleDoor, ModuleEncounter, ModulePlaceable, ModuleSound, ModuleTrigger } from ".";
import * as THREE from "three";
import { GameState } from "../GameState";
import { OdysseyFace3, OdysseyModel3D } from "../three/odyssey";
import { Utility } from "../utility/Utility";
import { OdysseyModelNodeAABB, OdysseyWalkMesh } from "../odyssey";
import { BinaryReader } from "../utility/binary/BinaryReader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { MDLLoader, ResourceLoader, TextureLoader } from "../loaders";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { GFFStruct } from "../resource/GFFStruct";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
// import { ShaderManager } from "../managers";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { BitWise } from "../utility/BitWise";
import { VISObject } from "../resource/VISObject";
import { IVISRoom } from "../interface";
import { EngineMode } from "../enums/engine/EngineMode";

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
export class ModuleRoom extends ModuleObject {
  ambientScale: number = 0;
  envAudio: number = 0;
  roomName: string;
  visObject: VISObject;

  doors: ModuleDoor[] = [];
  placeables: ModulePlaceable[] = [];
  creatures: ModuleCreature[] = [];
  triggers: ModuleTrigger[] = [];
  encounters: ModuleEncounter[] = [];
  sounds: ModuleSound[] = [];
  grass: THREE.InstancedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

  linkedRoomData: IVISRoom[] = [];
  linkedRoomNames: string[] = [];
  linkedRooms: Map<string, ModuleRoom> = new Map<string, ModuleRoom>();

  constructor( roomName: string, area: ModuleArea ){
    super();
    this.objectType |= ModuleObjectType.ModuleRoom;

    this.id = -1;
    this.roomName = roomName?.toLocaleLowerCase();
    this.area = area;
  }

  setAmbientScale(scale: number){
    this.ambientScale = scale;
  }

  setEnvAudio(audio: number){
    this.envAudio = audio;
  }

  #boxSize: THREE.Vector3 = new THREE.Vector3();
  detectChildObjects(){
    this.box.getSize(this.#boxSize);
    const box = this.box.clone().expandByVector(this.#boxSize);
    this.doors = [];
    this.placeables = [];
    this.sounds = [];
    
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

  getVisisbleNeighbors(){  }

  update(delta: number = 0){
    if(this.model instanceof OdysseyModel3D){
      //BEGIN: Animation Optimization
      this.model.animateFrame = true;
      if(!BitWise.InstanceOf(this.objectType, ModuleObjectType.ModuleRoom)){
        if(!this.model.visible){
          this.model.animateFrame = false;
        }
      }
      //END: Animation Optimization

      this.model.update(delta);
    }

    if(this.grass){
      this.grass.material.uniforms.time.value += delta;
      
      // Update camera position for distance fade and player position for trample
      if(GameState.getCurrentPlayer()?.position){
        this.grass.material.uniforms.playerPosition.value.copy(GameState.getCurrentPlayer()?.position);
        this.grass.material.uniforms.useDistanceFade.value = (GameState.Mode == EngineMode.DIALOG) ? false : true;
      }
      
      // Update entity positions in texture for multi-entity trample
      this.updatePositionDataTexture();
      
      this.grass.material.uniformsNeedUpdate = true;
    }
  }

  show(showLinkedRooms = false){
    if(this.model){
      this.model.visible = true;
    }

    if(this.grass){
      this.grass.visible = true;
    }

    if(showLinkedRooms){
      const linkedRooms = Array.from(this.linkedRooms.values());
      for(let i = 0, rLen = linkedRooms.length; i < rLen; i++){
        const room = linkedRooms[i];
        if(room.grass){
          room.grass.visible = true;
        }
        if(typeof room.model === 'object'){
          room.model.visible = true;
        }
      }
    }

    //Add the walkmesh back to the scene
    if(this.collisionData.walkmesh && !this.collisionData.walkmesh.mesh.parent){
      GameState.group.room_walkmeshes.add(this.collisionData.walkmesh.mesh);
    }else if(this.collisionData.walkmesh && this.collisionData.walkmesh.mesh.parent){
      this.collisionData.walkmesh.mesh.parent.remove(this.collisionData.walkmesh.mesh);
      GameState.group.room_walkmeshes.add(this.collisionData.walkmesh.mesh);
    }

    for(let i = 0, sLen = this.sounds.length; i < sLen; i++){
      this.sounds[i].audioEmitter.setDisabled(false);
    }
  }

  hide(hideLinkedRooms = false){
    if(this.model){
      this.model.visible = false;
    }

    if(this.grass){
      this.grass.visible = false;
    }

    if(hideLinkedRooms){
      const linkedRooms = Array.from(this.linkedRooms.values());
      for(let i = 0, rLen = linkedRooms.length; i < rLen; i++){
        if(typeof linkedRooms[i].model != 'object'){
          continue;
        }
        linkedRooms[i].model.visible = false;
      }
    }
    
    //Remove the walkmesh back to the scene
    if(this.collisionData.walkmesh && this.collisionData.walkmesh.mesh.parent){
      this.collisionData.walkmesh.mesh.parent.remove(this.collisionData.walkmesh.mesh);
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
      this.linkedRooms.set(this.linkedRoomData[i].name, this.area.visObject.getRoomByName(this.linkedRoomData[i].name));
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
      //Merge Static Geometry *Experimental*
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
      if(!(this.collisionData.walkmesh instanceof OdysseyWalkMesh)){
        const wok = await this.loadWalkmesh(this.roomName);
        if(wok){
          this.collisionData.walkmesh = wok;
          this.collisionData.walkmesh.mesh.position.z += 0.001;
        }
      }
    }catch(e){
      console.error(e);
    }

    //Disable matrix update for static objects
    //room.disableMatrixUpdate();

    try{
      this.buildGrass();
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

  buildGrass(){
    if(!this.area.grass.textureName){
      // console.warn('ModuleRoom.buildGrass: No grass texture found for room', this.roomName);
      return;
    }

    const density = this.area.grass.density;
    const quadOffsetZ = this.area.grass.quadSize/2;
    if(!this.model){
      // console.warn('ModuleRoom.buildGrass: No model found for room', this.roomName);
      return;
    }

    const aabb = this.model.aabb;
    if(!(aabb instanceof OdysseyModelNodeAABB)){
      // console.warn('ModuleRoom.buildGrass: No grass faces found for room', this.roomName);
      return;
    }

    if(!aabb.grassFaces.length){
      // console.warn('ModuleRoom.buildGrass: No grass faces found for room', this.roomName);
      return;
    }

    // Pre-calculate grass blade geometry once
    const grassGeometry = this.createGrassBladeGeometry();
    
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = grassGeometry.index;
    geometry.attributes.position = grassGeometry.attributes.position;
    geometry.attributes.normal = grassGeometry.attributes.normal;
    geometry.attributes.constraint = grassGeometry.attributes.constraint;
    geometry.attributes.quadIdx = grassGeometry.attributes.quadIdx;
    geometry.attributes.uv = grassGeometry.attributes.uv;

    // Create position data texture for multi-entity trample
    const positionTexture = this.createPositionDataTexture(64); // 64 entities max

    const grass_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib["common"],
        {
          map: { value: null },
          lightMap: { value: null },
          positionMap: { value: positionTexture },
          positionMapSize: { value: new THREE.Vector2(8, 8) }, // 8x8 texture = 64 entities
          maxEntities: { value: 64 },
          time: { value: 0 },
          ambientColor: { value: new THREE.Color().setHex(parseInt('0x'+(this.area.sun.fogColor).toString(16))) },
          windPower: { value: this.area.windPower },
          playerPosition: { value: new THREE.Vector3 },
          alphaTest: { value: this.area.alphaTest },
          probability: { value: new THREE.Vector4(
            this.area.grass.probability.lowerLeft,
            this.area.grass.probability.lowerRight,
            this.area.grass.probability.upperLeft,
            this.area.grass.probability.upperRight
          ) },
          // Fade distance uniforms
          fadeStartDistance: { value: 25.0 },
          fadeEndDistance: { value: 100.0 },
          useDistanceFade: { value: true },
          // Trample effect uniforms
          trampleRadius: { value: 3.0 },    // Radius around player where grass gets trampled
          trampleStrength: { value: 1.0 }   // Strength of the trample effect
        }
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('grass').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('grass').getFragment(),
      visible: true,
      side: THREE.DoubleSide
    });

    // Pre-calculate face data and grass counts
    const faceData = this.precalculateFaceData(aabb, density);
    const totalGrassCount = faceData.totalGrassCount;
    
    if(totalGrassCount === 0){
      // console.warn('ModuleRoom.buildGrass: No grass instances to create for room', this.roomName);
      return;
    }

    this.grass = new THREE.InstancedMesh(geometry, grass_material, totalGrassCount);
    this.grass.frustumCulled = false;
    
    // Pre-allocate reusable objects
    const objForMatrix = new THREE.Object3D();
    const tmpVec3 = new THREE.Vector3();
    const FA = new THREE.Vector3();
    const FB = new THREE.Vector3();
    const FC = new THREE.Vector3();
    const uvA = new THREE.Vector2();
    const uvB = new THREE.Vector2();
    const uvC = new THREE.Vector2();


    const lm_texture = aabb.textureMap2;

    // Pre-allocate arrays
    const instanceIndices = new Float32Array(totalGrassCount);
    const lightmapUV = new Float32Array(totalGrassCount * 2);
    
    // Initialize instance indices
    for(let i = 0; i < totalGrassCount; i++){
      instanceIndices[i] = i;
    }

    // Pre-cache model data for UV calculation
    const pos = aabb.vertices;
    const uv2 = aabb.tvectors[1];

    let instanceIndex = 0;
    
    // Process each face
    for(let k = 0; k < aabb.grassFaces.length; k++){
      const face = aabb.grassFaces[k];
      const grassCount = faceData.faceGrassCounts[k];
      
      if(grassCount < 1) continue;

      // Set face vertices
      FA.set(pos[face.a * 3], pos[(face.a * 3) + 1], pos[(face.a * 3) + 2]);
      FB.set(pos[face.b * 3], pos[(face.b * 3) + 1], pos[(face.b * 3) + 2]);
      FC.set(pos[face.c * 3], pos[(face.c * 3) + 1], pos[(face.c * 3) + 2]);

      // Set UV coordinates
      const tvI1 = face.a * 2;
      const tvI2 = face.b * 2;
      const tvI3 = face.c * 2;
      
      uvA.set(uv2[tvI1], uv2[tvI1 + 1]);
      uvB.set(uv2[tvI2], uv2[tvI2 + 1]);
      uvC.set(uv2[tvI3], uv2[tvI3 + 1]);

      // Generate grass instances for this face
      for(let j = 0; j < grassCount; j++){
        // Generate random barycentric coordinates
        let a = Math.random();
        let b = Math.random();

        if (a + b > 1) {
          a = 1 - a;
          b = 1 - b;
        }

        const c = 1 - a - b;

        // Calculate position
        tmpVec3.x = (a * FA.x) + (b * FB.x) + (c * FC.x);
        tmpVec3.y = (a * FA.y) + (b * FB.y) + (c * FC.y);
        tmpVec3.z = (a * FA.z) + (b * FB.z) + (c * FC.z);

        // Set matrix
        objForMatrix.rotation.z = Math.floor(Math.random() * 360);
        objForMatrix.position.copy(tmpVec3);
        objForMatrix.position.z += quadOffsetZ * 0.90;
        objForMatrix.updateMatrix();

        // Calculate lightmap UV using current face's barycentric coordinates
        if(lm_texture){
          // Use the barycentric coordinates (a, b, c) we already calculated for positioning
          // to interpolate the UV coordinates from the current face
          const uv = new THREE.Vector2()
            .addScaledVector(uvA, a)
            .addScaledVector(uvB, b)
            .addScaledVector(uvC, c);
          
          lightmapUV[(instanceIndex * 2) + 0] = uv.x;
          lightmapUV[(instanceIndex * 2) + 1] = uv.y; 
        }

        this.grass.setMatrixAt(instanceIndex, objForMatrix.matrix);
        instanceIndex++;
      }
    }
    
    this.grass.instanceMatrix.needsUpdate = true;
    geometry.setAttribute('instanceID', new THREE.InstancedBufferAttribute(instanceIndices, 1));
    geometry.setAttribute('lightmapUV', new THREE.InstancedBufferAttribute(lightmapUV, 2));

    this.grass.position.copy(this.position).add(aabb.position);
    GameState.group.grass.add(this.grass);

    // Load textures asynchronously
    this.loadGrassTextures(grass_material, lm_texture);
  }

  /**
   * Create the grass blade geometry with all four orientations
   */
  private createGrassBladeGeometry(): THREE.BufferGeometry {
    let grassGeometry: THREE.BufferGeometry | undefined = undefined;
    
    for(let i = 0; i < 4; i++){
      const blade = new THREE.PlaneGeometry(this.area.grass.quadSize, this.area.grass.quadSize, 1, 1);
      blade.rotateX(Math.PI/2);
      blade.rotateZ(Math.PI/4 * i);

      if(!grassGeometry){
        grassGeometry = blade;
        continue;
      }
      
      grassGeometry = BufferGeometryUtils.mergeBufferGeometries([grassGeometry, blade]);
    }

    // Set constraint array for wind effect
    const constraint = new Float32Array([
      1, 1, 0, 0, 
      1, 1, 0, 0, 
      1, 1, 0, 0,
      1, 1, 0, 0
    ]);
    grassGeometry.setAttribute('constraint', new THREE.BufferAttribute(constraint, 1));

    // Set quad index for vertex shader
    const quadIdx = new Float32Array([
      0, 0, 0, 0,
      1, 1, 1, 1,
      2, 2, 2, 2,
      3, 3, 3, 3,
    ]);
    grassGeometry.setAttribute('quadIdx', new THREE.BufferAttribute(quadIdx, 1));
    
    return grassGeometry;
  }

  /**
   * Pre-calculate face data and grass counts
   */
  private precalculateFaceData(aabb: OdysseyModelNodeAABB, density: number): { totalGrassCount: number, faceGrassCounts: number[] } {
    const faceGrassCounts: number[] = [];
    let totalGrassCount = 0;
    
    const FA = new THREE.Vector3();
    const FB = new THREE.Vector3();
    const FC = new THREE.Vector3();
    
    for(let i = 0; i < aabb.grassFaces.length; i++){
      const face = aabb.grassFaces[i];

      FA.set(aabb.vertices[face.a * 3], aabb.vertices[(face.a * 3) + 1], aabb.vertices[(face.a * 3) + 2]);
      FB.set(aabb.vertices[face.b * 3], aabb.vertices[(face.b * 3) + 1], aabb.vertices[(face.b * 3) + 2]);
      FC.set(aabb.vertices[face.c * 3], aabb.vertices[(face.c * 3) + 1], aabb.vertices[(face.c * 3) + 2]);

      const triangle = new THREE.Triangle(FA, FB, FC);
      const tArea = triangle.getArea();
      let grassCount = Math.max(1, Math.floor((tArea * density) * 0.50));

      totalGrassCount += grassCount;
      faceGrassCounts.push(grassCount);
    }
    
    return { totalGrassCount, faceGrassCounts };
  }

  /**
   * Create a data texture to store entity positions for trample effects
   */
  private createPositionDataTexture(maxEntities: number = 64): THREE.DataTexture {
    // Create a texture to store entity positions
    // Format: RGBA where R=X, G=Y, B=Z, A=active flag
    const textureSize = Math.ceil(Math.sqrt(maxEntities));
    const data = new Float32Array(textureSize * textureSize * 4);
    
    // Initialize all positions to (0,0,0,0) - inactive
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;     // X
      data[i + 1] = 0; // Y  
      data[i + 2] = 0; // Z
      data[i + 3] = 0; // Active flag (0 = inactive, 1 = active)
    }
    
    const texture = new THREE.DataTexture(
      data,
      textureSize,
      textureSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Update entity positions in the position data texture
   */
  private updatePositionDataTexture(): void {
    if (!this.grass || !this.grass.material.uniforms.positionMap.value) return;
    
    const texture = this.grass.material.uniforms.positionMap.value;
    const data = texture.image.data;
    const textureSize = texture.image.width;
    let entityIndex = 0;
    
    // Clear all positions
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = 0; // Set all to inactive
    }
    
    // Add creature positions
    for (const creature of this.creatures) {
      if (entityIndex >= textureSize * textureSize) break;
      
      const pixelIndex = entityIndex * 4;
      data[pixelIndex] = creature.position.x;
      data[pixelIndex + 1] = creature.position.y;
      data[pixelIndex + 2] = creature.position.z;
      data[pixelIndex + 3] = 1.0; // Active
      entityIndex++;
    }
    
    texture.needsUpdate = true;
  }

  /**
   * Load grass textures asynchronously
   */
  private loadGrassTextures(grass_material: THREE.ShaderMaterial, lm_texture: any): void {
    if(!this.area.grass.textureName){
      // console.warn('ModuleRoom.buildGrass: No grass texture found for room ' + this.roomName);
      return;
    }
    
    TextureLoader.Load(this.area.grass.textureName).then((diffuseMap: OdysseyTexture) => {
      if(!diffuseMap) return;
      
      diffuseMap.minFilter = THREE.LinearFilter;
      diffuseMap.magFilter = THREE.LinearFilter;
      grass_material.uniforms.map.value = diffuseMap;
      grass_material.uniformsNeedUpdate = true;
      grass_material.defines.USE_MAP = '';
      grass_material.defines.USE_UV = '';
      grass_material.needsUpdate = true;
      
      if(!lm_texture){
        // console.warn('ModuleRoom.buildGrass: No grass lightmap found for room ' + this.roomName);
        return;
      }
      
      // Load lightmap texture
      TextureLoader.Load(lm_texture).then((lightMap: OdysseyTexture) => {
        if(!lightMap) return;
        
        lightMap.minFilter = THREE.LinearFilter;
        lightMap.magFilter = THREE.LinearFilter;
        grass_material.uniforms.lightMap.value = lightMap;
        grass_material.uniformsNeedUpdate = true;
        grass_material.defines.USE_LIGHTMAP = '';
        grass_material.needsUpdate = true;
      });
    });
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

  findWalkableFace( object?: ModuleObject ) : OdysseyFace3 {
    let face;
    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleObject) && this.collisionData.walkmesh){
      for(let j = 0, jl = this.collisionData.walkmesh.walkableFaces.length; j < jl; j++){
        face = this.collisionData.walkmesh.walkableFaces[j];
        if(face.triangle.containsPoint(object.position)){
          object.collisionData.groundFace = face;
          object.collisionData.lastGroundFace = object.collisionData.groundFace;
          object.collisionData.surfaceId = object.collisionData.groundFace.walkIndex;
          object.room = this;

          face.triangle.closestPointToPoint(object.position, object.collisionData.wm_c_point);
          object.position.z = object.collisionData.wm_c_point.z + .005;
          return face;
        }
      }
    }
    return face;
  }

  destroy(): void {
    super.destroy();
      
    if(this.collisionData.walkmesh)
      this.collisionData.walkmesh.dispose();

    try{
      let wmIdx = GameState.walkmeshList.indexOf(this.collisionData.walkmesh.mesh);
      GameState.walkmeshList.splice(wmIdx, 1);
    }catch(e){
      console.error(e);
    }

    try{
      if(this.grass){
        this.grass.geometry.dispose();
        this.grass.material.dispose();
        this.grass.removeFromParent();
      }
    }catch(e){
      console.error(e);
    }
  }

}
