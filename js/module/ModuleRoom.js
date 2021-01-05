/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleRoom class.
 */

class ModuleRoom extends ModuleObject {

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

  }

  setLinkedRooms(array = []){
    this.linked_rooms = array;
  }

  setPosition(x = 0, y = 0, z = 0){
    this.position.set(x, y, z);
  }

  getVisisbleNeighbors(){  }

  update(delta){
    if(this.model instanceof THREE.AuroraModel){
      this.model.update(delta);

      //LightManager.MAXLIGHTS
      for(let i = 0, len = this.model.materials.length; i < len; i++){
        let mat = this.model.materials[i];
        if(mat instanceof THREE.ShaderMaterial){

          /*if(!mat.uniforms.pointLights.value.length)
            return;

          mat.uniforms.pointLights.value[0].animated = LightManager.light_pool[0].animated;
          mat.uniforms.pointLights.value[1].animated = LightManager.light_pool[1].animated;
          mat.uniforms.pointLights.value[2].animated = LightManager.light_pool[2].animated;
          mat.uniforms.pointLights.value[3].animated = LightManager.light_pool[3].animated;
          mat.uniforms.pointLights.value[4].animated = LightManager.light_pool[4].animated;
          mat.uniforms.pointLights.value[5].animated = LightManager.light_pool[5].animated;
          mat.uniforms.pointLights.value[6].animated = LightManager.light_pool[6].animated;
          mat.uniforms.pointLights.value[7].animated = LightManager.light_pool[7].animated;*/

        }
      }

    }
  }

  show(recurse = false){
    if(this.model){
      this.model.visible = true;
    }

    if(recurse){
      for(let i = 0, rLen = this.linked_rooms.length; i < rLen; i++){
        if(this.linked_rooms[i] instanceof ModuleRoom){
          if(typeof this.linked_rooms[i].model == 'object')
            this.linked_rooms[i].model.visible = true;
        }
      }

      //Look for all rooms that can see this room
      for(let i = 0, rLen = Game.module.area.rooms.length; i < rLen; i++){
        let room = Game.module.area.rooms[i];
        if(room instanceof ModuleRoom){
          for(let j = 0, rcLen = room.linked_rooms.length; j < rcLen; j++){
            if(room.linked_rooms[j] == this){
              room.show(false);
              break;
            }
          }
        }
      }
    }
  }

  hide(){
    if(this.model){
      this.model.visible = false;
    }

    for(let i = 0; i < this.linked_rooms.length; i++){
      if(typeof this.linked_rooms[i] == 'object')
        this.linked_rooms[i].model.visible = false;
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

      Game.ModelLoader.load({

        file: this.roomName,
        onLoad: (roomFile) => {

          THREE.AuroraModel.FromMDL(roomFile, {

            onComplete: (room) => {

              let scene;
              if(this.model instanceof THREE.AuroraModel && this.model.parent){
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

              if(!(this.walkmesh instanceof AuroraWalkMesh)){

                this.loadWalkmesh(this.roomName, (wok) => {
                  
                  this.walkmesh = wok;
                  this.buildGrass();

                  if(typeof onComplete == 'function')
                    onComplete(this);
    
                });

              }else{
                if(typeof onComplete == 'function')
                  onComplete(this);
              }

              //Disable matrix update for static objects
              //room.disableMatrixUpdate();

            },
            context: this.context,
            castShadow: false,
            receiveShadow: true,
            //Merge Static Geometry *Experimental*
            mergeStatic: !Game.module.area.MiniGame ? true : false
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

        let wok = new AuroraWalkMesh(new BinaryReader(buffer));
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
    return;
    //console.log(this.model.wok)
    if(Game.module.area.Grass.TexName){
      if(this.model.wok instanceof AuroraWalkMesh){
        if(this.model.wok.grassFaces.length){

          //Build the grass instance
          let grassGeometry = new THREE.Geometry();

          let uvs_array = [
            [], [], [], []
          ]
          
          for(let i = 0; i < 4; i++){
            let blade = new THREE.PlaneGeometry(Game.module.area.Grass.QuadSize, Game.module.area.Grass.QuadSize, 1);
            
            let uv1 = new THREE.Vector2(0, 0);
            let uv2 = new THREE.Vector2(1, 1);

            for(let j = 0; j < 4; j++){

              switch(j){
                case 1:
                  uv1.set(0.5, 0);
                  uv2.set(1, 0.5);
                break;
                case 2: 
                  uv1.set(0, 0.5);
                  uv2.set(0.5, 1);
                break;
                case 3:
                  uv1.set(0.5, 0.5);
                  uv2.set(1, 1);
                break;
                default:
                  uv1.set(0, 0);
                  uv2.set(0.5, 0.5);
                break;
              }

              let faceUV1 = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
              let faceUV2 = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];

              faceUV1[ 0 ].set( uv1.x, uv2.y );
              faceUV1[ 1 ].set( uv1.x, uv1.y );
              faceUV1[ 2 ].set( uv2.x, uv2.y );
              faceUV2[ 0 ].set( uv1.x, uv1.y );
              faceUV2[ 1 ].set( uv2.x, uv1.y );
              faceUV2[ 2 ].set( uv2.x, uv2.y );

              uvs_array[j].push(faceUV1[0]);
              uvs_array[j].push(faceUV1[1]);
              uvs_array[j].push(faceUV1[2]);
              uvs_array[j].push(faceUV2[0]);
              uvs_array[j].push(faceUV2[1]);
              uvs_array[j].push(faceUV2[2]);

            }
            
            blade.rotateX(Math.PI/2);
            blade.rotateZ(Math.PI/4 * i);
            
            grassGeometry.merge(blade, new THREE.Matrix4());
            blade.dispose();
          }

          grassGeometry = new THREE.BufferGeometry().fromGeometry(grassGeometry);
          let constraint = new Float32Array([
            1, 0, 1, 0, 0, 1,
            1, 0, 1, 0, 0, 1,
            1, 0, 1, 0, 0, 1,
            1, 0, 1, 0, 0, 1
          ]);
          grassGeometry.setAttribute('constraint', new THREE.BufferAttribute( constraint, 1) );

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

          for(let i = 0; i < 4; i++){
            let uvs = new Float32Array( uvs_array[i].length * 2 );
            switch(i){
              case 1:
              case 2:
              case 3:
                grassGeometry.setAttribute( 'uv'+(i+1), new THREE.BufferAttribute( uvs, 2 ).copyVector2sArray( uvs_array[i] ) );
              break;
              default:
                grassGeometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ).copyVector2sArray( uvs_array[i] ) );
              break;
            }
          }

          geometry.attributes.uv = grassGeometry.attributes.uv;
          geometry.attributes.uv2 = grassGeometry.attributes.uv2;
          geometry.attributes.uv3 = grassGeometry.attributes.uv3;
          geometry.attributes.uv4 = grassGeometry.attributes.uv4;

          // per instance data
          let offsets = [];
          let orientations = [];
          let grassUVs = [];
          let vector = new THREE.Vector4();

          let density = Game.module.area.Grass.Density;

          for(let i = 0; i < this.model.wok.grassFaces.length; i++){
            let face = this.model.wok.grassFaces[i];

            //FACE A
            let FA = this.model.wok.vertices[face.a];
            //FACE B
            let FB = this.model.wok.vertices[face.b];
            //FACE C
            let FC = this.model.wok.vertices[face.c];

            let triangle = new THREE.Triangle(FA,FB,FC);
            let area = triangle.getArea();
            let grassCount = (area) * density;

            if(grassCount < 1){
              grassCount = 1;
            }

            for(let j = 0; j < grassCount; j++){

              // offsets
              let a = Math.random();
              let b = Math.random();

              // UV Indexes

              grassUVs.push(
                0, //this.getRandomGrassUVIndex(),
                1, //this.getRandomGrassUVIndex(),
                2, //this.getRandomGrassUVIndex(),
                3, //this.getRandomGrassUVIndex()
              );

              if (a + b > 1) {
                a = 1 - a;
                b = 1 - b;
              }

              let c = 1 - a - b;

              vector.x = (a * FA.x) + (b * FB.x) + (c * FC.x);
              vector.y = (a * FA.y) + (b * FB.y) + (c * FC.y);
              vector.z = (a * FA.z) + (b * FB.z) + (c * FC.z) + Game.module.area.Grass.QuadSize/2;

              //vector.set( face.centroid.x + ( ( Math.random() - .5 ) * 10 ), face.centroid.y + ( ( Math.random() - .5 ) * 10 ), face.centroid.z + 0.5, 0 );
              offsets.push( vector.x, vector.y, vector.z );

              // orientations
              let r = Math.random();
              let c1 = Math.cos( 0 / 2 );
              let c2 = Math.cos( 0 / 2 );
              let c3 = Math.cos( r / 2 );

              let s1 = Math.sin( 0 / 2 );
              let s2 = Math.sin( 0 / 2 );
              let s3 = Math.sin( r / 2 );

              vector.x = s1 * c2 * c3 + c1 * s2 * s3;
              vector.y = c1 * s2 * c3 - s1 * c2 * s3;
              vector.z = c1 * c2 * s3 + s1 * s2 * c3;
              vector.w = c1 * c2 * c3 - s1 * s2 * s3;
              
              orientations.push( vector.x, vector.y, vector.z, vector.w );
            }
          }
          
          this.offsetAttribute = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 ).setUsage( THREE.DynamicDrawUsage );
          this.orientationAttribute = new THREE.InstancedBufferAttribute( new Float32Array( orientations ), 4 );
          this.grassUVAttribute = new THREE.InstancedBufferAttribute( new Float32Array( grassUVs ), 4 );
          geometry.setAttribute( 'offset', this.offsetAttribute );
          geometry.setAttribute( 'orientation', this.orientationAttribute );
          geometry.setAttribute( 'grassUV', this.grassUVAttribute );
          this.grassMesh = new THREE.Mesh( geometry, Game.module.grassMaterial );
          this.grassMesh.frustumCulled = false;
          this.grassMesh.renderOrder = 9999;
          Game.group.grass.add(this.grassMesh);

        }
      }
    }
  }

  getRandomGrassUVIndex(){
    let rnd = Math.random();
    if(rnd < Game.module.area.Grass.Prob_UL){
      return 0;
    }else if(rnd < Game.module.area.Grass.Prob_UL + Game.module.area.Grass.Prob_UR){
      return 1;
    }else if(rnd < Game.module.area.Grass.Prob_UL + Game.module.area.Grass.Prob_UR + Game.module.area.Grass.Prob_LL){
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

  toToolsetInstance(){

    let instance = new Struct();
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'AmbientScale', this.ambientScale)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.INT, 'EnvAudio', this.envAudio)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.CEXOSTRING, 'RoomName', this.roomName)
    );

    return instance;

  }

}

module.exports = ModuleRoom;