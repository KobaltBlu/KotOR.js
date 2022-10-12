/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleRoom class.
 */

export class ModuleRoom extends ModuleObject {

  constructor( args = {} ){
    super();
    args = Object.assign({
      ambientScale: 0,
      envAudio: 0,
      roomName: '',
      model: undefined,
      walkmesh: undefined,
      linked_rooms: []
    }, args);

    this.id = -1;

    this.ambientScale = args.ambientScale;
    this.envAudio = args.envAudio;
    this.roomName = args.roomName;

    this.room = args.room;
    this.model = args.model;
    this.walkmesh = args.walkmesh;
    this.linked_rooms = args.linked_rooms;
    this.hasVISObject = false;

    this.doors = [];
    this.placeables = [];
    this.creatures = [];
    this.triggers = [];
    this.encounters = [];

  }

  detectChildObjects(){
    let v = new THREE.Vector3();
    this.box.getSize(v);
    let box = this.box.clone().expandByVector(v);
    this.doors = [];
    this.placeables = [];
    for(let i = 0, len = GameState.module.area.doors.length; i < len; i++){
      let object = GameState.module.area.doors[i];
      if(object && (box.containsBox(object.box) || box.containsPoint(object.position) || box.intersectsSphere(object.sphere))){
        this.doors.push(object);
      }
    }

    for(let i = 0, len = GameState.module.area.placeables.length; i < len; i++){
      let object = GameState.module.area.placeables[i];
      if(object && (box.containsBox(object.box) || box.containsPoint(object.position) || box.intersectsSphere(object.sphere))){
        this.placeables.push(object);
      }
    }
  }

  setLinkedRooms(array = []){
    this.linked_rooms = array;
  }

  setPosition(x = 0, y = 0, z = 0){
    this.position.set(x, y, z);
  }

  getVisisbleNeighbors(){  }

  update(delta: number = 0){
    if(this.model instanceof OdysseyModel3D){
      this.model.update(delta);
    }
    if(this.grass){
      this.grass.material.uniforms.time.value += delta;
      let c_player = GameState.getCurrentPlayer();
      if(c_player){
        this.grass.material.uniforms.playerPosition.value.copy(c_player.position);
      }
      this.grass.material.uniformsNeedUpdate = true;
    }
  }

  show(recurse = false){
    if(this.model){
      this.model.visible = true;
    }

    if(this.grass){
      this.grass.visible = true;
    }

    if(recurse){
      for(let i = 0, rLen = this.linked_rooms.length; i < rLen; i++){
        if(this.linked_rooms[i] instanceof ModuleRoom){
          if(typeof this.linked_rooms[i].model == 'object')
            this.linked_rooms[i].model.visible = true;
        }
      }
    }

    //Add the walkmesh back to the scene
    if(this.walkmesh && !this.walkmesh.mesh.parent){
      GameState.group.room_walkmeshes.add(this.walkmesh.mesh);
    }else if(this.walkmesh && this.walkmesh.mesh.parent){
      this.walkmesh.mesh.parent.remove(this.walkmesh.mesh);
      GameState.group.room_walkmeshes.add(this.walkmesh.mesh);
    }
  }

  hide(){
    if(this.model){
      this.model.visible = false;
    }

    if(this.grass){
      this.grass.visible = false;
    }

    for(let i = 0; i < this.linked_rooms.length; i++){
      if(typeof this.linked_rooms[i] == 'object')
        this.linked_rooms[i].model.visible = false;
    }
    
    //Remove the walkmesh back to the scene
    if(this.walkmesh && this.walkmesh.mesh.parent){
      this.walkmesh.mesh.parent.remove(this.walkmesh.mesh);
    }
  }

  link_rooms(rooms = []){
    for(let i = 0; i < this.linked_rooms.length; i++){
      for(let j = 0; j < rooms.length; j++){
        if(this.linked_rooms[i] == rooms[j].roomName.toLowerCase()){
          this.linked_rooms[i] = rooms[j];
        }
      }
    }
  }

  load( onComplete = null ){
    
    if(!Utility.is2daNULL(this.roomName)){

      GameState.ModelLoader.load({

        file: this.roomName,
        onLoad: (roomFile) => {

          OdysseyModel3D.FromMDL(roomFile, {

            onComplete: (room) => {

              let scene;
              if(this.model instanceof OdysseyModel3D && this.model.parent){
                scene = this.model.parent;

                try{
                  this.model.dispose();
                }catch(e){}

                try{
                  if(scene)
                    scene.remove(this.model);
                }catch(e){}
              }

              this.model = room;
              this.model.moduleObject = this;
              this.model.position.copy(this.position);

              if(this.model.animations.length){

                for(let animI = 0; animI < this.model.animations.length; animI++){
                  if(this.model.animations[animI].name.indexOf('animloop') >= 0){
                    this.model.animLoops.push(
                      this.model.animations[animI]
                    );
                  }
                }
              }

              if(scene)
                scene.add(this.model);

              if(!(this.walkmesh instanceof OdysseyWalkMesh)){

                this.loadWalkmesh(this.roomName, (wok) => {
                  if(wok){
                    this.walkmesh = wok;
                    this.walkmesh.mesh.position.z += 0.001;
                    this.buildGrass();
                    
                    //TextureLoader.LoadQueue( () => {
                      if(typeof onComplete == 'function')
                        onComplete(this);
                    //});
                  }else{
                    //TextureLoader.LoadQueue( () => {
                      if(typeof onComplete == 'function')
                        onComplete(this);
                    //});
                  }
                });

              }else{
                //TextureLoader.LoadQueue( () => {
                  if(typeof onComplete == 'function')
                    onComplete(this);
                //});
              }

              //Disable matrix update for static objects
              //room.disableMatrixUpdate();
              this.buildGrass();

            },
            context: this.context,
            castShadow: false,
            receiveShadow: true,
            //Merge Static Geometry *Experimental*
            mergeStatic: !GameState.module.area.MiniGame ? true : false
          });

        }

      });

    }else{

      if(typeof onComplete == 'function')
        onComplete(this);

    }

  }

  loadWalkmesh(ResRef = '', onLoad = null ){
    
    let wokKey = Global.kotorKEY.GetFileKey(ResRef, ResourceTypes['wok']);
    if(wokKey != null){
      Global.kotorKEY.GetFileData(wokKey, (buffer) => {

        let wok = new OdysseyWalkMesh(new BinaryReader(buffer));
        wok.name = ResRef;
        wok.moduleObject = this;
        this.model.wok = wok;

        if(typeof onLoad === 'function')
          onLoad(wok);

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad(null);
    }

  }

  buildGrass(){
    if(GameState.module.area.Grass.TexName){
      let density = GameState.module.area.Grass.Density;
      let quadOffsetZ = GameState.module.area.Grass.QuadSize/2;
      if(this.model){
        let aabb = this.model.aabb;
        if(aabb instanceof OdysseyModelNodeAABB){
          if(aabb.grassFaces.length){

            //Build the grass instance
            let grassGeometry = undefined;
            let lm_texture = null;
            
            for(let i = 0; i < 4; i++){
              let blade = new THREE.PlaneGeometry(GameState.module.area.Grass.QuadSize, GameState.module.area.Grass.QuadSize, 1, 1);
              blade.rotateX(Math.PI/2);
              blade.rotateZ(Math.PI/4 * i);
              if(grassGeometry){
                grassGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries([grassGeometry, blade]);
              }else{
                grassGeometry = blade;
              }
            }
      
            //The constraint array is a per vertex array to determine if the current vertex in the vertex shader
            //can be affected by wind. 1 = Wind 0 = No Wind
            let constraint = new Float32Array([
              1, 0, 1, 0, 0, 1,
              1, 0, 1, 0, 0, 1,
              1, 0, 1, 0, 0, 1,
              1, 0, 1, 0, 0, 1
            ]);
            grassGeometry.setAttribute('constraint', new THREE.BufferAttribute( constraint, 1) );
      
            //QuadIdx is used to track the current quad index inside the vertex shader
            let quadIdx = new Float32Array([
              0, 0, 0, 0, 0, 0,
              1, 1, 1, 1, 1, 1,
              2, 2, 2, 2, 2, 2,
              3, 3, 3, 3, 3, 3,
            ]);
            grassGeometry.setAttribute('quadIdx', new THREE.BufferAttribute( quadIdx, 1) );
          
            let geometry = new THREE.InstancedBufferGeometry();
            geometry.index = grassGeometry.index;
            geometry.attributes.position = grassGeometry.attributes.position;
            geometry.attributes.constraint = grassGeometry.attributes.constraint;
            geometry.attributes.quadIdx = grassGeometry.attributes.quadIdx;
            geometry.attributes.uv = grassGeometry.attributes.uv;
      
            // per instance data
            let offsets = [];
            let grassUVs = [];
            let lmUVs = [];
            let vector = new THREE.Vector4();

            let grass_material = new THREE.ShaderMaterial({
              uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib[ "fog" ],
                {
                  map: { value: null },
                  lightMap: { value: null },
                  time: { value: 0 },
                  ambientColor: { value: new THREE.Color().setHex('0x'+(GameState.module.area.SunFogColor).toString(16)) },
                  windPower: { value: GameState.module.area.WindPower },
                  playerPosition: { value: new THREE.Vector3 },
                  alphaTest: { value: GameState.module.area.AlphaTest }
                }
              ]),
              vertexShader: Shaders['grass'].getVertex(),
              fragmentShader: Shaders['grass'].getFragment(),
              //color: new THREE.Color( 1, 1, 1 ),
              side: THREE.DoubleSide,
              transparent: false,
              fog: true,
              visible: iniConfig.getProperty('Graphics Options.Grass'),
              //blending: 5
            });
        
            grass_material.defines.USE_FOG = '';

            lm_texture = aabb.TextureMap2;

            for(let k = 0; k < aabb.grassFaces.length; k++){
              let face = aabb.grassFaces[k];

              //FACE A
              let FA = new THREE.Vector3(aabb.vertices[face.a * 3], aabb.vertices[(face.a * 3) + 1], aabb.vertices[(face.a * 3) + 2]);
              //FACE B
              let FB = new THREE.Vector3(aabb.vertices[face.b * 3], aabb.vertices[(face.b * 3) + 1], aabb.vertices[(face.b * 3) + 2]);
              //FACE C
              let FC = new THREE.Vector3(aabb.vertices[face.c * 3], aabb.vertices[(face.c * 3) + 1], aabb.vertices[(face.c * 3) + 2]);

              let uvA = aabb.tvectors[1][face.a];
              let uvB = aabb.tvectors[1][face.b];
              let uvC = aabb.tvectors[1][face.c];

              let triangle = new THREE.Triangle(FA,FB,FC);
              let area = triangle.getArea();
              let grassCount = ((area) * density)*.25;

              if(grassCount < 1){
                grassCount = 1;
              }

              for(let j = 0; j < grassCount; j++){
                let instance = {
                  position: {x: 0, y: 0, z: 0},
                  orientation: {x: 0, y: 0, z: 0, w: 0},
                  uvs: {uv1: this.getRandomGrassUVIndex(), uv2: this.getRandomGrassUVIndex(), uv3: this.getRandomGrassUVIndex(), uv4: this.getRandomGrassUVIndex()}
                };

                // offsets
                let a = Math.random();
                let b = Math.random();

                if (a + b > 1) {
                  a = 1 - a;
                  b = 1 - b;
                }

                let c = 1 - a - b;

                vector.x = (a * FA.x) + (b * FB.x) + (c * FC.x);
                vector.y = (a * FA.y) + (b * FB.y) + (c * FC.y);
                vector.z = (a * FA.z) + (b * FB.z) + (c * FC.z);

                let lm_uv = THREE.Triangle.getUV( vector, FA, FB, FC, uvA, uvB, uvC, new THREE.Vector2() );

                instance.position = {
                  x: this.model.position.x + aabb.position.x + vector.x, 
                  y: this.model.position.y + aabb.position.y + vector.y, 
                  z: this.model.position.z + aabb.position.z + vector.z + quadOffsetZ
                };

                // orientations
                let r = Math.floor(Math.random() * 360) + 0;

                instance.orientation = r;

                //this.grassInstances.push(instance);
                offsets.push( instance.position.x, instance.position.y, instance.position.z, instance.orientation );
                grassUVs.push(instance.uvs.uv1, instance.uvs.uv2, instance.uvs.uv3, instance.uvs.uv4);
                lmUVs.push(lm_uv.x, lm_uv.y);
              }
            }

            let offsetAttribute = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 4 ).setUsage( THREE.StaticDrawUsage );
            let grassUVAttribute = new THREE.InstancedBufferAttribute( new Float32Array( grassUVs ), 4 ).setUsage( THREE.StaticDrawUsage );
            let lmUVAttribute = new THREE.InstancedBufferAttribute( new Float32Array( lmUVs ), 2 ).setUsage( THREE.StaticDrawUsage );
            geometry.setAttribute( 'offset', offsetAttribute );
            geometry.setAttribute( 'grassUV', grassUVAttribute );
            geometry.setAttribute( 'lmUV', lmUVAttribute );
            this.grass = new THREE.Mesh( geometry, grass_material );
            this.grass.frustumCulled = false;
            GameState.group.grass.add(this.grass);

            //Load in the grass texture
            TextureLoader.Load(GameState.module.area.Grass.TexName, (grassTexture) => {
              if(grassTexture){
                grassTexture.minFilter = THREE.LinearFilter;
                grassTexture.magFilter = THREE.LinearFilter;
                grass_material.uniforms.map.value = grassTexture;
                grass_material.uniformsNeedUpdate = true;
                grass_material.needsUpdate = true;
                //Load in the grass lm texture
                TextureLoader.Load(lm_texture, (lmTexture) => {
                  if(lmTexture){
                    lmTexture.minFilter = THREE.LinearFilter;
                    lmTexture.magFilter = THREE.LinearFilter;
                    grass_material.uniforms.lightMap.value = lmTexture;
                    grass_material.uniformsNeedUpdate = true;
                    grass_material.needsUpdate = true;
                    grass_material.defines.USE_LIGHTMAP = '';
                  }
                });
              }
            });
          }
        }
      }
    }
  }

  getRandomGrassUVIndex(){
    let rnd = Math.random();
    if(rnd < GameState.module.area.Grass.Prob_UL){
      return 0;
    }else if(rnd < GameState.module.area.Grass.Prob_UL + GameState.module.area.Grass.Prob_UR){
      return 1;
    }else if(rnd < GameState.module.area.Grass.Prob_UL + GameState.module.area.Grass.Prob_UR + GameState.module.area.Grass.Prob_LL){
      return 2;
    }else{
      return 3;
    }
  }
  
  containsPoint2d(point){

    if(!this.model)
      return false;

    return point.x < this.model.box.min.x || point.x > this.model.box.max.x ||
      point.y < this.model.box.min.y || point.y > this.model.box.max.y ? false : true;
  }
  
  containsPoint3d(point){

    if(!this.model)
      return false;

    return point.x < this.model.box.min.x || point.x > this.model.box.max.x ||
      point.y < this.model.box.min.y || point.y > this.model.box.max.y ||
      point.z < this.model.box.min.z || point.z > this.model.box.max.z ? false : true;
  }

  findWalkableFace( object = undefined ){
    let face;
    if(object instanceof ModuleObject && this.walkmesh){
      for(let j = 0, jl = this.walkmesh.walkableFaces.length; j < jl; j++){
        face = this.walkmesh.walkableFaces[j];
        if(face.triangle.containsPoint(object.position)){
          object.groundFace = face;
          object.lastGroundFace = object.groundFace;
          object.surfaceId = object.groundFace.walkIndex;
          object.room = this;

          face.triangle.closestPointToPoint(object.position, object.wm_c_point);
          object.position.z = object.wm_c_point.z + .005;
          return face;
        }
      }
    }
    return face;
  }

  toToolsetInstance(){

    let instance = new GFFStruct();
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'AmbientScale', this.ambientScale)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.INT, 'EnvAudio', this.envAudio)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.CEXOSTRING, 'RoomName', this.roomName)
    );

    return instance;

  }

}