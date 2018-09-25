/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleRoom class.
 */

class ModuleRoom extends ModuleObject {

  constructor( args = {} ){
    super();
    args = Object.assign({
      room: undefined,
      model: undefined,
      walkmesh: undefined,
      linked_rooms: []
    }, args);

    this.room = args.room;
    this.model = args.model;
    this.walkmesh = args.walkmesh;
    this.linked_rooms = args.linked_rooms;

  }

  getVisisbleNeighbors(){

    

  }

  update(delta){
    if(this.model instanceof THREE.AuroraModel)
      this.model.update(delta);
  }

  show(recurse = false){
    if(this.model){
      this.model.visible = true;
    }
    if(recurse){
      for(let i = 0; i < this.linked_rooms.length; i++){
        if(this.linked_rooms[i] instanceof ModuleRoom){
          if(typeof this.linked_rooms[i] == 'object')
            this.linked_rooms[i].model.visible = true;
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

        if(this.linked_rooms[i] == rooms[j].room['RoomName'].toLowerCase()){

          this.linked_rooms[i] = rooms[j];

        }

      }

    }

  }

  turnLightsOn(delta = 0, recurse = false){
    if(this.model instanceof THREE.AuroraModel){
      this.model.turnLightsOn();
      if(recurse){
        for(let i = 0; i < this.linked_rooms.length; i++){
          //if(typeof this.linked_rooms[i] == 'object')
          //  this.linked_rooms[i].model.turnLightsOn();
        }
      }
    }
  }

  load( onComplete = null ){
    
    if(!Utility.is2daNULL(this.room['RoomName'])){

      Game.ModelLoader.load({

        file: this.room['RoomName'],
        onLoad: (roomFile) => {

          THREE.AuroraModel.FromMDL(roomFile, {

            onComplete: (room) => {

              this.loadWalkmesh(this.room['RoomName'], (wok) => {

                this.model = room;
                this.walkmesh = wok;

                this.position = this.model.position;
                this.rotation = this.model.rotation;

                if(typeof onComplete == 'function')
                  onComplete(this);
  
              });

            },
            context: this.context,
            castShadow: false,
            receiveShadow: true,
            //Merge Static Geometry *Experimental*
            mergeStatic: false
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

        if(typeof onLoad === 'function')
          onLoad(wok);

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad(null);
    }

  }

  buildGrass(){
    //console.log(this.model.wok)
    if(Game.module.area.Grass.TexName){
      if(this.model.wok instanceof AuroraWalkMesh){
        if(this.model.wok.grassFaces.length){
          //console.log(this.model.wok.grassFaces);
          let geomGroup = new THREE.Geometry();
          for(let i = 0; i < this.model.wok.grassFaces.length; i++){
            let face = this.model.wok.grassFaces[i];
            for(let i = 0; i < 4; i++){
              let blade = new THREE.PlaneGeometry( 1, 1, 1 );
              let uvs = blade.faceVertexUvs[ 0 ];
              let ul = new THREE.Vector2(0, 0);
              let lr = new THREE.Vector2(0.5, 0.5);
              /*switch(i){
                case 1:
                  ul.set()
                break;
                case 2:
                  y = 0.50;
                break;
                case 3:
                  y = 0.50;
                  x = 0.50;
                break;
              }*/
              uvs[ 0 ][ 0 ].set( 0, 0.5 );
              uvs[ 0 ][ 1 ].set( 0, 0 );
              uvs[ 0 ][ 2 ].set( 0.5, 0.5 );
              uvs[ 1 ][ 0 ].set( 0, 0 );
              uvs[ 1 ][ 1 ].set( 0.5, 0 );
              uvs[ 1 ][ 2 ].set( 0.5, 0.5 );
              blade.rotateX(Math.PI/2);
              blade.rotateZ(Math.PI/4 * i);
              blade.translate(face.centroid.x, face.centroid.y, face.centroid.z + 0.5);
              geomGroup.merge(blade, new THREE.Matrix4());
              blade.dispose();
            }
          }
          let map = null;
          let material = new THREE.MeshBasicMaterial({
            map: map,
            color: new THREE.Color( 1, 1, 1 ),
            side: THREE.DoubleSide,
            fog: true,
            depthWrite: false,
            transparent: true
          });
          map = TextureLoader.enQueue(Game.module.area.Grass.TexName, material);
          let plane = new THREE.Mesh( geomGroup, material );
          Game.grassGroup.add(plane);
          TextureLoader.LoadQueue();
        }
      }
    }
  }

}

module.exports = ModuleRoom;